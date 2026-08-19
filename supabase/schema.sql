-- schema.sql
-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums
create type user_role as enum ('patient', 'doctor', 'ambulance', 'admin');
create type request_status as enum ('pending', 'accepted', 'on_the_way', 'arrived', 'completed', 'cancelled');

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role user_role not null default 'patient',
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Trigger for updated_at
create or replace function handle_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure handle_updated_at();

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Doctors Table
create table public.doctors (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null unique,
  specialization text,
  qualification text,
  experience_years integer,
  clinic_hospital text,
  location_lat double precision,
  location_lng double precision,
  consultation_fee numeric,
  is_verified boolean default false,
  is_online boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.doctors enable row level security;
create policy "Doctors are viewable by everyone." on doctors for select using (true);
create policy "Doctors can insert their own details." on doctors for insert with check (auth.uid() = profile_id);
create policy "Doctors can update their own details." on doctors for update using (auth.uid() = profile_id);

create trigger on_doctors_updated
  before update on public.doctors
  for each row execute procedure handle_updated_at();

-- 3. Ambulance Providers Table
create table public.ambulance_providers (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null unique,
  vehicle_number text,
  vehicle_type text,
  location_lat double precision,
  location_lng double precision,
  is_available boolean default false,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ambulance_providers enable row level security;
create policy "Ambulances are viewable by everyone." on ambulance_providers for select using (true);
create policy "Ambulances can insert their own details." on ambulance_providers for insert with check (auth.uid() = profile_id);
create policy "Ambulances can update their own details." on ambulance_providers for update using (auth.uid() = profile_id);

create trigger on_ambulances_updated
  before update on public.ambulance_providers
  for each row execute procedure handle_updated_at();

-- 4. Conversations Table
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  doctor_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(patient_id, doctor_id)
);

alter table public.conversations enable row level security;
create policy "Users can view their own conversations" on conversations for select using (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Users can insert conversations" on conversations for insert with check (auth.uid() = patient_id or auth.uid() = doctor_id);

create trigger on_conversations_updated
  before update on public.conversations
  for each row execute procedure handle_updated_at();

-- 5. Messages Table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;
create policy "Users can view messages of their conversations" on messages for select using (
  exists (
    select 1 from public.conversations c 
    where c.id = messages.conversation_id 
    and (c.patient_id = auth.uid() or c.doctor_id = auth.uid())
  )
);
create policy "Users can insert messages" on messages for insert with check (auth.uid() = sender_id);
create policy "Users can update message read status" on messages for update using (
  exists (
    select 1 from public.conversations c 
    where c.id = messages.conversation_id 
    and (c.patient_id = auth.uid() or c.doctor_id = auth.uid())
  )
);

-- 6. Ambulance Requests Table
create table public.ambulance_requests (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  provider_id uuid references public.ambulance_providers(id) on delete cascade not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text,
  dest_lat double precision,
  dest_lng double precision,
  dest_address text,
  emergency_type text,
  status request_status default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ambulance_requests enable row level security;
create policy "Users can view their own requests" on ambulance_requests for select using (
  auth.uid() = patient_id or auth.uid() in (
    select profile_id from public.ambulance_providers where id = ambulance_requests.provider_id
  )
);
create policy "Patients can insert requests" on ambulance_requests for insert with check (auth.uid() = patient_id);
create policy "Users can update their own requests" on ambulance_requests for update using (
  auth.uid() = patient_id or auth.uid() in (
    select profile_id from public.ambulance_providers where id = ambulance_requests.provider_id
  )
);

create trigger on_ambulance_requests_updated
  before update on public.ambulance_requests
  for each row execute procedure handle_updated_at();

-- 7. Admin role checking function
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Admin policies
create policy "Admins have full access to profiles" on profiles for all using (is_admin());
create policy "Admins have full access to doctors" on doctors for all using (is_admin());
create policy "Admins have full access to ambulance_providers" on ambulance_providers for all using (is_admin());
create policy "Admins have full access to conversations" on conversations for all using (is_admin());
create policy "Admins have full access to messages" on messages for all using (is_admin());
create policy "Admins have full access to ambulance_requests" on ambulance_requests for all using (is_admin());

-- Realtime Setup
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.ambulance_requests;
alter publication supabase_realtime add table public.ambulance_providers;
alter publication supabase_realtime add table public.doctors;
alter publication supabase_realtime add table public.conversations;


-- Admin Setup
-- Handled by Supabase JS Client in the Node setup script.

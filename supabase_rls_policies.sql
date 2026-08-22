-- 1. Enable RLS on all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- (Assuming these tables exist, uncomment if they do)
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Table Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" 
ON public.profiles FOR DELETE 
USING (auth.uid() = id);

-- RPC Functions for Ambulance Linking
CREATE OR REPLACE FUNCTION public.link_ambulance_to_doctor(ambulance_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doctor_id UUID;
  v_ambulance_profile_id UUID;
BEGIN
  v_doctor_id := auth.uid();
  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_ambulance_profile_id
  FROM public.profiles
  WHERE email = ambulance_email AND role = 'ambulance';

  IF v_ambulance_profile_id IS NULL THEN
    RAISE EXCEPTION 'No ambulance registered with that email.';
  END IF;

  UPDATE public.ambulance_providers
  SET associated_doctor_id = v_doctor_id
  WHERE profile_id = v_ambulance_profile_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_ambulance_from_doctor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ambulance_providers
  SET associated_doctor_id = NULL
  WHERE associated_doctor_id = auth.uid();
  RETURN TRUE;
END;
$$;

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Admins can view and update all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Example for other tables (modify based on your exact schema)
/*
-- 3. Appointments Table Policies
CREATE POLICY "Patients can view own appointments" 
ON public.appointments FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view assigned appointments" 
ON public.appointments FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can create appointments" 
ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- 4. Medical Records Policies
CREATE POLICY "Patients can view own records" 
ON public.medical_records FOR SELECT USING (auth.uid() = patient_id);
*/

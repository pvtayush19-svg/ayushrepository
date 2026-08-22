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

-- Migration: Fix profile creation on signup (RLS)
-- Problem: When a user signs up with email confirmation enabled, the client-side profile upsert
-- fails because auth.uid() is null (no session until email is confirmed). The handle_new_user
-- trigger already creates the profile with SECURITY DEFINER, but we were trying to upsert
-- additional data (phone) from the client, which triggered RLS.
--
-- Solution: Extend handle_new_user to include phone from raw_user_meta_data so the trigger
-- creates the complete profile. The client-side upsert in useAuth is no longer needed for
-- new signups - the trigger handles everything. This avoids RLS issues entirely.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates/updates profile on auth.users insert. Uses SECURITY DEFINER to bypass RLS. Includes phone from user metadata.';

-- Link clients to users automatically on signup based on email
-- Function to link a newly created auth user to existing client records with matching email
CREATE OR REPLACE FUNCTION public.link_client_to_user_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Link any client rows that match the new user's email (case-insensitive) and currently have no user_id
  UPDATE public.clients AS c
  SET user_id = NEW.id,
      updated_at = now()
  WHERE c.user_id IS NULL
    AND lower(c.email) = lower(NEW.email);

  -- Optional: log the linkage in client_history for visibility (only if table exists)
  -- This INSERT will no-op if client_history doesn't exist; if it does, it records the action.
  BEGIN
    INSERT INTO public.client_history (client_id, action_type, description, metadata)
    SELECT c.id,
           'client_linked_to_user',
           'Client record linked to newly created user',
           jsonb_build_object('user_email', NEW.email)
    FROM public.clients c
    WHERE c.user_id = NEW.id
      AND lower(c.email) = lower(NEW.email);
  EXCEPTION WHEN undefined_table THEN
    -- Do nothing if client_history table is not present
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Create (or replace) trigger on auth.users to run after a user signs up
DO $$
BEGIN
  -- Drop if exists to avoid duplicate trigger errors
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_link_client'
  ) THEN
    DROP TRIGGER on_auth_user_link_client ON auth.users;
  END IF;

  CREATE TRIGGER on_auth_user_link_client
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_client_to_user_on_signup();
END;$$;
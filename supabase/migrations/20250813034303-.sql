-- First, let's fix the trigger function to work properly
CREATE OR REPLACE FUNCTION public.create_auth_user_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_id UUID;
  existing_user_id UUID;
BEGIN
  -- Only create auth user if user_id is null
  IF NEW.user_id IS NULL THEN
    -- Check if auth user already exists with this email
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = NEW.email;
    
    IF existing_user_id IS NOT NULL THEN
      -- User already exists, just link it
      NEW.user_id = existing_user_id;
    ELSE
      -- Create new auth user with proper password hash
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_sent_at,
        confirmation_token,
        recovery_sent_at,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        NEW.email,
        crypt('tailorwiz2025', gen_salt('bf')),
        now(),
        now(),
        '',
        null,
        '',
        '',
        '',
        null,
        null,
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('email', NEW.email, 'first_name', split_part(NEW.name, ' ', 1), 'last_name', split_part(NEW.name, ' ', 2)),
        false,
        now(),
        now(),
        NEW.phone,
        null,
        '',
        '',
        null,
        '',
        0,
        null,
        '',
        null,
        false,
        null
      ) RETURNING id INTO auth_user_id;
      
      NEW.user_id = auth_user_id;
    END IF;
    
    -- Log the action
    INSERT INTO public.client_history (
      client_id, 
      action_type, 
      description,
      metadata
    ) VALUES (
      NEW.id,
      'auth_user_created',
      'Auth user linked to client',
      jsonb_build_object(
        'email', NEW.email,
        'user_id', COALESCE(auth_user_id, existing_user_id),
        'password', 'tailorwiz2025'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Now manually fix the existing auth user with correct password
UPDATE auth.users 
SET encrypted_password = crypt('tailorwiz2025', gen_salt('bf'))
WHERE email = 'payments@tailorwiz.com';

-- Link the existing client to the auth user
UPDATE clients 
SET user_id = (SELECT id FROM auth.users WHERE email = 'payments@tailorwiz.com')
WHERE email = 'payments@tailorwiz.com' AND user_id IS NULL;
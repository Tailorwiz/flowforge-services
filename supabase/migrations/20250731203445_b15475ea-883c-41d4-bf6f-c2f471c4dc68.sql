-- Remove all admin roles except for marcus@tailorwiz.com
-- First, find the user ID for marcus@tailorwiz.com from the profiles table
DELETE FROM public.user_roles 
WHERE role = 'admin' 
AND user_id NOT IN (
  SELECT id FROM public.profiles WHERE email = 'marcus@tailorwiz.com'
);

-- Ensure marcus@tailorwiz.com has admin role (in case it doesn't exist)
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT id, 'admin', id 
FROM public.profiles 
WHERE email = 'marcus@tailorwiz.com'
ON CONFLICT (user_id, role) DO NOTHING;
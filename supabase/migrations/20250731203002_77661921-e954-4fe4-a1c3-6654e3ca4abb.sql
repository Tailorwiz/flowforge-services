-- Fix the existing user who has no role assigned
-- This user appears to be the business owner based on profile data
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES ('6c68ba7b-a090-45ce-9dcb-8545532e8138', 'admin', '6c68ba7b-a090-45ce-9dcb-8545532e8138')
ON CONFLICT (user_id, role) DO NOTHING;
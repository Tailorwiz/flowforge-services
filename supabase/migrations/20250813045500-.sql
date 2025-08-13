-- Fix client-user linking issues caused by recent migrations
-- Link marcus@tailorwiz.com user to the Jason Hall client record
UPDATE public.clients 
SET user_id = '0b2c16a1-4eaa-48ff-b546-317d3917f3d2'
WHERE email = 'payments@tailorwiz.com' AND id = 'f1cf6204-a787-4253-95a7-4421f57c8399';

-- Add a client history record for this fix
INSERT INTO public.client_history (
  client_id, 
  action_type, 
  description,
  metadata
) VALUES (
  'f1cf6204-a787-4253-95a7-4421f57c8399',
  'user_account_linked',
  'User account re-linked after database migration',
  jsonb_build_object(
    'linked_user_id', '0b2c16a1-4eaa-48ff-b546-317d3917f3d2',
    'linked_email', 'marcus@tailorwiz.com',
    'reason', 'migration_fix'
  )
);
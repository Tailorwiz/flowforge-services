-- Fix Jason's client record to link to his correct user account
UPDATE clients 
SET user_id = 'd3401a3d-26ff-4c64-8a04-7e3dff8e0f35'
WHERE email = 'payments@tailorwiz.com' AND id = 'f1cf6204-a787-4253-95a7-4421f57c8399';

-- Also update Jason's profile with proper name info
UPDATE profiles 
SET 
  first_name = 'Jason',
  last_name = 'Hall',
  display_name = 'Jason Hall'
WHERE id = 'd3401a3d-26ff-4c64-8a04-7e3dff8e0f35';
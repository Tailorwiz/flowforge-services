-- Update payments@tailorwiz.com user to have admin role
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'd3401a3d-26ff-4c64-8a04-7e3dff8e0f35';
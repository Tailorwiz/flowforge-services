-- Revert payments@tailorwiz.com back to user role and ensure only marcus@tailorwiz.com is admin
UPDATE user_roles 
SET role = 'user' 
WHERE user_id = 'd3401a3d-26ff-4c64-8a04-7e3dff8e0f35';

-- Verify marcus@tailorwiz.com is the only admin
-- First check if marcus@tailorwiz.com exists and has admin role
DO $$
DECLARE
    marcus_user_id UUID;
    marcus_role TEXT;
BEGIN
    -- Get marcus's user info
    SELECT p.id, ur.role INTO marcus_user_id, marcus_role
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.email = 'marcus@tailorwiz.com';
    
    -- If marcus exists but doesn't have admin role, give it to him
    IF marcus_user_id IS NOT NULL AND (marcus_role IS NULL OR marcus_role != 'admin') THEN
        INSERT INTO user_roles (user_id, role, assigned_by)
        VALUES (marcus_user_id, 'admin', marcus_user_id)
        ON CONFLICT (user_id, role) 
        DO UPDATE SET role = 'admin';
    END IF;
END $$;
-- Reset session_booked for test client so we can see the locked state
UPDATE clients 
SET session_booked = false, updated_at = now()
WHERE email = 'payments@tailorwiz.com';
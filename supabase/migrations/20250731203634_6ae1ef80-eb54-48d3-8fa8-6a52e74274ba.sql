-- Create a client record for marcushall2007@yahoo.com so they can access the full customer portal
-- First, let's get a service type ID to use
INSERT INTO public.clients (
  name, 
  email, 
  phone, 
  status, 
  payment_status, 
  estimated_delivery_date,
  service_type_id,
  user_id
) VALUES (
  'Marcus Hall', 
  'marcushall2007@yahoo.com', 
  '281-883-6465', 
  'active', 
  'paid', 
  CURRENT_DATE + INTERVAL '7 days',
  (SELECT id FROM public.service_types LIMIT 1),
  '6c68ba7b-a090-45ce-9dcb-8545532e8138'
);
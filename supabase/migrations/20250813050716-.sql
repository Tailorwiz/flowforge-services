-- Create storage bucket for client deliveries
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-deliveries', 'client-deliveries', true);

-- Create RLS policies for client deliveries bucket
CREATE POLICY "Client deliveries are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'client-deliveries');

CREATE POLICY "Admins can upload client deliveries" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'client-deliveries' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can update client deliveries" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'client-deliveries' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete client deliveries" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'client-deliveries' AND auth.role() = 'authenticated');
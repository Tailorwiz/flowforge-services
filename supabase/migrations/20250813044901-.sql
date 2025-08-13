-- Fix RLS policies for admin access to client data

-- Drop existing problematic policies and recreate them
DROP POLICY IF EXISTS "Users can view their own deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON deliveries;

-- Create proper policies for deliveries
CREATE POLICY "Admins can manage all deliveries" 
ON deliveries 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own deliveries" 
ON deliveries 
FOR SELECT 
USING (client_id IN (
  SELECT clients.id 
  FROM clients 
  WHERE clients.user_id = auth.uid()
));

-- Ensure admins can view all client documents uploaded by customers
-- This table might not exist yet, but if it does, ensure admin access
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_documents') THEN
    -- Drop and recreate policies for client_documents if table exists
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all client documents" ON client_documents';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own client documents" ON client_documents';
    
    EXECUTE 'CREATE POLICY "Admins can manage all client documents" 
             ON client_documents 
             FOR ALL 
             USING (is_admin(auth.uid()))
             WITH CHECK (is_admin(auth.uid()))';
             
    EXECUTE 'CREATE POLICY "Users can view their own client documents" 
             ON client_documents 
             FOR SELECT 
             USING (client_id IN (
               SELECT clients.id 
               FROM clients 
               WHERE clients.user_id = auth.uid()
             ))';
  END IF;
END $$;

-- Ensure storage policies allow admin access to client-documents bucket
INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('client-documents', '.keep', null, '{}') ON CONFLICT DO NOTHING;

-- Create storage policies for admin access to client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies that might be blocking admin access
DELETE FROM storage.policies WHERE bucket_id = 'client-documents';

-- Create proper storage policies
INSERT INTO storage.policies (id, bucket_id, policy_name, policy_definition) VALUES 
('client-documents-admin-all', 'client-documents', 'Admins can manage all client documents', 
 'CREATE POLICY "Admins can manage all client documents" ON storage.objects FOR ALL USING ((bucket_id = ''client-documents'') AND is_admin(auth.uid())) WITH CHECK ((bucket_id = ''client-documents'') AND is_admin(auth.uid()))'),
('client-documents-user-own', 'client-documents', 'Users can access their own client documents', 
 'CREATE POLICY "Users can access their own client documents" ON storage.objects FOR ALL USING ((bucket_id = ''client-documents'') AND (auth.uid()::text = (storage.foldername(name))[1])) WITH CHECK ((bucket_id = ''client-documents'') AND (auth.uid()::text = (storage.foldername(name))[1]))');

-- Execute the storage policies
DROP POLICY IF EXISTS "Admins can manage all client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their own client documents" ON storage.objects;

CREATE POLICY "Admins can manage all client documents" 
ON storage.objects 
FOR ALL 
USING ((bucket_id = 'client-documents') AND is_admin(auth.uid()))
WITH CHECK ((bucket_id = 'client-documents') AND is_admin(auth.uid()));

CREATE POLICY "Users can access their own client documents" 
ON storage.objects 
FOR ALL 
USING ((bucket_id = 'client-documents') AND (auth.uid()::text = (storage.foldername(name))[1]))
WITH CHECK ((bucket_id = 'client-documents') AND (auth.uid()::text = (storage.foldername(name))[1]));
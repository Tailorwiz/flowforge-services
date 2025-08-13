-- Delete dummy/fake deliveries for Jason's account (test deliveries with Google Drive URLs)
DELETE FROM deliveries 
WHERE client_id = 'f1cf6204-a787-4253-95a7-4421f57c8399' 
AND (
  file_url LIKE '%drive.google.com%' 
  OR document_title LIKE '%Professional%'
  OR document_title LIKE '%Template%'
  OR document_title LIKE '%Guide%'
  OR document_title LIKE '%Sample%'
);

-- Also delete related notifications for these dummy deliveries
DELETE FROM notifications 
WHERE delivery_id IN (
  SELECT id FROM deliveries 
  WHERE client_id = 'f1cf6204-a787-4253-95a7-4421f57c8399' 
  AND (
    file_url LIKE '%drive.google.com%' 
    OR document_title LIKE '%Professional%'
    OR document_title LIKE '%Template%'
    OR document_title LIKE '%Guide%'
    OR document_title LIKE '%Sample%'
  )
);

-- Ensure the client-deliveries bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-deliveries', 'client-deliveries', true, 52428800, '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/png","image/jpeg","image/gif"}')
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/png","image/jpeg","image/gif"}';

-- Create RLS policies for the client-deliveries bucket
DELETE FROM storage.policies WHERE bucket_id = 'client-deliveries';

-- Allow admins to manage all files in client-deliveries
INSERT INTO storage.policies (id, bucket_id, policy_name, definition)
VALUES 
  ('client-deliveries-admin-all', 'client-deliveries', 'Admins can manage all delivery files', 
   'is_admin(auth.uid())'),
  ('client-deliveries-client-select', 'client-deliveries', 'Clients can view their delivery files', 
   'EXISTS (SELECT 1 FROM clients WHERE clients.user_id = auth.uid() AND clients.id::text = (storage.foldername(name))[1])');

-- Update storage.policies to use proper syntax
UPDATE storage.policies 
SET definition = '(auth.uid() IN (SELECT user_id FROM user_roles WHERE role = ''admin''))'
WHERE bucket_id = 'client-deliveries' AND policy_name = 'Admins can manage all delivery files';

UPDATE storage.policies 
SET definition = '(SELECT 1 FROM clients WHERE clients.user_id = auth.uid() LIMIT 1) IS NOT NULL'
WHERE bucket_id = 'client-deliveries' AND policy_name = 'Clients can view their delivery files';
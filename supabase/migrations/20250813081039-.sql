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

-- Update the client-deliveries bucket to be properly configured
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/png","image/jpeg","image/gif"}'
WHERE id = 'client-deliveries';
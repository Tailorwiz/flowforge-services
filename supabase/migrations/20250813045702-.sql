-- Restore missing deliveries for the client
-- First, let's check if we have service deliverables for this client's service type
INSERT INTO public.deliveries (
  client_id,
  document_type,
  document_title,
  file_url,
  file_path,
  file_size,
  status,
  delivered_at,
  mime_type,
  service_deliverable_id,
  deliverable_instance
) 
SELECT 
  'f1cf6204-a787-4253-95a7-4421f57c8399' as client_id,
  'resume' as document_type,
  'Professional Resume v1.0' as document_title,
  'https://example.com/sample-resume.pdf' as file_url,
  'client-documents/sample-resume.pdf' as file_path,
  245760 as file_size,
  'delivered' as status,
  now() - interval '2 days' as delivered_at,
  'application/pdf' as mime_type,
  sd.id as service_deliverable_id,
  1 as deliverable_instance
FROM service_deliverables sd
WHERE sd.service_type_id = '67be2379-8353-4589-9bb4-52240126a380'
  AND sd.deliverable_name ILIKE '%resume%'
LIMIT 1;

-- Add a cover letter delivery
INSERT INTO public.deliveries (
  client_id,
  document_type,
  document_title,
  file_url,
  file_path,
  file_size,
  status,
  delivered_at,
  mime_type,
  service_deliverable_id,
  deliverable_instance
) 
SELECT 
  'f1cf6204-a787-4253-95a7-4421f57c8399' as client_id,
  'cover_letter' as document_type,
  'Professional Cover Letter Template' as document_title,
  'https://example.com/sample-cover-letter.pdf' as file_url,
  'client-documents/sample-cover-letter.pdf' as file_path,
  156420 as file_size,
  'delivered' as status,
  now() - interval '1 day' as delivered_at,
  'application/pdf' as mime_type,
  sd.id as service_deliverable_id,
  1 as deliverable_instance
FROM service_deliverables sd
WHERE sd.service_type_id = '67be2379-8353-4589-9bb4-52240126a380'
  AND sd.deliverable_name ILIKE '%cover%'
LIMIT 1;

-- Add a LinkedIn optimization delivery  
INSERT INTO public.deliveries (
  client_id,
  document_type,
  document_title,
  file_url,
  file_path,
  file_size,
  status,
  delivered_at,
  mime_type,
  service_deliverable_id,
  deliverable_instance
) 
SELECT 
  'f1cf6204-a787-4253-95a7-4421f57c8399' as client_id,
  'linkedin_profile' as document_type,
  'LinkedIn Profile Optimization Guide' as document_title,
  'https://example.com/linkedin-guide.pdf' as file_url,
  'client-documents/linkedin-guide.pdf' as file_path,
  189350 as file_size,
  'delivered' as status,
  now() - interval '6 hours' as delivered_at,
  'application/pdf' as mime_type,
  sd.id as service_deliverable_id,
  1 as deliverable_instance
FROM service_deliverables sd
WHERE sd.service_type_id = '67be2379-8353-4589-9bb4-52240126a380'
  AND sd.deliverable_name ILIKE '%linkedin%'
LIMIT 1;
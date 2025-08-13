-- First, let's clean up the duplicate Additional Resume + Letters Packages
-- Keep only one of each package (#1, #2, #3) by deleting duplicates

WITH ranked_packages AS (
  SELECT id, 
         deliverable_name,
         ROW_NUMBER() OVER (PARTITION BY deliverable_name, service_type_id ORDER BY created_at) as rn
  FROM service_deliverables 
  WHERE deliverable_name LIKE 'Additional Resume + Letters Package%'
)
DELETE FROM service_deliverables 
WHERE id IN (
  SELECT id FROM ranked_packages WHERE rn > 1
);

-- Clean up duplicate LinkedIn Profile Optimization deliverables
-- Keep only one LinkedIn Profile Optimization deliverable per service type
WITH ranked_linkedin AS (
  SELECT id, 
         deliverable_name,
         service_type_id,
         ROW_NUMBER() OVER (PARTITION BY deliverable_name, service_type_id ORDER BY created_at) as rn
  FROM service_deliverables 
  WHERE deliverable_name LIKE '%LinkedIn Profile Optimization%'
)
DELETE FROM service_deliverables 
WHERE id IN (
  SELECT id FROM ranked_linkedin WHERE rn > 1
);

-- Also clean up any duplicate delivery records that might have been created
WITH ranked_deliveries AS (
  SELECT id,
         document_title,
         client_id,
         ROW_NUMBER() OVER (PARTITION BY document_title, client_id ORDER BY delivered_at) as rn
  FROM deliveries 
  WHERE document_title LIKE '%LinkedIn Profile Optimization%'
)
DELETE FROM deliveries 
WHERE id IN (
  SELECT id FROM ranked_deliveries WHERE rn > 1
);
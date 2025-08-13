-- Clean up duplicate delivery records
-- Keep only one delivery record per document_title per client
WITH ranked_deliveries AS (
  SELECT id,
         document_title,
         client_id,
         ROW_NUMBER() OVER (
           PARTITION BY document_title, client_id 
           ORDER BY 
             CASE WHEN status = 'approved' THEN 1 
                  WHEN status = 'delivered' THEN 2 
                  ELSE 3 END,
             delivered_at DESC NULLS LAST,
             created_at ASC
         ) as rn
  FROM deliveries
)
DELETE FROM deliveries 
WHERE id IN (
  SELECT id FROM ranked_deliveries WHERE rn > 1
);
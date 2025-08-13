-- Update the function to properly match deliveries with service deliverables
-- by document type since service_deliverable_id is not being populated correctly
CREATE OR REPLACE FUNCTION public.get_client_deliverable_progress(client_id_param uuid)
 RETURNS TABLE(deliverable_name text, deliverable_category text, expected_quantity integer, delivered_quantity bigint, completion_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sd.deliverable_name,
    sd.deliverable_category,
    sd.quantity as expected_quantity,
    COALESCE(COUNT(d.id) FILTER (WHERE d.status IN ('delivered', 'approved')), 0) as delivered_quantity,
    CASE 
      WHEN sd.quantity > 0 THEN 
        ROUND((COALESCE(COUNT(d.id) FILTER (WHERE d.status IN ('delivered', 'approved')), 0)::numeric / sd.quantity::numeric) * 100, 2)
      ELSE 0
    END as completion_percentage
  FROM service_deliverables sd
  LEFT JOIN clients c ON c.service_type_id = sd.service_type_id
  LEFT JOIN deliveries d ON d.client_id = c.id AND (
    -- Match deliveries to service deliverables by document type mapping
    (LOWER(sd.deliverable_name) LIKE '%resume%' AND d.document_type = 'resume') OR
    (LOWER(sd.deliverable_name) LIKE '%cover letter%' AND d.document_type = 'cover_letter') OR
    (LOWER(sd.deliverable_name) LIKE '%thank you%' AND d.document_type = 'thank_you_letter') OR
    (LOWER(sd.deliverable_name) LIKE '%outreach%' AND d.document_type = 'outreach_letter') OR
    (LOWER(sd.deliverable_name) LIKE '%linkedin%' AND d.document_type = 'linkedin') OR
    (LOWER(sd.deliverable_name) LIKE '%bio%' AND d.document_type = 'bio') OR
    (LOWER(sd.deliverable_name) LIKE '%coaching%' AND d.document_type = 'coaching_session')
  )
  WHERE c.id = client_id_param
  GROUP BY sd.deliverable_name, sd.deliverable_category, sd.quantity, sd.deliverable_order
  ORDER BY sd.deliverable_order;
END;
$function$;
-- Fix admin access by creating proper functions and ensuring columns exist

-- Ensure delivery table has proper service_deliverable_id and deliverable_instance columns
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS service_deliverable_id UUID;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS deliverable_instance INTEGER DEFAULT 1;

-- Create a function to get client deliverables overview for admins
CREATE OR REPLACE FUNCTION get_admin_client_deliverables()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  service_type_id UUID,
  deliverable_name TEXT,
  deliverable_category TEXT,
  deliverable_description TEXT,
  expected_quantity INTEGER,
  delivery_id UUID,
  document_title TEXT,
  document_type TEXT,
  file_url TEXT,
  delivery_status TEXT,
  delivered_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    c.service_type_id,
    sd.deliverable_name,
    sd.deliverable_category,
    sd.description as deliverable_description,
    sd.quantity as expected_quantity,
    d.id as delivery_id,
    d.document_title,
    d.document_type,
    d.file_url,
    d.status as delivery_status,
    d.delivered_at,
    d.approved_at
  FROM clients c
  LEFT JOIN service_deliverables sd ON sd.service_type_id = c.service_type_id
  LEFT JOIN deliveries d ON d.client_id = c.id AND d.service_deliverable_id = sd.id
  ORDER BY c.name, sd.deliverable_order;
END;
$$;

-- Create a function to help with client progress tracking for admins
CREATE OR REPLACE FUNCTION get_client_deliverable_progress(client_id_param UUID)
RETURNS TABLE (
  deliverable_name TEXT,
  deliverable_category TEXT,
  expected_quantity INTEGER,
  delivered_quantity BIGINT,
  completion_percentage NUMERIC
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.deliverable_name,
    sd.deliverable_category,
    sd.quantity as expected_quantity,
    COALESCE(COUNT(d.id) FILTER (WHERE d.status = 'delivered'), 0) as delivered_quantity,
    CASE 
      WHEN sd.quantity > 0 THEN 
        ROUND((COALESCE(COUNT(d.id) FILTER (WHERE d.status = 'delivered'), 0)::numeric / sd.quantity::numeric) * 100, 2)
      ELSE 0
    END as completion_percentage
  FROM service_deliverables sd
  LEFT JOIN clients c ON c.service_type_id = sd.service_type_id
  LEFT JOIN deliveries d ON d.client_id = c.id AND d.service_deliverable_id = sd.id
  WHERE c.id = client_id_param
  GROUP BY sd.deliverable_name, sd.deliverable_category, sd.quantity, sd.deliverable_order
  ORDER BY sd.deliverable_order;
END;
$$;
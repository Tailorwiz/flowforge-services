-- Fix admin access to client data and ensure proper RLS policies

-- Ensure delivery table has proper service_deliverable_id and deliverable_instance columns
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS service_deliverable_id UUID;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS deliverable_instance INTEGER DEFAULT 1;

-- Create a simple view for admin access to client deliverables
CREATE OR REPLACE VIEW admin_client_deliverables AS
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

-- Grant access to this view for admins
GRANT SELECT ON admin_client_deliverables TO authenticated;

-- Create RLS policy for the view that allows admin access
CREATE POLICY "Admins can view client deliverables overview" 
ON admin_client_deliverables 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Ensure messaging works both ways by fixing any issues with message policies
-- The existing policies look correct, but let's ensure sender_id is properly handled

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
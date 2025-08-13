-- First check current state
SELECT id, deliverable_name, description, quantity, deliverable_order FROM service_deliverables 
WHERE deliverable_name LIKE '%Additional Resume%' OR deliverable_name LIKE '%LinkedIn%'
ORDER BY deliverable_order;
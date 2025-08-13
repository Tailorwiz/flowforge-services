-- Fix the ordering so Resume comes first, then 1st, 2nd, 3rd Additional combos
-- Get the service_type_id first to work with the correct service type
WITH service_info AS (
  SELECT DISTINCT service_type_id 
  FROM service_deliverables 
  WHERE deliverable_name LIKE '%Resume%' 
  LIMIT 1
),
base_order AS (
  SELECT MIN(deliverable_order) as min_order 
  FROM service_deliverables 
  WHERE service_type_id = (SELECT service_type_id FROM service_info)
)

-- Update Resume to be first (lowest order)
UPDATE service_deliverables 
SET deliverable_order = (SELECT min_order FROM base_order)
WHERE deliverable_name = 'Resume';

-- Update 1st Additional Resume + Letters Combo to be second
UPDATE service_deliverables 
SET deliverable_order = (SELECT min_order + 1 FROM base_order)
WHERE deliverable_name = '1st Additional Resume + Letters Combo';

-- Update 2nd Additional Resume + Letters Combo to be third  
UPDATE service_deliverables 
SET deliverable_order = (SELECT min_order + 2 FROM base_order)
WHERE deliverable_name = '2nd Additional Resume + Letters Combo';

-- Update 3rd Additional Resume + Letters Combo to be fourth
UPDATE service_deliverables 
SET deliverable_order = (SELECT min_order + 3 FROM base_order)
WHERE deliverable_name = '3rd Additional Resume + Letters Combo';
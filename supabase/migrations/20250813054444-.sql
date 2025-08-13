-- Fix the ordering of Additional Resume + Letters Combos
-- First, let's find the current deliverable_order values and update them properly

-- Update 1st Additional Resume + Letters Combo to have the lowest order
UPDATE service_deliverables 
SET deliverable_order = (
  SELECT MIN(deliverable_order) - 1 
  FROM service_deliverables 
  WHERE service_type_id = (
    SELECT service_type_id 
    FROM service_deliverables 
    WHERE deliverable_name = '1st Additional Resume + Letters Combo' 
    LIMIT 1
  )
)
WHERE deliverable_name = '1st Additional Resume + Letters Combo';

-- Update 2nd Additional Resume + Letters Combo to be next
UPDATE service_deliverables 
SET deliverable_order = (
  SELECT deliverable_order + 1 
  FROM service_deliverables 
  WHERE deliverable_name = '1st Additional Resume + Letters Combo'
  LIMIT 1
)
WHERE deliverable_name = '2nd Additional Resume + Letters Combo';

-- Update 3rd Additional Resume + Letters Combo to be last
UPDATE service_deliverables 
SET deliverable_order = (
  SELECT deliverable_order + 1 
  FROM service_deliverables 
  WHERE deliverable_name = '2nd Additional Resume + Letters Combo'
  LIMIT 1
)
WHERE deliverable_name = '3rd Additional Resume + Letters Combo';
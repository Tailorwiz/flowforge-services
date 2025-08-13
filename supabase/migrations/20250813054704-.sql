-- Fix the ordering so Resume comes first, then 1st, 2nd, 3rd Additional combos
-- Update Resume to be first (order 1)
UPDATE service_deliverables 
SET deliverable_order = 1
WHERE deliverable_name = 'Resume';

-- Update 1st Additional Resume + Letters Combo to be second (order 2)
UPDATE service_deliverables 
SET deliverable_order = 2
WHERE deliverable_name = '1st Additional Resume + Letters Combo';

-- Update 2nd Additional Resume + Letters Combo to be third (order 3) 
UPDATE service_deliverables 
SET deliverable_order = 3
WHERE deliverable_name = '2nd Additional Resume + Letters Combo';

-- Update 3rd Additional Resume + Letters Combo to be fourth (order 4)
UPDATE service_deliverables 
SET deliverable_order = 4
WHERE deliverable_name = '3rd Additional Resume + Letters Combo';
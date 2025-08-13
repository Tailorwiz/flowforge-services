-- Set the correct ordering for all deliverables
-- 1. Resume
UPDATE service_deliverables 
SET deliverable_order = 1
WHERE deliverable_name = 'Resume';

-- 2. Cover Letter
UPDATE service_deliverables 
SET deliverable_order = 2
WHERE deliverable_name = 'Cover Letter';

-- 3. Thank You Letter
UPDATE service_deliverables 
SET deliverable_order = 3
WHERE deliverable_name = 'Thank You Letter';

-- 4. Outreach Letter
UPDATE service_deliverables 
SET deliverable_order = 4
WHERE deliverable_name = 'Outreach Letter';

-- 5. 1st Additional Resume + Letters Combo
UPDATE service_deliverables 
SET deliverable_order = 5
WHERE deliverable_name = '1st Additional Resume + Letters Combo';

-- 6. 2nd Additional Resume + Letters Combo
UPDATE service_deliverables 
SET deliverable_order = 6
WHERE deliverable_name = '2nd Additional Resume + Letters Combo';

-- 7. 3rd Additional Resume + Letters Combo
UPDATE service_deliverables 
SET deliverable_order = 7
WHERE deliverable_name = '3rd Additional Resume + Letters Combo';
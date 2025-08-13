-- Update the naming for Additional Resume + Letters Packages
UPDATE service_deliverables 
SET 
  deliverable_name = '1st Additional Resume + Letters Combo',
  description = '1st Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
WHERE deliverable_name = 'Additional Resume + Letters Package #1';

UPDATE service_deliverables 
SET 
  deliverable_name = '2nd Additional Resume + Letters Combo',
  description = '2nd Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
WHERE deliverable_name = 'Additional Resume + Letters Package #2';

UPDATE service_deliverables 
SET 
  deliverable_name = '3rd Additional Resume + Letters Combo',
  description = '3rd Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
WHERE deliverable_name = 'Additional Resume + Letters Package #3';
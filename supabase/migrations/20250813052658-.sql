-- Update the first package (3 quantity) to be Package #1 with quantity 1
UPDATE service_deliverables 
SET 
  deliverable_name = 'Additional Resume + Letters Package #1',
  description = 'Package #1: 1 additional tailored resume + 3 letters (cover, thank you, outreach)',
  quantity = 1
WHERE id = 'edcedffe-9177-43c8-a168-ef2537236652';

-- Create Package #2 for the 3-package service
INSERT INTO service_deliverables (id, service_type_id, deliverable_name, deliverable_category, description, quantity, deliverable_order)
SELECT 
  gen_random_uuid(),
  service_type_id,
  'Additional Resume + Letters Package #2',
  deliverable_category,
  'Package #2: 1 additional tailored resume + 3 letters (cover, thank you, outreach)',
  1,
  deliverable_order
FROM service_deliverables 
WHERE id = 'edcedffe-9177-43c8-a168-ef2537236652';

-- Create Package #3 for the 3-package service  
INSERT INTO service_deliverables (id, service_type_id, deliverable_name, deliverable_category, description, quantity, deliverable_order)
SELECT 
  gen_random_uuid(),
  service_type_id,
  'Additional Resume + Letters Package #3',
  deliverable_category,
  'Package #3: 1 additional tailored resume + 3 letters (cover, thank you, outreach)',
  1,
  deliverable_order
FROM service_deliverables 
WHERE id = 'edcedffe-9177-43c8-a168-ef2537236652';
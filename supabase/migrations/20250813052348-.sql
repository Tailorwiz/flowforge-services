-- Remove duplicate LinkedIn Profile Optimization deliverable
DELETE FROM service_deliverables WHERE id = '5d0b35c7-a554-4cee-b742-9b60993ba540';

-- Update the Additional Resumes to include letters in the description and adjust quantity
UPDATE service_deliverables 
SET 
  deliverable_name = 'Additional Resume + Letters Package',
  description = 'Each package includes 1 additional tailored resume + 3 letters (cover, thank you, outreach)',
  quantity = 3
WHERE id = 'edcedffe-9177-43c8-a168-ef2537236652';

UPDATE service_deliverables 
SET 
  deliverable_name = 'Additional Resume + Letters Package',
  description = 'Each package includes 1 additional tailored resume + 3 letters (cover, thank you, outreach)',
  quantity = 12
WHERE id = 'b9451cc8-4a35-4c42-a6c7-0fea13d156d5';

-- Remove the separate Additional Letters Set deliverables since they're now bundled
DELETE FROM service_deliverables WHERE id = '8a359ba6-757f-4f32-b8fc-dac463cd72be';
DELETE FROM service_deliverables WHERE id = 'f38b9bf1-3999-450d-a66d-08a95581a9b0';
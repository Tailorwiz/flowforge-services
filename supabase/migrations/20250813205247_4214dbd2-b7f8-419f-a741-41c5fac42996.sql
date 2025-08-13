-- Update Elite Package deliverable descriptions to show 10 additional
DO $$
DECLARE
    elite_service_id UUID;
BEGIN
    -- Get the Elite Package service type ID
    SELECT id INTO elite_service_id FROM service_types WHERE name = 'Elite Package';
    
    -- Update the descriptions for the additional resume + letter combos
    UPDATE service_deliverables 
    SET description = CASE 
        WHEN deliverable_name = '1st Additional Resume + Letters Combo' THEN '1st of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '2nd Additional Resume + Letters Combo' THEN '2nd of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '3rd Additional Resume + Letters Combo' THEN '3rd of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '4th Additional Resume + Letters Combo' THEN '4th of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '5th Additional Resume + Letters Combo' THEN '5th of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '6th Additional Resume + Letters Combo' THEN '6th of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '7th Additional Resume + Letters Combo' THEN '7th of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '8th Additional Resume + Letters Combo' THEN '8th of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '9th Additional Resume + Letters Combo' THEN '9th of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        WHEN deliverable_name = '10th Additional Resume + Letters Combo' THEN '10th of 10 Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)'
        ELSE description
    END
    WHERE service_type_id = elite_service_id 
    AND deliverable_name LIKE '%Additional Resume + Letters Combo%';
    
END $$;
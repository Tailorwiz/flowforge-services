-- First, let's get the Elite Package service type ID
DO $$
DECLARE
    elite_service_id UUID;
    prof_service_id UUID;
BEGIN
    -- Get the Elite Package service type ID
    SELECT id INTO elite_service_id FROM service_types WHERE name = 'Elite Package';
    SELECT id INTO prof_service_id FROM service_types WHERE name = 'Professional Package';
    
    -- Delete existing Elite Package deliverables
    DELETE FROM service_deliverables WHERE service_type_id = elite_service_id;
    
    -- Add all Professional Package deliverables to Elite Package first
    INSERT INTO service_deliverables (service_type_id, deliverable_name, deliverable_category, description, quantity, deliverable_order)
    SELECT 
        elite_service_id,
        deliverable_name,
        deliverable_category,
        description,
        quantity,
        deliverable_order
    FROM service_deliverables 
    WHERE service_type_id = prof_service_id
    AND deliverable_name NOT LIKE '%Additional Resume + Letters Combo%';
    
    -- Add 10 Additional Resume + Letters Combos for Elite Package
    INSERT INTO service_deliverables (service_type_id, deliverable_name, deliverable_category, description, quantity, deliverable_order) VALUES
    (elite_service_id, '1st Additional Resume + Letters Combo', 'document', '1st Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 5),
    (elite_service_id, '2nd Additional Resume + Letters Combo', 'document', '2nd Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 6),
    (elite_service_id, '3rd Additional Resume + Letters Combo', 'document', '3rd Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 7),
    (elite_service_id, '4th Additional Resume + Letters Combo', 'document', '4th Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 8),
    (elite_service_id, '5th Additional Resume + Letters Combo', 'document', '5th Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 9),
    (elite_service_id, '6th Additional Resume + Letters Combo', 'document', '6th Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 10),
    (elite_service_id, '7th Additional Resume + Letters Combo', 'document', '7th Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 11),
    (elite_service_id, '8th Additional Resume + Letters Combo', 'document', '8th Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 12),
    (elite_service_id, '9th Additional Resume + Letters Combo', 'document', '9th Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 13),
    (elite_service_id, '10th Additional Resume + Letters Combo', 'document', '10th Additional Resume + Letters Combo: 1 additional tailored resume + 3 letters (cover, thank you, outreach)', 1, 14),
    (elite_service_id, 'Executive BIO', 'document', 'Professional executive biography', 1, 15),
    (elite_service_id, '1st Coaching Session', 'service', '1-hour professional coaching session', 1, 16),
    (elite_service_id, '2nd Coaching Session', 'service', '1-hour professional coaching session', 1, 17),
    (elite_service_id, '3rd Coaching Session', 'service', '1-hour professional coaching session', 1, 18),
    (elite_service_id, '4th Coaching Session', 'service', '1-hour professional coaching session', 1, 19);
    
    -- Update LinkedIn Profile Optimization order
    UPDATE service_deliverables 
    SET deliverable_order = 20 
    WHERE service_type_id = elite_service_id 
    AND deliverable_name = 'LinkedIn Profile Optimization';
    
END $$;
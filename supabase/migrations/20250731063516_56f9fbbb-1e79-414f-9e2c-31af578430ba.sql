-- Clear existing service types and create the new simplified structure
DELETE FROM service_types;

-- Insert the new simplified package structure
INSERT INTO service_types (name, description, default_timeline_days, gpt_form_prompt, tags) VALUES
(
  'Premium Package', 
  'Designed for job seekers who want a strong, ATS-ready resume with updated content and clean formatting. Includes professionally rewritten resume, ATS-friendly format, keyword optimization, and 1 cover letter.',
  7,
  'Collect information for a premium resume rewrite. Ask about: current role, target job title, work history details, key accomplishments, education, skills, and any specific requirements for ATS optimization.',
  ARRAY['premium', 'resume', 'ats', 'cover-letter']
),
(
  'Professional Package', 
  'Most popular package – ideal if you want to stand out in multiple job applications and build an online presence. Everything in Premium PLUS Career Highlights, LinkedIn optimization, TailorWiz access, and 3 custom resume versions.',
  10,
  'Collect comprehensive information for professional package. Ask about: current role, target job titles, work history with specific accomplishments, LinkedIn profile details, 3 specific job URLs for custom versions, career highlights, and professional branding preferences.',
  ARRAY['professional', 'linkedin', 'tailorwiz', 'custom-versions', 'most-popular']
),
(
  'Elite Executive Package', 
  'Premium branding package for executives, directors, or those changing careers or seeking major salary upgrades. Everything in Professional PLUS Executive Biography, priority turnaround, and full training bundle.',
  14,
  'Collect executive-level information for premium branding. Ask about: leadership experience, executive accomplishments, career pivot strategy, target executive roles, personal branding preferences, strategic messaging needs, and advanced keyword requirements for multiple career paths.',
  ARRAY['executive', 'elite', 'biography', 'priority', 'career-change']
);

-- Clear existing tasks and create new task structure
DELETE FROM tasks;

-- Insert tasks for Premium Package
INSERT INTO tasks (name, description, default_order, is_template) VALUES
('Resume Intake Form', 'Collect client information and requirements for resume rewrite', 1, true),
('Professional Resume Draft', 'Create ATS-optimized resume with keyword targeting', 2, true),
('Cover Letter Creation', 'Write keyword-optimized cover letter template', 3, true),
('Client Review & Revisions', 'Present draft to client and incorporate feedback', 4, true),
('Final Delivery', 'Deliver completed resume and cover letter', 5, true);

-- Insert additional tasks for Professional Package
INSERT INTO tasks (name, description, default_order, is_template) VALUES
('Career Highlights Section', 'Create 4-10 powerful impact bullets for career highlights', 6, true),
('Executive Branding Statement', 'Develop compelling executive branding statement', 7, true),
('LinkedIn Profile Rewrite', 'Optimize LinkedIn profile with keyword targeting', 8, true),
('TailorWiz Setup', 'Provide 60-day access to resume automation tool', 9, true),
('Custom Resume Versions', 'Create 3 custom resume versions for specific job applications', 10, true),
('Training PDF Delivery', 'Deliver 4 bonus training PDFs', 11, true);

-- Insert additional tasks for Elite Executive Package
INSERT INTO tasks (name, description, default_order, is_template) VALUES
('Executive Biography Creation', 'Write fully personalized executive biography', 12, true),
('Strategic Messaging Development', 'Develop strategic messaging for higher-level roles', 13, true),
('Premium Visual Layout', 'Apply premium formatting with visual upgrades', 14, true),
('Full Training Bundle', 'Deliver complete 5-PDF training bundle', 15, true),
('Priority Review Process', 'Expedited review and delivery process', 16, true);

-- Clear and create new intake forms
DELETE FROM intake_forms;

INSERT INTO intake_forms (name, description, form_fields, is_active) VALUES
(
  'Premium Package Intake',
  'Basic intake form for resume rewrite services',
  '[
    {"name": "current_role", "type": "text", "label": "Current Job Title", "required": true},
    {"name": "target_role", "type": "text", "label": "Target Job Title", "required": true},
    {"name": "work_history", "type": "textarea", "label": "Work History Details", "required": true},
    {"name": "accomplishments", "type": "textarea", "label": "Key Accomplishments", "required": true},
    {"name": "education", "type": "text", "label": "Education Background", "required": true},
    {"name": "skills", "type": "textarea", "label": "Core Skills", "required": true},
    {"name": "ats_requirements", "type": "textarea", "label": "Specific ATS Requirements", "required": false}
  ]'::jsonb,
  true
),
(
  'Professional Package Intake',
  'Comprehensive intake for professional package with LinkedIn and custom versions',
  '[
    {"name": "current_role", "type": "text", "label": "Current Job Title", "required": true},
    {"name": "target_roles", "type": "textarea", "label": "Target Job Titles (multiple)", "required": true},
    {"name": "work_history", "type": "textarea", "label": "Detailed Work History", "required": true},
    {"name": "accomplishments", "type": "textarea", "label": "Specific Accomplishments with Metrics", "required": true},
    {"name": "linkedin_profile", "type": "url", "label": "Current LinkedIn Profile URL", "required": true},
    {"name": "job_urls", "type": "textarea", "label": "3 Specific Job URLs for Custom Versions", "required": true},
    {"name": "career_highlights", "type": "textarea", "label": "Career Highlights for Impact Section", "required": true},
    {"name": "branding_preferences", "type": "textarea", "label": "Professional Branding Preferences", "required": false}
  ]'::jsonb,
  true
),
(
  'Elite Executive Intake',
  'Executive-level intake for premium branding and career strategy',
  '[
    {"name": "executive_level", "type": "text", "label": "Current Executive Level", "required": true},
    {"name": "leadership_experience", "type": "textarea", "label": "Leadership Experience Details", "required": true},
    {"name": "executive_accomplishments", "type": "textarea", "label": "Executive Accomplishments with Business Impact", "required": true},
    {"name": "career_pivot", "type": "textarea", "label": "Career Pivot Strategy (if applicable)", "required": false},
    {"name": "target_executive_roles", "type": "textarea", "label": "Target Executive Positions", "required": true},
    {"name": "personal_branding", "type": "textarea", "label": "Personal Branding Vision", "required": true},
    {"name": "strategic_messaging", "type": "textarea", "label": "Strategic Messaging Needs", "required": true},
    {"name": "keyword_paths", "type": "textarea", "label": "Multiple Career Path Keywords", "required": true}
  ]'::jsonb,
  true
);

-- Clear and create training materials
DELETE FROM training_materials;

INSERT INTO training_materials (name, type, description, content_url, is_active) VALUES
('The Science of Getting Job Interviews', 'PDF', 'Master the psychology and strategy behind successful job interviews', '/training/job-interviews-science.pdf', true),
('The Resume Tailoring Formula', 'PDF', 'Learn the exact formula for customizing resumes for maximum impact', '/training/resume-tailoring-formula.pdf', true),
('Job Scams Exposed', 'PDF', 'Identify and avoid common job scams and fraudulent opportunities', '/training/job-scams-exposed.pdf', true),
('The ATS Formula', 'PDF', 'Complete guide to beating Applicant Tracking Systems', '/training/ats-formula.pdf', true),
('7-Day Job Interview System', 'PDF', 'Comprehensive interview preparation system for executives', '/training/interview-system.pdf', true);

-- Clear and rebuild service relationships
DELETE FROM service_tasks;
DELETE FROM service_intake_forms;
DELETE FROM service_training_materials;

-- Link Premium Package (assuming it gets ID from first insert)
WITH premium_service AS (SELECT id FROM service_types WHERE name = 'Premium Package'),
     premium_tasks AS (SELECT id FROM tasks WHERE name IN ('Resume Intake Form', 'Professional Resume Draft', 'Cover Letter Creation', 'Client Review & Revisions', 'Final Delivery')),
     premium_form AS (SELECT id FROM intake_forms WHERE name = 'Premium Package Intake')
INSERT INTO service_tasks (service_type_id, task_id, task_order)
SELECT p.id, t.id, 
  CASE t.name 
    WHEN 'Resume Intake Form' THEN 1
    WHEN 'Professional Resume Draft' THEN 2
    WHEN 'Cover Letter Creation' THEN 3
    WHEN 'Client Review & Revisions' THEN 4
    WHEN 'Final Delivery' THEN 5
  END
FROM premium_service p, premium_tasks t;

WITH premium_service AS (SELECT id FROM service_types WHERE name = 'Premium Package'),
     premium_form AS (SELECT id FROM intake_forms WHERE name = 'Premium Package Intake')
INSERT INTO service_intake_forms (service_type_id, intake_form_id, is_required)
SELECT p.id, f.id, true
FROM premium_service p, premium_form f;

-- Link Professional Package
WITH prof_service AS (SELECT id FROM service_types WHERE name = 'Professional Package'),
     prof_tasks AS (SELECT id, name FROM tasks WHERE name IN ('Resume Intake Form', 'Professional Resume Draft', 'Cover Letter Creation', 'Client Review & Revisions', 'Career Highlights Section', 'Executive Branding Statement', 'LinkedIn Profile Rewrite', 'TailorWiz Setup', 'Custom Resume Versions', 'Training PDF Delivery', 'Final Delivery')),
     prof_form AS (SELECT id FROM intake_forms WHERE name = 'Professional Package Intake')
INSERT INTO service_tasks (service_type_id, task_id, task_order)
SELECT p.id, t.id,
  CASE t.name 
    WHEN 'Resume Intake Form' THEN 1
    WHEN 'Professional Resume Draft' THEN 2
    WHEN 'Cover Letter Creation' THEN 3
    WHEN 'Career Highlights Section' THEN 4
    WHEN 'Executive Branding Statement' THEN 5
    WHEN 'LinkedIn Profile Rewrite' THEN 6
    WHEN 'TailorWiz Setup' THEN 7
    WHEN 'Custom Resume Versions' THEN 8
    WHEN 'Training PDF Delivery' THEN 9
    WHEN 'Client Review & Revisions' THEN 10
    WHEN 'Final Delivery' THEN 11
  END
FROM prof_service p, prof_tasks t;

WITH prof_service AS (SELECT id FROM service_types WHERE name = 'Professional Package'),
     prof_form AS (SELECT id FROM intake_forms WHERE name = 'Professional Package Intake'),
     prof_training AS (SELECT id FROM training_materials WHERE name IN ('The Science of Getting Job Interviews', 'The Resume Tailoring Formula', 'Job Scams Exposed', 'The ATS Formula'))
INSERT INTO service_intake_forms (service_type_id, intake_form_id, is_required)
SELECT p.id, f.id, true
FROM prof_service p, prof_form f;

INSERT INTO service_training_materials (service_type_id, training_material_id)
SELECT p.id, t.id
FROM prof_service p, prof_training t;

-- Link Elite Executive Package
WITH elite_service AS (SELECT id FROM service_types WHERE name = 'Elite Executive Package'),
     elite_tasks AS (SELECT id, name FROM tasks),
     elite_form AS (SELECT id FROM intake_forms WHERE name = 'Elite Executive Intake'),
     elite_training AS (SELECT id FROM training_materials)
INSERT INTO service_tasks (service_type_id, task_id, task_order)
SELECT e.id, t.id,
  CASE t.name 
    WHEN 'Resume Intake Form' THEN 1
    WHEN 'Professional Resume Draft' THEN 2
    WHEN 'Cover Letter Creation' THEN 3
    WHEN 'Career Highlights Section' THEN 4
    WHEN 'Executive Branding Statement' THEN 5
    WHEN 'LinkedIn Profile Rewrite' THEN 6
    WHEN 'Executive Biography Creation' THEN 7
    WHEN 'Strategic Messaging Development' THEN 8
    WHEN 'Premium Visual Layout' THEN 9
    WHEN 'TailorWiz Setup' THEN 10
    WHEN 'Custom Resume Versions' THEN 11
    WHEN 'Full Training Bundle' THEN 12
    WHEN 'Priority Review Process' THEN 13
    WHEN 'Client Review & Revisions' THEN 14
    WHEN 'Final Delivery' THEN 15
  END
FROM elite_service e, elite_tasks t;

WITH elite_service AS (SELECT id FROM service_types WHERE name = 'Elite Executive Package'),
     elite_form AS (SELECT id FROM intake_forms WHERE name = 'Elite Executive Intake'),
     elite_training AS (SELECT id FROM training_materials)
INSERT INTO service_intake_forms (service_type_id, intake_form_id, is_required)
SELECT e.id, f.id, true
FROM elite_service e, elite_form f;

INSERT INTO service_training_materials (service_type_id, training_material_id)
SELECT e.id, t.id
FROM elite_service e, elite_training t;
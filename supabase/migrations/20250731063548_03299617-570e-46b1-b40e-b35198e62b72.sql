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
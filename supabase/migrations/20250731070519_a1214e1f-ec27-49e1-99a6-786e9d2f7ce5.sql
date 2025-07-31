-- Add Stripe mapping columns to service_types table
ALTER TABLE public.service_types 
ADD COLUMN stripe_product_id TEXT,
ADD COLUMN stripe_price_id TEXT,
ADD COLUMN price_cents INTEGER;

-- Update Premium Package ($295, 5 business days)
UPDATE public.service_types 
SET 
  price_cents = 29500,
  default_timeline_days = 5,
  stripe_product_id = 'prod_RLSYhqFngqDg7X',
  stripe_price_id = 'price_1QSldmAIGQEdPyqtE0Om6Ao4',
  description = 'Designed for job seekers who want a strong, ATS-ready resume. Includes professionally rewritten resume, ATS-friendly format, keyword optimization, and 1 cover letter. Delivery: 5 business days.',
  gpt_form_prompt = 'Collect information for Premium resume package ($295). Ask about: current role, target job title, work history details, key accomplishments, education, skills, and specific requirements for ATS optimization.'
WHERE name = 'Premium Package';

-- Update Professional Package ($495, 7 business days)
UPDATE public.service_types 
SET 
  price_cents = 49500,
  default_timeline_days = 7,
  stripe_product_id = 'prod_RnVTal3ssDUTei',
  stripe_price_id = 'price_1QtuSrAIGQEdPyqtYgwvwzZ1',
  description = 'Most popular package – ideal for multiple job applications and online presence. Everything in Premium PLUS LinkedIn optimization, TailorWiz access, and 3 custom resume versions. Delivery: 7 business days.',
  gpt_form_prompt = 'Collect comprehensive information for Professional package ($495). Ask about: current role, target job titles, work history with accomplishments, LinkedIn profile details, 3 specific job URLs for custom versions, career highlights, and professional branding preferences.'
WHERE name = 'Professional Package';

-- Update Elite Executive Package ($895, 7 business days)
UPDATE public.service_types 
SET 
  price_cents = 89500,
  default_timeline_days = 7,
  stripe_product_id = 'prod_RKmOG38leKeSKy',
  stripe_price_id = 'price_1QS6phAIGQEdPyqtI7o0JNvu',
  name = 'Elite Executive Package',
  description = 'Premium branding package for executives and directors seeking major salary upgrades. Everything in Professional PLUS Executive Biography, priority turnaround, and full training bundle. Delivery: 7 business days.',
  gpt_form_prompt = 'Collect executive-level information for Elite package ($895). Ask about: leadership experience, executive accomplishments, target executive roles, personal branding preferences, strategic messaging needs, and advanced keyword requirements.'
WHERE name = 'Elite Executive Package';
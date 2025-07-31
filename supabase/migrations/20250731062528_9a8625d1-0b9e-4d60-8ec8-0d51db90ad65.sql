-- Create service_types table
CREATE TABLE public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_timeline_days INTEGER DEFAULT 5,
  gpt_form_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  payment_status TEXT DEFAULT 'pending',
  stripe_customer_id TEXT,
  estimated_delivery_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_order INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_tasks linking table
CREATE TABLE public.service_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  task_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_type_id, task_id)
);

-- Create intake_forms table
CREATE TABLE public.intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  form_fields JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_intake_forms linking table
CREATE TABLE public.service_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  intake_form_id UUID REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_type_id, intake_form_id)
);

-- Create training_materials table
CREATE TABLE public.training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT, -- 'video', 'pdf', 'link', 'text'
  content_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_training_materials linking table
CREATE TABLE public.service_training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  training_material_id UUID REFERENCES public.training_materials(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_type_id, training_material_id)
);

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  trigger_type TEXT, -- 'welcome', 'reminder', 'followup', etc.
  delay_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_email_templates linking table
CREATE TABLE public.service_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  email_template_id UUID REFERENCES public.email_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_type_id, email_template_id)
);

-- Create client_tasks table (actual task assignments)
CREATE TABLE public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  assigned_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  completed_date DATE,
  task_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client_history table
CREATE TABLE public.client_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'service_changed', 'task_completed', 'email_sent', etc.
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_types (admin can manage, users can view active ones)
CREATE POLICY "Admins can manage service types" ON public.service_types
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active service types" ON public.service_types
FOR SELECT
USING (is_active = true);

-- Create RLS policies for clients (admins can manage all, users can view their own)
CREATE POLICY "Admins can manage all clients" ON public.clients
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own client record" ON public.clients
FOR SELECT
USING (user_id = auth.uid());

-- Create RLS policies for projects
CREATE POLICY "Admins can manage all projects" ON public.projects
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own projects" ON public.projects
FOR SELECT
USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Create RLS policies for tasks
CREATE POLICY "Admins can manage tasks" ON public.tasks
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view tasks" ON public.tasks
FOR SELECT
USING (true);

-- Create RLS policies for service_tasks
CREATE POLICY "Admins can manage service tasks" ON public.service_tasks
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view service tasks" ON public.service_tasks
FOR SELECT
USING (true);

-- Create RLS policies for intake_forms
CREATE POLICY "Admins can manage intake forms" ON public.intake_forms
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active intake forms" ON public.intake_forms
FOR SELECT
USING (is_active = true);

-- Create RLS policies for service_intake_forms
CREATE POLICY "Admins can manage service intake forms" ON public.service_intake_forms
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view service intake forms" ON public.service_intake_forms
FOR SELECT
USING (true);

-- Create RLS policies for training_materials
CREATE POLICY "Admins can manage training materials" ON public.training_materials
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active training materials" ON public.training_materials
FOR SELECT
USING (is_active = true);

-- Create RLS policies for service_training_materials
CREATE POLICY "Admins can manage service training materials" ON public.service_training_materials
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view service training materials" ON public.service_training_materials
FOR SELECT
USING (true);

-- Create RLS policies for email_templates
CREATE POLICY "Admins can manage email templates" ON public.email_templates
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active email templates" ON public.email_templates
FOR SELECT
USING (is_active = true);

-- Create RLS policies for service_email_templates
CREATE POLICY "Admins can manage service email templates" ON public.service_email_templates
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view service email templates" ON public.service_email_templates
FOR SELECT
USING (true);

-- Create RLS policies for client_tasks
CREATE POLICY "Admins can manage all client tasks" ON public.client_tasks
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own client tasks" ON public.client_tasks
FOR SELECT
USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Create RLS policies for client_history
CREATE POLICY "Admins can manage all client history" ON public.client_history
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own client history" ON public.client_history
FOR SELECT
USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Create updated_at triggers
CREATE TRIGGER update_service_types_updated_at
    BEFORE UPDATE ON public.service_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intake_forms_updated_at
    BEFORE UPDATE ON public.intake_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_materials_updated_at
    BEFORE UPDATE ON public.training_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_tasks_updated_at
    BEFORE UPDATE ON public.client_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample service types
INSERT INTO public.service_types (name, description, default_timeline_days, tags) VALUES
('Resume Only', 'Basic resume writing service', 5, '{"resume", "basic", "writing"}'),
('Resume + Cover Letter', 'Resume and cover letter package', 7, '{"resume", "cover-letter", "package"}'),
('Resume + LinkedIn', 'Resume and LinkedIn optimization', 10, '{"resume", "linkedin", "branding"}'),
('Full Package', 'Resume, LinkedIn, and coaching', 14, '{"resume", "linkedin", "coaching", "premium"}'),
('Career Coaching Only', 'Standalone career coaching sessions', 21, '{"coaching", "sessions"}'),
('Interview Prep', 'Interview preparation and coaching', 7, '{"interview", "coaching", "prep"}'),
('Federal Resume Package', 'Federal government resume package', 10, '{"federal", "government", "resume"}'),
('LinkedIn Revamp Only', 'LinkedIn profile optimization only', 5, '{"linkedin", "branding", "solo"}'),
('Executive Branding Package', 'Executive level branding and positioning', 21, '{"executive", "branding", "premium"}');

-- Insert sample tasks
INSERT INTO public.tasks (name, description, default_order) VALUES
('Upload Resume', 'Client uploads current resume for review', 1),
('Complete Intake Form', 'Fill out detailed intake questionnaire', 2),
('Review Draft', 'Review and provide feedback on initial draft', 3),
('Schedule Consultation', 'Book consultation call with career coach', 4),
('LinkedIn Profile Review', 'Review current LinkedIn profile', 5),
('Cover Letter Draft', 'Create first draft of cover letter', 6),
('Final Review', 'Final review and approval of all materials', 7),
('Delivery', 'Final delivery of all completed materials', 8);

-- Insert sample intake form
INSERT INTO public.intake_forms (name, description, form_fields) VALUES
('Resume Intake Form v1', 'Standard resume intake questionnaire', '[
  {"name": "current_position", "type": "text", "label": "Current Position", "required": true},
  {"name": "target_role", "type": "text", "label": "Target Role", "required": true},
  {"name": "industry", "type": "text", "label": "Industry", "required": false},
  {"name": "years_experience", "type": "number", "label": "Years of Experience", "required": true},
  {"name": "key_achievements", "type": "textarea", "label": "Key Achievements", "required": false}
]');

-- Insert sample training materials
INSERT INTO public.training_materials (name, type, description) VALUES
('Resume Tips Video', 'video', 'Video guide on resume best practices'),
('Resume PDF Guide', 'pdf', 'Comprehensive PDF guide for resume writing'),
('LinkedIn Optimization Checklist', 'pdf', 'Checklist for optimizing LinkedIn profiles'),
('Interview Prep Handbook', 'pdf', 'Complete guide for interview preparation');

-- Insert sample email templates
INSERT INTO public.email_templates (name, subject, content, trigger_type, delay_days) VALUES
('Welcome Email', 'Welcome to Our Service!', 'Thank you for choosing our service. We''re excited to work with you!', 'welcome', 0),
('Intake Reminder', 'Reminder: Please Complete Your Intake Form', 'This is a friendly reminder to complete your intake form so we can get started on your project.', 'reminder', 2),
('First Draft Ready', 'Your First Draft is Ready for Review', 'Great news! Your first draft is ready for your review. Please log in to your portal to view it.', 'milestone', 0);

-- Link sample data together
-- Link Resume Only service to tasks
INSERT INTO public.service_tasks (service_type_id, task_id, task_order)
SELECT s.id, t.id, t.default_order
FROM public.service_types s, public.tasks t
WHERE s.name = 'Resume Only' 
AND t.name IN ('Upload Resume', 'Complete Intake Form', 'Review Draft', 'Final Review', 'Delivery');

-- Link Resume Only to intake form
INSERT INTO public.service_intake_forms (service_type_id, intake_form_id)
SELECT s.id, f.id
FROM public.service_types s, public.intake_forms f
WHERE s.name = 'Resume Only' AND f.name = 'Resume Intake Form v1';

-- Link Resume Only to training materials
INSERT INTO public.service_training_materials (service_type_id, training_material_id)
SELECT s.id, m.id
FROM public.service_types s, public.training_materials m
WHERE s.name = 'Resume Only' AND m.name IN ('Resume Tips Video', 'Resume PDF Guide');

-- Link Resume Only to email templates
INSERT INTO public.service_email_templates (service_type_id, email_template_id)
SELECT s.id, e.id
FROM public.service_types s, public.email_templates e
WHERE s.name = 'Resume Only' AND e.name IN ('Welcome Email', 'Intake Reminder');
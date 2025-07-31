-- Create service_types table
CREATE TABLE public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_timeline_days INTEGER DEFAULT 7,
  gpt_form_prompt TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intake_forms table
CREATE TABLE public.intake_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_tasks table
CREATE TABLE public.service_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_description TEXT,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_materials table
CREATE TABLE public.training_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'video', 'pdf', 'text', 'link'
  content_url TEXT,
  content_text TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_content TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'welcome', 'reminder', 'completion', etc.
  delay_hours INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id),
  stripe_customer_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  onboarding_completed BOOLEAN DEFAULT false,
  estimated_delivery_date DATE,
  actual_completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_tasks table
CREATE TABLE public.client_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_task_id UUID NOT NULL REFERENCES public.service_tasks(id),
  task_name TEXT NOT NULL,
  task_description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_history table
CREATE TABLE public.client_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'service_changed', 'task_completed', 'email_sent', etc.
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view service types" ON public.service_types FOR SELECT USING (true);

CREATE POLICY "Users can view intake forms" ON public.intake_forms FOR SELECT USING (true);

CREATE POLICY "Users can view service tasks" ON public.service_tasks FOR SELECT USING (true);

CREATE POLICY "Users can view training materials" ON public.training_materials FOR SELECT USING (true);

CREATE POLICY "Users can view email templates" ON public.email_templates FOR SELECT USING (true);

CREATE POLICY "Users can manage their own clients" ON public.clients FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage tasks for their clients" ON public.client_tasks 
FOR ALL USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Users can view history for their clients" ON public.client_history 
FOR SELECT USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Insert sample service types
INSERT INTO public.service_types (name, description, default_timeline_days, gpt_form_prompt, tags) VALUES
('Resume Only', 'Basic resume writing service', 5, 'Ask 10 questions to build a comprehensive resume focusing on work experience, skills, and achievements.', ARRAY['resume', 'basic', 'writing']),
('Resume + Cover Letter', 'Resume writing plus custom cover letter', 7, 'Ask questions about resume and target job positions for cover letter customization.', ARRAY['resume', 'cover-letter', 'package']),
('Resume + LinkedIn', 'Resume writing plus LinkedIn profile optimization', 10, 'Gather information for resume and LinkedIn profile including professional summary and endorsements.', ARRAY['resume', 'linkedin', 'branding']),
('Full Package', 'Complete career package: Resume, LinkedIn, and Coaching', 14, 'Comprehensive intake covering career goals, experience, LinkedIn needs, and coaching objectives.', ARRAY['resume', 'linkedin', 'coaching', 'premium']),
('Career Coaching Only', 'One-on-one career coaching sessions', 21, 'Focus on career goals, challenges, and development plan for coaching sessions.', ARRAY['coaching', 'development']),
('Interview Prep', 'Interview preparation and practice sessions', 7, 'Gather information about target roles and interview anxiety for customized prep.', ARRAY['interview', 'preparation', 'coaching']),
('Federal Resume Package', 'Specialized federal resume and application support', 10, 'Detailed federal job application requirements and experience documentation.', ARRAY['federal', 'government', 'specialized']),
('LinkedIn Revamp Only', 'Complete LinkedIn profile optimization', 5, 'Focus on LinkedIn profile sections, professional branding, and networking goals.', ARRAY['linkedin', 'branding', 'networking']),
('Executive Branding Package', 'Executive-level personal branding and positioning', 21, 'Executive experience, leadership style, and strategic career positioning.', ARRAY['executive', 'branding', 'leadership', 'premium']);

-- Create triggers for updated_at
CREATE TRIGGER update_service_types_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intake_forms_updated_at
  BEFORE UPDATE ON public.intake_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
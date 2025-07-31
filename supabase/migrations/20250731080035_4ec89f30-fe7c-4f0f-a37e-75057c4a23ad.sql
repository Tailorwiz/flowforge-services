-- Create reminder_templates table for customizable reminder messages
CREATE TABLE public.reminder_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('intake_form_pending', 'review_not_scheduled', 'awaiting_notes', 'project_due_soon', 'custom')),
  delay_hours INTEGER NOT NULL DEFAULT 24,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_reminders table for tracking automated reminders
CREATE TABLE public.scheduled_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  template_id UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  reminder_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_digest_preferences table
CREATE TABLE public.daily_digest_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  send_time TIME NOT NULL DEFAULT '08:00:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  include_due_today BOOLEAN NOT NULL DEFAULT true,
  include_due_tomorrow BOOLEAN NOT NULL DEFAULT true,
  include_overdue BOOLEAN NOT NULL DEFAULT true,
  include_new_uploads BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_digest_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminder_templates
CREATE POLICY "Admins can manage reminder templates" 
ON public.reminder_templates 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active reminder templates" 
ON public.reminder_templates 
FOR SELECT 
USING (is_active = true);

-- RLS policies for scheduled_reminders
CREATE POLICY "Admins can manage all scheduled reminders" 
ON public.scheduled_reminders 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view reminders for their clients" 
ON public.scheduled_reminders 
FOR SELECT 
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- RLS policies for daily_digest_preferences
CREATE POLICY "Users can manage their own digest preferences" 
ON public.daily_digest_preferences 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Insert default reminder templates
INSERT INTO public.reminder_templates (name, subject_template, message_template, trigger_type, delay_hours) VALUES
('Intake Form Reminder', 'Action Required: Complete Your Intake Form', 
'Hi {{client_name}}, just checking in! We''re waiting on your intake form to move forward. Let us know if you need help. Best regards, The Results Driven Resumes Team', 
'intake_form_pending', 24),

('Review Session Reminder', 'Schedule Your Review Session', 
'Hello {{client_name}}, it''s time to schedule your review session! Please reply with your availability so we can finalize your project. Looking forward to hearing from you!', 
'review_not_scheduled', 48),

('Awaiting Notes Reminder', 'We''re Waiting for Your Feedback', 
'Hi {{client_name}}, we''ve sent you some materials for review. Please share your notes and feedback so we can move to the next step. Thanks!', 
'awaiting_notes', 72),

('Project Due Soon', 'Your Project is Due Soon!', 
'Hello {{client_name}}, your project delivery is scheduled for {{delivery_date}}. We''re on track to meet this deadline. Please let us know if you have any last-minute requests!', 
'project_due_soon', 24);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_reminder_templates_updated_at
  BEFORE UPDATE ON public.reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_reminders_updated_at
  BEFORE UPDATE ON public.scheduled_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_digest_preferences_updated_at
  BEFORE UPDATE ON public.daily_digest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
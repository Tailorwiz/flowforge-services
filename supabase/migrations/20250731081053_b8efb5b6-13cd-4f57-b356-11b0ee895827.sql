-- Add rush service support to clients table
ALTER TABLE public.clients 
ADD COLUMN is_rush BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN rush_deadline TIMESTAMP WITH TIME ZONE NULL;

-- Create function to automatically set rush deadline when is_rush is enabled
CREATE OR REPLACE FUNCTION public.set_rush_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- If rush is being enabled, set deadline to 72 hours from now
  IF NEW.is_rush = true AND (OLD.is_rush IS NULL OR OLD.is_rush = false) THEN
    NEW.rush_deadline = NOW() + INTERVAL '72 hours';
    -- Also update the estimated delivery date to the rush deadline
    NEW.estimated_delivery_date = (NOW() + INTERVAL '72 hours')::date;
  END IF;
  
  -- If rush is being disabled, clear the rush deadline
  IF NEW.is_rush = false AND OLD.is_rush = true THEN
    NEW.rush_deadline = NULL;
    -- Recalculate normal delivery date based on service type
    -- You may want to adjust this logic based on your business rules
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

-- Create trigger to automatically manage rush deadlines
CREATE TRIGGER set_client_rush_deadline
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rush_deadline();

-- Create index for efficient rush client queries
CREATE INDEX idx_clients_rush ON public.clients (is_rush, created_at) WHERE is_rush = true;

-- Update reminder templates for rush orders
INSERT INTO public.reminder_templates (name, subject_template, message_template, trigger_type, delay_hours) VALUES
('Rush Order Alert', '🚨 RUSH ORDER: {{client_name}} - Action Required!', 
'URGENT: This is a RUSH order for {{client_name}}. Deadline: {{rush_deadline}}. Please prioritize this project immediately!', 
'custom', 1),

('Rush Delivery Warning', '⚠️ RUSH DEADLINE APPROACHING: {{client_name}}', 
'RUSH ORDER ALERT: {{client_name}}''s project is due in {{hours_remaining}} hours! Status check required.', 
'project_due_soon', 12);

-- Add client history entry for rush status changes
CREATE OR REPLACE FUNCTION public.track_rush_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Track when rush status is enabled
  IF NEW.is_rush = true AND (OLD.is_rush IS NULL OR OLD.is_rush = false) THEN
    INSERT INTO public.client_history (
      client_id, 
      action_type, 
      description,
      metadata
    ) VALUES (
      NEW.id,
      'rush_enabled',
      'Client marked as RUSH - 72 hour delivery deadline set',
      jsonb_build_object(
        'rush_deadline', NEW.rush_deadline,
        'previous_delivery_date', OLD.estimated_delivery_date,
        'new_delivery_date', NEW.estimated_delivery_date
      )
    );
  END IF;
  
  -- Track when rush status is disabled
  IF NEW.is_rush = false AND OLD.is_rush = true THEN
    INSERT INTO public.client_history (
      client_id, 
      action_type, 
      description,
      metadata
    ) VALUES (
      NEW.id,
      'rush_disabled',
      'RUSH status removed from client',
      jsonb_build_object(
        'previous_rush_deadline', OLD.rush_deadline,
        'previous_delivery_date', OLD.estimated_delivery_date,
        'new_delivery_date', NEW.estimated_delivery_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

-- Create trigger to track rush status changes
CREATE TRIGGER track_client_rush_changes
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_rush_status_change();
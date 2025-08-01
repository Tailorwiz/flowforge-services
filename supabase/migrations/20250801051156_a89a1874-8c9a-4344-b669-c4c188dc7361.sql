-- Create tables to track client progress through onboarding steps
CREATE TABLE IF NOT EXISTS public.client_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, step_number)
);

-- Enable RLS
ALTER TABLE public.client_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for client progress
CREATE POLICY "Users can view their own progress" 
ON public.client_progress 
FOR SELECT 
USING (client_id IN (
  SELECT id FROM clients WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all client progress" 
ON public.client_progress 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can update their own progress" 
ON public.client_progress 
FOR UPDATE 
USING (client_id IN (
  SELECT id FROM clients WHERE user_id = auth.uid()
));

-- Create function to initialize progress steps for new clients
CREATE OR REPLACE FUNCTION public.initialize_client_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the 5 standard progress steps for the new client
  INSERT INTO public.client_progress (client_id, step_number, step_name, status) VALUES
    (NEW.id, 1, 'Intake Form', 'pending'),
    (NEW.id, 2, 'Upload Resume', 'pending'),
    (NEW.id, 3, 'Book Session', 'pending'),
    (NEW.id, 4, 'In Progress', 'pending'),
    (NEW.id, 5, 'Review & Download', 'pending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-initialize progress when a client is created
CREATE TRIGGER initialize_client_progress_trigger
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_client_progress();

-- Create function to update progress timestamps
CREATE OR REPLACE FUNCTION public.update_client_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_client_progress_timestamp_trigger
  BEFORE UPDATE ON public.client_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_progress_timestamp();

-- Add intake_form_submitted and resume_uploaded columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS intake_form_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resume_uploaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_booked BOOLEAN DEFAULT FALSE;
-- Create table for intake form drafts
CREATE TABLE public.intake_form_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intake_form_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create drafts for their clients" 
ON public.intake_form_drafts 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND 
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view their own drafts" 
ON public.intake_form_drafts 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own drafts" 
ON public.intake_form_drafts 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own drafts" 
ON public.intake_form_drafts 
FOR DELETE 
USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_intake_form_drafts_updated_at
  BEFORE UPDATE ON public.intake_form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to upsert draft
CREATE OR REPLACE FUNCTION public.save_intake_draft(
  p_client_id UUID,
  p_user_id UUID,
  p_form_data JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  draft_id UUID;
BEGIN
  -- Insert or update draft
  INSERT INTO public.intake_form_drafts (client_id, user_id, form_data)
  VALUES (p_client_id, p_user_id, p_form_data)
  ON CONFLICT (client_id, user_id)
  DO UPDATE SET 
    form_data = EXCLUDED.form_data,
    updated_at = now()
  RETURNING id INTO draft_id;
  
  RETURN draft_id;
END;
$$;

-- Add unique constraint to prevent multiple drafts per client/user
ALTER TABLE public.intake_form_drafts 
ADD CONSTRAINT unique_client_user_draft 
UNIQUE (client_id, user_id);
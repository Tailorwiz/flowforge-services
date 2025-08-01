-- Create deliveries table for client document deliveries
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  project_id UUID,
  document_type TEXT NOT NULL, -- 'resume', 'cover_letter', 'linkedin', etc.
  document_title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'application/pdf',
  status TEXT NOT NULL DEFAULT 'delivered', -- 'delivered', 'revision_requested', 'approved'
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all deliveries" 
ON public.deliveries 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own deliveries" 
ON public.deliveries 
FOR SELECT 
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Create revision requests table
CREATE TABLE public.revision_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  client_id UUID NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}', -- array of selected reasons
  custom_reason TEXT,
  description TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all revision requests" 
ON public.revision_requests 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can create revision requests for their deliveries" 
ON public.revision_requests 
FOR INSERT 
WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own revision requests" 
ON public.revision_requests 
FOR SELECT 
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Create delivery comments table
CREATE TABLE public.delivery_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  user_id UUID NOT NULL,
  client_id UUID,
  content TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all delivery comments" 
ON public.delivery_comments 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can create comments for their deliveries" 
ON public.delivery_comments 
FOR INSERT 
WITH CHECK (
  (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) AND user_id = auth.uid()) OR
  is_admin(auth.uid())
);

CREATE POLICY "Users can view comments for their deliveries" 
ON public.delivery_comments 
FOR SELECT 
USING (
  delivery_id IN (
    SELECT d.id FROM deliveries d 
    JOIN clients c ON d.client_id = c.id 
    WHERE c.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Create triggers for updated_at
CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revision_requests_updated_at
BEFORE UPDATE ON public.revision_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_comments_updated_at
BEFORE UPDATE ON public.delivery_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically set revision request due date
CREATE OR REPLACE FUNCTION public.set_revision_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set due date to 3 business days from now
  NEW.due_date = NOW() + INTERVAL '3 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_revision_due_date_trigger
BEFORE INSERT ON public.revision_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_revision_due_date();
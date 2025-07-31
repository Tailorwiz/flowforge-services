-- Add thumbnail and type fields to training_materials
ALTER TABLE public.training_materials 
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN file_type TEXT DEFAULT 'PDF';

-- Update the type column to be more specific
UPDATE public.training_materials SET file_type = type WHERE type IS NOT NULL;
ALTER TABLE public.training_materials DROP COLUMN type;
ALTER TABLE public.training_materials RENAME COLUMN file_type TO type;

-- Create table for client-specific training material access
CREATE TABLE public.client_training_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  training_material_id UUID NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  access_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'package'
  package_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, training_material_id)
);

-- Enable RLS on client_training_access
ALTER TABLE public.client_training_access ENABLE ROW LEVEL SECURITY;

-- Create policies for client_training_access
CREATE POLICY "Admins can manage all client training access" 
ON public.client_training_access 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own training access" 
ON public.client_training_access 
FOR SELECT 
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for training material thumbnails
INSERT INTO storage.buckets (id, name, public) 
VALUES ('training-thumbnails', 'training-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for training thumbnails storage
CREATE POLICY "Anyone can view training thumbnails" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'training-thumbnails');

CREATE POLICY "Admins can upload training thumbnails" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'training-thumbnails' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update training thumbnails" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'training-thumbnails' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete training thumbnails" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'training-thumbnails' AND is_admin(auth.uid()));
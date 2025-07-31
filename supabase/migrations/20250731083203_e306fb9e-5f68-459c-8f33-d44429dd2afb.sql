-- Create storage bucket for training materials
INSERT INTO storage.buckets (id, name, public) VALUES ('training-materials', 'training-materials', true);

-- Create policies for training materials bucket
CREATE POLICY "Training materials are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'training-materials');

CREATE POLICY "Admins can upload training materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'training-materials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update training materials" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'training-materials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete training materials" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'training-materials' AND is_admin(auth.uid()));

-- Update training_materials table to include file_url and file_path
ALTER TABLE public.training_materials 
ADD COLUMN file_path text,
ADD COLUMN file_size integer DEFAULT 0,
ADD COLUMN mime_type text DEFAULT 'application/pdf';
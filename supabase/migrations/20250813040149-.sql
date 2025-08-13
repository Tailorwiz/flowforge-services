-- Create RLS policies for the resumes bucket
-- Allow authenticated users to upload their own resume files
CREATE POLICY "Users can upload to resumes bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to view their own resume files
CREATE POLICY "Users can view their own resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND auth.uid() IS NOT NULL
);

-- Allow admins to view all resume files
CREATE POLICY "Admins can view all resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND is_admin(auth.uid())
);

-- Allow admins to manage all resume files
CREATE POLICY "Admins can manage all resumes"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'resumes' 
  AND is_admin(auth.uid())
);
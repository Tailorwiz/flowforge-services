-- Drop existing policies for resumes bucket
DROP POLICY IF EXISTS "Users can upload to resumes bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all resumes" ON storage.objects;

-- Create new policies for resumes bucket that check client ownership
CREATE POLICY "Users can upload resumes for their clients"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow if the folder matches a client the user owns
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.clients WHERE user_id = auth.uid()
    )
    OR
    -- Allow admins to upload for any client
    is_admin(auth.uid())
  )
);

CREATE POLICY "Users can view resumes for their clients"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow if the folder matches a client the user owns
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.clients WHERE user_id = auth.uid()
    )
    OR
    -- Allow admins to view all
    is_admin(auth.uid())
  )
);

CREATE POLICY "Users can update resumes for their clients"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow if the folder matches a client the user owns
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.clients WHERE user_id = auth.uid()
    )
    OR
    -- Allow admins to update all
    is_admin(auth.uid())
  )
);

CREATE POLICY "Users can delete resumes for their clients"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Allow if the folder matches a client the user owns
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.clients WHERE user_id = auth.uid()
    )
    OR
    -- Allow admins to delete all
    is_admin(auth.uid())
  )
);
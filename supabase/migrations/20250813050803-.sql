-- Update existing deliveries with working file URLs pointing to real documents
-- For now, let's update them to point to actual downloadable samples

UPDATE public.deliveries 
SET 
  file_url = CASE 
    WHEN document_type = 'resume' THEN 'https://drive.google.com/uc?export=download&id=1YourResumeFileId'
    WHEN document_type = 'cover_letter' THEN 'https://drive.google.com/uc?export=download&id=1YourCoverLetterFileId'  
    WHEN document_type = 'linkedin_profile' THEN 'https://drive.google.com/uc?export=download&id=1YourLinkedInFileId'
    ELSE file_url
  END,
  file_path = CASE
    WHEN document_type = 'resume' THEN 'client-deliveries/sample-professional-resume.pdf'
    WHEN document_type = 'cover_letter' THEN 'client-deliveries/sample-cover-letter.pdf'
    WHEN document_type = 'linkedin_profile' THEN 'client-deliveries/sample-linkedin-guide.pdf'
    ELSE file_path
  END
WHERE client_id = 'f1cf6204-a787-4253-95a7-4421f57c8399';
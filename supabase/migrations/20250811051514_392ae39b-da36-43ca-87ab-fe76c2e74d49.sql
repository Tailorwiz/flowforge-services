-- Add missing columns to daily_digest_preferences table
ALTER TABLE public.daily_digest_preferences 
ADD COLUMN IF NOT EXISTS recipient_email TEXT NOT NULL DEFAULT 'admin@resultsdrivenresumes.com';

ALTER TABLE public.daily_digest_preferences 
ADD COLUMN IF NOT EXISTS include_appointments BOOLEAN NOT NULL DEFAULT true;
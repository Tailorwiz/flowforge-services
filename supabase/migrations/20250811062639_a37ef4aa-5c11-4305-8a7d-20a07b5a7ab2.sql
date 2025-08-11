-- First, let's clean up duplicate records, keeping only the most recent one per user
DELETE FROM daily_digest_preferences 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM daily_digest_preferences
  ORDER BY user_id, updated_at DESC
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE daily_digest_preferences 
ADD CONSTRAINT daily_digest_preferences_user_id_unique UNIQUE (user_id);
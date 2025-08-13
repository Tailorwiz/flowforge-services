-- Check and fix RLS policies for messages table
-- First, let's see the current policies and then fix any issues

-- Enable RLS if not already enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Admins can create messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can create messages for their own records" ON public.messages;

-- Create proper policies for message creation
CREATE POLICY "Admins can create messages" ON public.messages
FOR INSERT WITH CHECK (
  is_admin(auth.uid()) AND sender_type = 'admin'
);

CREATE POLICY "Clients can create messages for their own client records" ON public.messages  
FOR INSERT WITH CHECK (
  sender_type = 'client' 
  AND sender_id = auth.uid() 
  AND client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);

-- Ensure the messages table has proper constraints
-- Make sure sender_id is not nullable since RLS depends on it
DO $$
BEGIN
  -- Check if sender_id column allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'sender_id' 
    AND is_nullable = 'YES'
  ) THEN
    -- Make sender_id NOT NULL
    ALTER TABLE public.messages ALTER COLUMN sender_id SET NOT NULL;
  END IF;
END $$;
-- Fix the RLS policies for messages table
-- Drop all existing INSERT policies and recreate them properly
DROP POLICY IF EXISTS "Admins can create messages" ON public.messages;
DROP POLICY IF EXISTS "Clients can create messages for their own records" ON public.messages;
DROP POLICY IF EXISTS "Clients can create messages for their own client records" ON public.messages;

-- Create correct policies for message creation
CREATE POLICY "Admins can create messages" ON public.messages
FOR INSERT WITH CHECK (
  is_admin(auth.uid()) AND sender_type = 'admin'
);

CREATE POLICY "Clients can create messages" ON public.messages  
FOR INSERT WITH CHECK (
  sender_type = 'client' 
  AND sender_id = auth.uid() 
  AND client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);
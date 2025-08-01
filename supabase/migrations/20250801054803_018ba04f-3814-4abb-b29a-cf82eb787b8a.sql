-- Fix RLS policy for client_history to allow users to insert their own records
-- This will allow users to insert client history records for clients they own

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can create their own client history" ON public.client_history;

-- Create new policy to allow users to insert client history for their own clients
CREATE POLICY "Users can create their own client history" 
ON public.client_history 
FOR INSERT 
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- Also ensure users can update their client records
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own client record" ON public.clients;

-- Create policy to allow users to update their own client records
CREATE POLICY "Users can update their own client record" 
ON public.clients 
FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());
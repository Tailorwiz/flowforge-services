-- Add RLS policies for deliveries table to ensure customers can see their deliveries
-- and add some debugging policies

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON deliveries;

-- Recreate admin policy
CREATE POLICY "Admins can manage all deliveries" ON deliveries
  FOR ALL 
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Recreate user policy with better error handling
CREATE POLICY "Users can view their own deliveries" ON deliveries
  FOR SELECT 
  TO public
  USING (
    client_id IN (
      SELECT c.id 
      FROM clients c 
      WHERE c.user_id = auth.uid()
    )
  );

-- Add policy for users to update delivery status (for approvals)
CREATE POLICY "Users can update their own delivery status" ON deliveries
  FOR UPDATE 
  TO public
  USING (
    client_id IN (
      SELECT c.id 
      FROM clients c 
      WHERE c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT c.id 
      FROM clients c 
      WHERE c.user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
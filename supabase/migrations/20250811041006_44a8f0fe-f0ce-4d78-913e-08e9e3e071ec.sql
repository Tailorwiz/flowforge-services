-- Create messages table for client-admin communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'client')),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  attachment_url TEXT,
  attachment_name TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for message access
CREATE POLICY "Admins can view all messages" 
ON public.messages 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Clients can view their own messages" 
ON public.messages 
FOR SELECT 
USING (client_id IN (
  SELECT id FROM clients WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can create messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()) AND sender_type = 'admin');

CREATE POLICY "Clients can create messages for their own records" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'client' 
  AND sender_id = auth.uid() 
  AND client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own message read status" 
ON public.messages 
FOR UPDATE 
USING (
  (is_admin(auth.uid()) AND sender_type = 'client') OR
  (sender_id = auth.uid() AND sender_type = 'client') OR
  (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) AND sender_type = 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
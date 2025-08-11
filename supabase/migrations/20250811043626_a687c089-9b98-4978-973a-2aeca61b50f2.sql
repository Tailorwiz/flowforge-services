-- Create a function to send message notifications
CREATE OR REPLACE FUNCTION public.send_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function to send email notifications
  PERFORM net.http_post(
    url := 'https://gxatnnzwaggcvzzurgsq.supabase.co/functions/v1/send-message-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body := json_build_object('record', row_to_json(NEW))::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire after message insert
DROP TRIGGER IF EXISTS send_message_notification_trigger ON public.messages;
CREATE TRIGGER send_message_notification_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_notification();
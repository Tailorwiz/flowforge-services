-- Temporarily disable the message notification trigger to test message insertion
DROP TRIGGER IF EXISTS send_message_notification_trigger ON public.messages;
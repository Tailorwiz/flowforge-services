-- Fix client_history table metadata column
ALTER TABLE public.client_history ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update trigger for client_history timestamps
CREATE OR REPLACE FUNCTION public.update_client_history_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_history_updated_at
  BEFORE UPDATE ON public.client_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_history_updated_at();
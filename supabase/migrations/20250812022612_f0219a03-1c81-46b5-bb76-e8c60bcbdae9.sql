-- Update the delete function to also handle standalone user deletion
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  -- Delete all client records for this user
  DELETE FROM public.client_training_access WHERE client_id IN (
    SELECT id FROM public.clients WHERE user_id = user_id_param
  );
  
  DELETE FROM public.client_tasks WHERE client_id IN (
    SELECT id FROM public.clients WHERE user_id = user_id_param
  );
  
  DELETE FROM public.delivery_comments WHERE client_id IN (
    SELECT id FROM public.clients WHERE user_id = user_id_param
  );
  
  DELETE FROM public.revision_requests WHERE client_id IN (
    SELECT id FROM public.clients WHERE user_id = user_id_param
  );
  
  DELETE FROM public.messages WHERE client_id IN (
    SELECT id FROM public.clients WHERE user_id = user_id_param
  );
  
  DELETE FROM public.intake_form_drafts WHERE user_id = user_id_param;
  
  DELETE FROM public.scheduled_reminders WHERE client_id IN (
    SELECT id FROM public.clients WHERE user_id = user_id_param
  );
  
  DELETE FROM public.client_history WHERE client_id IN (
    SELECT id FROM public.clients WHERE user_id = user_id_param
  );
  
  -- Delete client records
  DELETE FROM public.clients WHERE user_id = user_id_param;
  
  -- Delete user data
  DELETE FROM public.profiles WHERE id = user_id_param;
  DELETE FROM public.user_roles WHERE user_id = user_id_param;
  DELETE FROM public.resumes WHERE user_id = user_id_param;
  DELETE FROM public.saved_job_descriptions WHERE user_id = user_id_param;
  DELETE FROM public.resume_match_tests WHERE user_id = user_id_param;
  DELETE FROM public.search_events WHERE user_id = user_id_param;
  
  -- Return success
  RETURN json_build_object(
    'success', true, 
    'deleted_user_id', user_id_param,
    'message', 'User and all associated data deleted completely'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;
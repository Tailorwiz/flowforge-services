-- Create a comprehensive customer deletion function
CREATE OR REPLACE FUNCTION public.delete_customer_completely(client_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record RECORD;
  user_id_to_delete UUID;
  result JSON;
BEGIN
  -- Get the client record and associated user_id
  SELECT * INTO client_record FROM public.clients WHERE id = client_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Client not found');
  END IF;
  
  user_id_to_delete := client_record.user_id;
  
  -- Delete all related data in the correct order to avoid foreign key constraints
  
  -- Delete client training access
  DELETE FROM public.client_training_access WHERE client_id = client_id_param;
  
  -- Delete client tasks
  DELETE FROM public.client_tasks WHERE client_id = client_id_param;
  
  -- Delete delivery comments
  DELETE FROM public.delivery_comments WHERE client_id = client_id_param;
  
  -- Delete revision requests  
  DELETE FROM public.revision_requests WHERE client_id = client_id_param;
  
  -- Delete messages
  DELETE FROM public.messages WHERE client_id = client_id_param;
  
  -- Delete intake form drafts
  DELETE FROM public.intake_form_drafts WHERE client_id = client_id_param;
  
  -- Delete scheduled reminders
  DELETE FROM public.scheduled_reminders WHERE client_id = client_id_param;
  
  -- Delete client history
  DELETE FROM public.client_history WHERE client_id = client_id_param;
  
  -- Delete the main client record
  DELETE FROM public.clients WHERE id = client_id_param;
  
  -- If there's an associated user account, delete user data
  IF user_id_to_delete IS NOT NULL THEN
    -- Delete user profile
    DELETE FROM public.profiles WHERE id = user_id_to_delete;
    
    -- Delete user roles
    DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
    
    -- Delete user resumes
    DELETE FROM public.resumes WHERE user_id = user_id_to_delete;
    
    -- Delete saved job descriptions
    DELETE FROM public.saved_job_descriptions WHERE user_id = user_id_to_delete;
    
    -- Delete resume match tests
    DELETE FROM public.resume_match_tests WHERE user_id = user_id_to_delete;
    
    -- Delete search events
    DELETE FROM public.search_events WHERE user_id = user_id_to_delete;
    
    -- Delete the auth user (this will cascade to remove login credentials)
    -- Note: This requires admin privileges and should be done via admin API
    -- We'll return the user_id so the frontend can handle this
  END IF;
  
  -- Return success with user_id for auth deletion
  RETURN json_build_object(
    'success', true, 
    'deleted_client_id', client_id_param,
    'user_id_to_delete', user_id_to_delete,
    'client_email', client_record.email,
    'client_name', client_record.name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;
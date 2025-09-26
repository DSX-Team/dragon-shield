-- Fix remaining database functions with search_path issues
CREATE OR REPLACE FUNCTION public.get_user_statistics(user_uuid uuid)
 RETURNS TABLE(total_connections bigint, active_connections bigint, total_bandwidth bigint, last_activity timestamp with time zone, most_used_ip inet)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    -- Only allow admin users or the user themselves to access statistics
    IF get_user_role(auth.uid()) != 'admin' AND auth.uid() != user_uuid THEN
        RAISE EXCEPTION 'Access denied. Admin privileges or own account required.';
    END IF;

    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.user_connections WHERE user_id = user_uuid)::bigint as total_connections,
        (SELECT COUNT(*) FROM public.user_connections WHERE user_id = user_uuid AND is_active = true)::bigint as active_connections,
        (SELECT COALESCE(SUM(bytes_transferred), 0) FROM public.user_connections WHERE user_id = user_uuid)::bigint as total_bandwidth,
        (SELECT MAX(connected_at) FROM public.user_connections WHERE user_id = user_uuid) as last_activity,
        (SELECT ip_address FROM public.user_connections WHERE user_id = user_uuid GROUP BY ip_address ORDER BY COUNT(*) DESC LIMIT 1) as most_used_ip;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(total_users bigint, active_users bigint, admin_users bigint, active_channels bigint, active_subscriptions bigint, active_streams bigint, active_sessions bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    -- Only allow admin users to access this function
    IF public.get_user_role(auth.uid()) != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
        (SELECT COUNT(*) FROM public.profiles WHERE status = 'active')::BIGINT as active_users,
        (SELECT COUNT(*) FROM public.profiles WHERE 'admin' = ANY(roles))::BIGINT as admin_users,
        (SELECT COUNT(*) FROM public.channels WHERE active = true)::BIGINT as active_channels,
        (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active')::BIGINT as active_subscriptions,
        (SELECT COUNT(*) FROM public.streams WHERE state IN ('starting', 'running'))::BIGINT as active_streams,
        (SELECT COUNT(*) FROM public.sessions WHERE end_time IS NULL)::BIGINT as active_sessions;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_available_servers()
 RETURNS TABLE(server_id uuid, current_clients integer, max_clients integer, load_percentage numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    id as server_id,
    current_clients,
    max_clients,
    CASE 
      WHEN max_clients > 0 THEN ROUND((current_clients::DECIMAL / max_clients::DECIMAL) * 100, 2)
      ELSE 0::DECIMAL
    END as load_percentage
  FROM public.streaming_servers
  WHERE active = true 
    AND status = 'online'
    AND current_clients < max_clients
  ORDER BY load_percentage ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_server_connection_details(server_uuid uuid)
 RETURNS TABLE(hostname character varying, ip_address inet, port integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- Only allow admin users to access connection details
  SELECT 
    s.hostname,
    s.ip_address,
    s.port
  FROM public.streaming_servers s
  WHERE s.id = server_uuid
    AND s.active = true
    AND get_user_role(auth.uid()) = 'admin';
$function$;

CREATE OR REPLACE FUNCTION public.validate_server_access(server_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    -- Only allow admin users to access server operations
    IF get_user_role(auth.uid()) != 'admin' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if server exists and is accessible
    IF NOT EXISTS (
        SELECT 1 FROM public.streaming_servers 
        WHERE id = server_uuid AND active = true
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_admin_if_none_exists()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Check if any admin users exist
    SELECT COUNT(*) INTO admin_count 
    FROM public.profiles 
    WHERE 'admin' = ANY(roles);
    
    -- If no admin exists, we'll let the application handle creating one
    -- This function is mainly for reference and future automation
    RETURN admin_count = 0;
END;
$function$;
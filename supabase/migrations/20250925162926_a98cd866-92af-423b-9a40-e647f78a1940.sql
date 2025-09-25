-- Final Security Fixes

-- 1. Fix the Security Definer View issue by setting security_invoker = true
ALTER VIEW public.safe_profiles SET (security_invoker = true);

-- 2. Find and fix any remaining functions without search_path
-- Let's update all remaining functions that might be missing search_path

-- Fix the generate_api_password function if it exists
CREATE OR REPLACE FUNCTION public.generate_api_password()
RETURNS text AS $$
DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, (random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix handle_new_user function if it exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_count INTEGER;
    user_roles TEXT[] := ARRAY['user'];
BEGIN
    -- Check if this is the first user (excluding system accounts)
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- If this is the first user, make them an admin
    IF user_count = 0 THEN
        user_roles := ARRAY['admin', 'user'];
    END IF;

    INSERT INTO public.profiles (user_id, username, email, roles)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        user_roles
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_user_statistics function if it exists
CREATE OR REPLACE FUNCTION public.get_user_statistics(user_uuid uuid)
RETURNS TABLE(total_connections bigint, active_connections bigint, total_bandwidth bigint, last_activity timestamp with time zone, most_used_ip inet) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix create_default_admin_if_none_exists function if it exists
CREATE OR REPLACE FUNCTION public.create_default_admin_if_none_exists()
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_admin_dashboard_stats function if it exists
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(total_users bigint, active_users bigint, admin_users bigint, active_channels bigint, active_subscriptions bigint, active_streams bigint, active_sessions bigint) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_available_servers function if it exists
CREATE OR REPLACE FUNCTION public.get_available_servers()
RETURNS TABLE(server_id uuid, current_clients integer, max_clients integer, load_percentage numeric) AS $$
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
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Fix get_server_connection_details function if it exists
CREATE OR REPLACE FUNCTION public.get_server_connection_details(server_uuid uuid)
RETURNS TABLE(hostname character varying, ip_address inet, port integer) AS $$
  -- Only allow admin users to access connection details
  SELECT 
    s.hostname,
    s.ip_address,
    s.port
  FROM public.streaming_servers s
  WHERE s.id = server_uuid
    AND s.active = true
    AND get_user_role(auth.uid()) = 'admin';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Fix validate_server_access function if it exists
CREATE OR REPLACE FUNCTION public.validate_server_access(server_uuid uuid)
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Add final documentation
COMMENT ON VIEW public.safe_profiles IS 'SECURITY: Safe profile view with security_invoker enabled to use caller permissions rather than definer permissions';
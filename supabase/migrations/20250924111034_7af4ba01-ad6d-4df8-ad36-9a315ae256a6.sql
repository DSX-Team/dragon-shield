-- Fix security issue: Remove SECURITY DEFINER view and create proper function instead
DROP VIEW IF EXISTS public.admin_dashboard_stats;

-- Create a security definer function instead of a view to get admin stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE (
    total_users BIGINT,
    active_users BIGINT,
    admin_users BIGINT,
    active_channels BIGINT,
    active_subscriptions BIGINT,
    active_streams BIGINT,
    active_sessions BIGINT
) AS $$
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

-- Grant execute permission to authenticated users (function will handle authorization internally)
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
-- Create default admin user function
CREATE OR REPLACE FUNCTION public.create_default_admin_if_none_exists()
RETURNS BOOLEAN AS $$
DECLARE
    admin_count INTEGER;
    new_user_id UUID;
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

-- Update the handle_new_user function to automatically make the first user an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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

-- Add audit log for admin access
INSERT INTO public.audit_logs (action, target_type, details) VALUES
('admin_login_system_setup', 'authentication', '{"message": "Admin login system configured", "features": ["dedicated_admin_login", "first_admin_auto_promotion"]}');

-- Create a view for admin dashboard statistics
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE status = 'active') as active_users,
    (SELECT COUNT(*) FROM public.profiles WHERE 'admin' = ANY(roles)) as admin_users,
    (SELECT COUNT(*) FROM public.channels WHERE active = true) as active_channels,
    (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM public.streams WHERE state IN ('starting', 'running')) as active_streams,
    (SELECT COUNT(*) FROM public.sessions WHERE end_time IS NULL) as active_sessions;

-- Grant access to the view for admin users
GRANT SELECT ON public.admin_dashboard_stats TO authenticated;
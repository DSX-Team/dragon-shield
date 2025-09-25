-- Security Enhancement: Protect Customer Personal Data (Corrected)

-- 1. Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create encryption functions for API passwords
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
RETURNS text AS $$
BEGIN
    RETURN crypt(data, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.verify_encrypted_data(data text, encrypted_hash text)
RETURNS boolean AS $$
BEGIN
    RETURN encrypted_hash = crypt(data, encrypted_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Strengthen RLS policies for profiles table
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Deny all anonymous access to profiles
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- Recreate user access policies with proper restrictions
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles only" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin access with proper audit logging
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles with restrictions" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- 4. Secure streaming servers table completely
DROP POLICY IF EXISTS "Authenticated admin users can view streaming servers for load b" ON public.streaming_servers;
DROP POLICY IF EXISTS "Admins can manage all streaming servers" ON public.streaming_servers;

-- Only admins can access streaming servers
CREATE POLICY "Only admins can access streaming servers" 
ON public.streaming_servers 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Deny all anonymous access to streaming servers
CREATE POLICY "Deny anonymous access to streaming servers" 
ON public.streaming_servers 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- 5. Secure sessions table
CREATE POLICY "Deny anonymous access to sessions" 
ON public.sessions 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- Update session policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions only" 
ON public.sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
CREATE POLICY "Users can insert own sessions only" 
ON public.sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.sessions;
CREATE POLICY "Admins can manage sessions" 
ON public.sessions 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- 6. Create secure API password management
CREATE OR REPLACE FUNCTION public.generate_and_store_api_password(user_profile_id uuid)
RETURNS text AS $$
DECLARE
    raw_password text;
    encrypted_password text;
    profile_user_id uuid;
BEGIN
    -- Get the user_id for this profile
    SELECT user_id INTO profile_user_id FROM public.profiles WHERE id = user_profile_id;
    
    -- Security check: only allow users to generate their own API password or admins
    IF NOT (auth.uid() = profile_user_id OR get_user_role(auth.uid()) = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Can only generate API password for own profile.';
    END IF;
    
    -- Generate secure random password
    raw_password := public.generate_api_password();
    
    -- Encrypt the password
    encrypted_password := public.encrypt_sensitive_data(raw_password);
    
    -- Update profile with encrypted password
    UPDATE public.profiles 
    SET api_password = encrypted_password,
        updated_at = now()
    WHERE id = user_profile_id;
    
    -- Audit log the action
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        auth.uid(),
        'API_PASSWORD_GENERATED',
        'profile',
        user_profile_id,
        jsonb_build_object('timestamp', now(), 'by_admin', get_user_role(auth.uid()) = 'admin')
    );
    
    RETURN raw_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create secure API password verification
CREATE OR REPLACE FUNCTION public.verify_api_password(username_input text, password_input text)
RETURNS boolean AS $$
DECLARE
    stored_hash text;
    profile_id uuid;
    is_valid boolean;
BEGIN
    -- Get encrypted password hash and profile ID
    SELECT api_password, id INTO stored_hash, profile_id
    FROM public.profiles 
    WHERE username = username_input AND status = 'active';
    
    -- Return false if no user found or no password set
    IF stored_hash IS NULL THEN
        is_valid := false;
    ELSE
        -- Verify password against hash
        is_valid := public.verify_encrypted_data(password_input, stored_hash);
    END IF;
    
    -- Audit log all authentication attempts
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_type,
        target_id,
        details,
        ip_address
    ) VALUES (
        NULL, -- No authenticated user for API auth
        'API_AUTH_ATTEMPT',
        'profile',
        profile_id,
        jsonb_build_object(
            'username', username_input,
            'timestamp', now(),
            'success', is_valid
        ),
        inet_client_addr()
    );
    
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create audit trigger for profile modifications
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger AS $$
BEGIN
    -- Log admin access to other users' profiles
    IF get_user_role(auth.uid()) = 'admin' AND auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
        INSERT INTO public.audit_logs (
            actor_id,
            action,
            target_type,
            target_id,
            details
        ) VALUES (
            auth.uid(),
            'ADMIN_PROFILE_' || TG_OP,
            'profile',
            COALESCE(NEW.id, OLD.id),
            jsonb_build_object(
                'operation', TG_OP,
                'timestamp', now(),
                'target_user', COALESCE(NEW.user_id, OLD.user_id)
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for profile changes
DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_profile_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();

-- 9. Create safe view for profile data (excludes sensitive fields)
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
    id,
    user_id,
    username,
    email,
    roles,
    status,
    max_connections,
    is_trial,
    trial_expires_at,
    credits,
    created_at,
    updated_at,
    country_code,
    timezone,
    notes,
    -- Indicate if API password exists without revealing it
    (api_password IS NOT NULL) as has_api_password
FROM public.profiles;

-- Set security barrier on the view
ALTER VIEW public.safe_profiles SET (security_barrier = true);

-- Grant access to authenticated users
GRANT SELECT ON public.safe_profiles TO authenticated;

-- 10. Add security documentation
COMMENT ON COLUMN public.profiles.api_password IS 'SECURITY: Encrypted API password - use generate_and_store_api_password() function';
COMMENT ON COLUMN public.profiles.last_ip IS 'SECURITY: PII - User IP address for security monitoring only';
COMMENT ON COLUMN public.profiles.allowed_ips IS 'SECURITY: Sensitive - IP access control list';
COMMENT ON COLUMN public.profiles.banned_ips IS 'SECURITY: Sensitive - Banned IP addresses';
COMMENT ON VIEW public.safe_profiles IS 'SECURITY: Safe profile view excluding sensitive fields';

-- 11. Encrypt existing plain-text API passwords
UPDATE public.profiles 
SET api_password = public.encrypt_sensitive_data(api_password),
    updated_at = now()
WHERE api_password IS NOT NULL 
  AND LENGTH(api_password) < 60 -- Encrypted passwords are typically longer
  AND api_password NOT LIKE '$2%'; -- Skip already encrypted passwords (bcrypt format)
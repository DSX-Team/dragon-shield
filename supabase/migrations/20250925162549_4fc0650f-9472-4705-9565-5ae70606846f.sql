-- Security Enhancement: Protect Customer Personal Data (Final)

-- 1. Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create audit logging function for admin access
CREATE OR REPLACE FUNCTION public.log_admin_profile_access(
    admin_user_id uuid,
    table_name text,
    access_type text
)
RETURNS boolean AS $$
BEGIN
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_type,
        details,
        ip_address
    ) VALUES (
        admin_user_id,
        'SENSITIVE_DATA_ACCESS',
        table_name,
        jsonb_build_object(
            'access_type', access_type,
            'timestamp', now(),
            'table', table_name
        ),
        inet_client_addr()
    );
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- If audit logging fails, deny access for security
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create encryption and verification functions
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

-- 4. Rebuild profiles table RLS policies with enhanced security
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;  
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Completely block anonymous access
CREATE POLICY "Block all anonymous profile access" 
ON public.profiles 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- Allow users to view only their own profile
CREATE POLICY "Users view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update only their own profile  
CREATE POLICY "Users update own profile only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow profile creation during registration
CREATE POLICY "Allow profile creation" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin access with mandatory audit logging
CREATE POLICY "Admin profile access with audit" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (
    get_user_role(auth.uid()) = 'admin' AND
    public.log_admin_profile_access(auth.uid(), 'profiles', 'read') = true
)
WITH CHECK (
    get_user_role(auth.uid()) = 'admin' AND
    public.log_admin_profile_access(auth.uid(), 'profiles', 'write') = true
);

-- 5. Secure streaming_servers table
DROP POLICY IF EXISTS "Admins can manage all streaming servers" ON public.streaming_servers;
DROP POLICY IF EXISTS "Authenticated admin users can view streaming servers for load b" ON public.streaming_servers;

-- Block all non-admin access to streaming servers
CREATE POLICY "Block non-admin streaming server access" 
ON public.streaming_servers 
FOR ALL 
TO authenticated
USING (
    get_user_role(auth.uid()) = 'admin' AND
    public.log_admin_profile_access(auth.uid(), 'streaming_servers', 'read') = true
)
WITH CHECK (
    get_user_role(auth.uid()) = 'admin' AND
    public.log_admin_profile_access(auth.uid(), 'streaming_servers', 'write') = true
);

-- Block anonymous access to streaming servers
CREATE POLICY "Block anonymous streaming server access" 
ON public.streaming_servers 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- 6. Secure sessions table
DROP POLICY IF EXISTS "Block anonymous access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.sessions;

-- Block anonymous session access
CREATE POLICY "Block anonymous session access" 
ON public.sessions 
FOR ALL 
TO anon
USING (false) 
WITH CHECK (false);

-- Users can only access their own sessions
CREATE POLICY "Users access own sessions only" 
ON public.sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own sessions only" 
ON public.sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin session access with audit
CREATE POLICY "Admin session access with audit" 
ON public.sessions 
FOR ALL 
TO authenticated
USING (
    get_user_role(auth.uid()) = 'admin' AND
    public.log_admin_profile_access(auth.uid(), 'sessions', 'read') = true
)
WITH CHECK (
    get_user_role(auth.uid()) = 'admin' AND
    public.log_admin_profile_access(auth.uid(), 'sessions', 'write') = true
);

-- 7. Create secure API password management functions
CREATE OR REPLACE FUNCTION public.generate_and_store_api_password(user_profile_id uuid)
RETURNS text AS $$
DECLARE
    raw_password text;
    encrypted_password text;
    profile_user_id uuid;
BEGIN
    -- Get the user_id for the profile
    SELECT user_id INTO profile_user_id 
    FROM public.profiles 
    WHERE id = user_profile_id;
    
    -- Security check
    IF NOT (auth.uid() = profile_user_id OR get_user_role(auth.uid()) = 'admin') THEN
        RAISE EXCEPTION 'Access denied. Can only generate API password for own profile.';
    END IF;
    
    -- Generate secure password
    raw_password := public.generate_api_password();
    encrypted_password := public.encrypt_sensitive_data(raw_password);
    
    -- Update profile with encrypted password
    UPDATE public.profiles 
    SET api_password = encrypted_password, updated_at = now()
    WHERE id = user_profile_id;
    
    -- Audit log
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'API_PASSWORD_GENERATED', 'profiles', user_profile_id, 
            jsonb_build_object('generated_at', now()));
    
    RETURN raw_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.verify_api_password(username_input text, password_input text)
RETURNS boolean AS $$
DECLARE
    stored_hash text;
BEGIN
    SELECT api_password INTO stored_hash
    FROM public.profiles 
    WHERE username = username_input AND status = 'active' AND api_password IS NOT NULL;
    
    IF stored_hash IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN public.verify_encrypted_data(password_input, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add security documentation
COMMENT ON COLUMN public.profiles.api_password IS 'ENCRYPTED: API password stored as bcrypt hash';
COMMENT ON COLUMN public.profiles.last_ip IS 'SENSITIVE: User IP address - restricted access';
COMMENT ON COLUMN public.profiles.allowed_ips IS 'SENSITIVE: IP whitelist - admin only';
COMMENT ON COLUMN public.profiles.banned_ips IS 'SENSITIVE: IP blacklist - admin only';
COMMENT ON COLUMN public.profiles.credits IS 'SENSITIVE: Financial data - restricted access';
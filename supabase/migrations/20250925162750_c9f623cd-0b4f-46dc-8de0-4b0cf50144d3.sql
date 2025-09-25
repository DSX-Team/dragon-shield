-- Fix Security Linter Issues (Corrected)

-- 1. Fix the safe_profiles view without RLS policies (views can't have RLS)
DROP VIEW IF EXISTS public.safe_profiles;

-- Create a simple view that relies on the underlying table's RLS policies
CREATE VIEW public.safe_profiles AS
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

-- Grant access to authenticated users
GRANT SELECT ON public.safe_profiles TO authenticated;

-- 2. Fix Function Search Path Mutable warnings by setting search_path
-- Update all security functions to have proper search_path

-- Fix encrypt_sensitive_data function
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
RETURNS text AS $$
BEGIN
    RETURN crypt(data, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix verify_encrypted_data function  
CREATE OR REPLACE FUNCTION public.verify_encrypted_data(data text, encrypted_hash text)
RETURNS boolean AS $$
BEGIN
    RETURN encrypted_hash = crypt(data, encrypted_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix generate_and_store_api_password function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix verify_api_password function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix audit_profile_changes function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the update_updated_at_column function as well
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update other existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT roles[1] FROM public.profiles WHERE user_id = user_uuid), 
    'user'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Add comments for documentation
COMMENT ON VIEW public.safe_profiles IS 'SECURITY: Safe profile view excluding sensitive fields like IP addresses and encrypted passwords';
COMMENT ON FUNCTION public.encrypt_sensitive_data IS 'SECURITY: Encrypts sensitive data using bcrypt';
COMMENT ON FUNCTION public.verify_encrypted_data IS 'SECURITY: Verifies encrypted data against hash';
COMMENT ON FUNCTION public.generate_and_store_api_password IS 'SECURITY: Securely generates and stores encrypted API passwords';
COMMENT ON FUNCTION public.verify_api_password IS 'SECURITY: Verifies API passwords with audit logging';
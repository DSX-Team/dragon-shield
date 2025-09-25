-- Fix security issues with database functions by setting search_path
-- This addresses the "Function Search Path Mutable" warning

-- Update all database functions to have proper search_path set
CREATE OR REPLACE FUNCTION public.generate_api_password()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN crypt(data, gen_salt('bf', 8));
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_encrypted_data(data text, encrypted_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN encrypted_hash = crypt(data, encrypted_hash);
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_and_store_api_password(user_profile_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.verify_api_password(username_input text, password_input text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;
-- Fix security issue: Add explicit policies to block anonymous access to sensitive data

-- Add explicit policy to block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false);

-- Add explicit policy to block anonymous access to sessions table  
CREATE POLICY "Block anonymous access to sessions"
ON public.sessions
FOR ALL 
TO anon
USING (false);

-- Add audit log entry for security fix
INSERT INTO public.audit_logs (
    action,
    target_type, 
    details,
    actor_id
) VALUES (
    'security_policy_added',
    'rls_policy',
    '{"description": "Added explicit deny policies for anonymous access to profiles and sessions tables", "tables": ["profiles", "sessions"], "security_issue": "PUBLIC_USER_DATA, EXPOSED_SENSITIVE_DATA"}'::jsonb,
    NULL
);
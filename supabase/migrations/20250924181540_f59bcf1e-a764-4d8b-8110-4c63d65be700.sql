-- Remove dangerous SSH credentials from streaming_servers table
-- These will be managed securely through encrypted edge functions

-- First, let's add a server_key field to identify servers for credential lookup
ALTER TABLE public.streaming_servers 
ADD COLUMN IF NOT EXISTS server_key VARCHAR(255);

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'streaming_servers_server_key_key' 
        AND table_name = 'streaming_servers'
    ) THEN
        ALTER TABLE public.streaming_servers ADD CONSTRAINT streaming_servers_server_key_key UNIQUE (server_key);
    END IF;
END $$;

-- Generate unique server keys for existing servers that don't have them
UPDATE public.streaming_servers 
SET server_key = 'server_' || LOWER(REPLACE(name, ' ', '_')) || '_' || SUBSTRING(id::text, 1, 8)
WHERE server_key IS NULL;

-- Make server_key required if not already
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_servers' 
        AND column_name = 'server_key' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.streaming_servers ALTER COLUMN server_key SET NOT NULL;
    END IF;
END $$;

-- Remove the dangerous credential fields if they exist
ALTER TABLE public.streaming_servers 
DROP COLUMN IF EXISTS ssh_password,
DROP COLUMN IF EXISTS ssh_key;

-- Add audit logging for credential access
CREATE TABLE IF NOT EXISTS public.server_credential_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.streaming_servers(id),
    accessed_by UUID NOT NULL,
    access_type VARCHAR(50) NOT NULL, -- 'connection', 'management', 'health_check'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on credential access log
ALTER TABLE public.server_credential_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view credential access logs
DROP POLICY IF EXISTS "Admins can view credential access logs" ON public.server_credential_access_log;
CREATE POLICY "Admins can view credential access logs" ON public.server_credential_access_log
FOR SELECT 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- System can log credential access
DROP POLICY IF EXISTS "System can log credential access" ON public.server_credential_access_log;
CREATE POLICY "System can log credential access" ON public.server_credential_access_log
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_server_credential_access_log_server_id ON public.server_credential_access_log(server_id);
CREATE INDEX IF NOT EXISTS idx_server_credential_access_log_accessed_by ON public.server_credential_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_server_credential_access_log_created_at ON public.server_credential_access_log(created_at);
CREATE INDEX IF NOT EXISTS idx_streaming_servers_server_key ON public.streaming_servers(server_key);
CREATE INDEX IF NOT EXISTS idx_streaming_servers_active_status ON public.streaming_servers(active, status);

-- Create function to validate server access
CREATE OR REPLACE FUNCTION public.validate_server_access(server_uuid UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
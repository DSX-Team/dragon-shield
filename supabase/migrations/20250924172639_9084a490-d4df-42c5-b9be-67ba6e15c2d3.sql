-- Fix security vulnerability in streaming_servers table
-- Remove the overly permissive policy that exposes server details to unauthorized users

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "System can view streaming servers for load balancing" ON public.streaming_servers;

-- Create a more secure policy for load balancing that only exposes minimal necessary information
-- This policy should only be accessible by authenticated admin users or specific service accounts
CREATE POLICY "Authenticated admin users can view streaming servers for load balancing" 
ON public.streaming_servers 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND get_user_role(auth.uid()) = 'admin'
  AND active = true 
  AND status = 'online'
);

-- Create a separate function for load balancing that only exposes minimal server info
-- This function will be used by edge functions for load balancing without exposing sensitive details
CREATE OR REPLACE FUNCTION public.get_available_servers()
RETURNS TABLE(
  server_id UUID,
  current_clients INTEGER,
  max_clients INTEGER,
  load_percentage DECIMAL
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permission to authenticated users (this will be used by edge functions)
GRANT EXECUTE ON FUNCTION public.get_available_servers() TO authenticated;

-- Create a secure function for getting server connection details (admin only)
CREATE OR REPLACE FUNCTION public.get_server_connection_details(server_uuid UUID)
RETURNS TABLE(
  hostname VARCHAR,
  ip_address INET,
  port INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admin users to access connection details
  SELECT 
    s.hostname,
    s.ip_address,
    s.port
  FROM public.streaming_servers s
  WHERE s.id = server_uuid
    AND s.active = true
    AND get_user_role(auth.uid()) = 'admin';
$$;

-- Grant execute permission only to authenticated users (with admin check inside function)
GRANT EXECUTE ON FUNCTION public.get_server_connection_details(UUID) TO authenticated;
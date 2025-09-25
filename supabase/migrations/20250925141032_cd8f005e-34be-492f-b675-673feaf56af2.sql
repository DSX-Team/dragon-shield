-- Enhance user profiles table for complete Xtream Codes functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_connections integer DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allowed_ips text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_ips text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_expires_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ip inet;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_bandwidth_used bigint DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_bandwidth_limit bigint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code varchar(2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone varchar(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reseller_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_password varchar(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bouquet_ids uuid[];

-- Create user connections tracking table
CREATE TABLE IF NOT EXISTS public.user_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    ip_address inet NOT NULL,
    user_agent text,
    connected_at timestamp with time zone DEFAULT now(),
    disconnected_at timestamp with time zone,
    duration_seconds integer,
    bytes_transferred bigint DEFAULT 0,
    stream_type varchar(20), -- 'live', 'vod', 'series'
    channel_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Create user activity logs table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    action varchar(50) NOT NULL, -- 'login', 'logout', 'stream_start', 'stream_end', 'password_change', etc.
    ip_address inet,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb,
    timestamp timestamp with time zone DEFAULT now()
);

-- Create reseller accounts table
CREATE TABLE IF NOT EXISTS public.resellers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    credits numeric DEFAULT 0,
    credit_price numeric DEFAULT 1.0,
    allowed_packages uuid[],
    max_users integer DEFAULT 100,
    created_users integer DEFAULT 0,
    commission_rate numeric DEFAULT 0.1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create bouquets table for grouping channels
CREATE TABLE IF NOT EXISTS public.bouquets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    description text,
    channel_ids uuid[],
    is_adult boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON public.user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON public.user_connections(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON public.user_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_profiles_reseller_id ON public.profiles(reseller_id);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);

-- Add triggers for updated_at
CREATE TRIGGER update_resellers_updated_at
    BEFORE UPDATE ON public.resellers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bouquets_updated_at
    BEFORE UPDATE ON public.bouquets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bouquets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own connections" 
ON public.user_connections 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE user_id = user_connections.user_id));

CREATE POLICY "Admins can manage all connections" 
ON public.user_connections 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can insert connections" 
ON public.user_connections 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view own activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE user_id = user_activity_logs.user_id));

CREATE POLICY "Admins can manage all activity logs" 
ON public.user_activity_logs 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can insert activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage resellers" 
ON public.resellers 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Resellers can view own data" 
ON public.resellers 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE user_id = resellers.user_id));

CREATE POLICY "Admins can manage bouquets" 
ON public.bouquets 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can view bouquets" 
ON public.bouquets 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_statistics(user_uuid uuid)
RETURNS TABLE(
    total_connections bigint,
    active_connections bigint,
    total_bandwidth bigint,
    last_activity timestamp with time zone,
    most_used_ip inet
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to generate API password
CREATE OR REPLACE FUNCTION public.generate_api_password()
RETURNS text
LANGUAGE plpgsql
AS $$
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
$$;
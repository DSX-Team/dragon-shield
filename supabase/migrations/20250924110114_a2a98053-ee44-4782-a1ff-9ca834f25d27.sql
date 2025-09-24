-- Add sample channels for demonstration
INSERT INTO public.channels (name, category, upstream_sources, logo_url, epg_id, active, package_ids) VALUES 
('CNN International', 'News', '["rtmp://source1.example.com/live/cnn", "https://source2.example.com/cnn.m3u8"]', 'https://example.com/logos/cnn.png', 'cnn-intl', true, '{}'),
('BBC World News', 'News', '["rtmp://source1.example.com/live/bbc", "https://source2.example.com/bbc.m3u8"]', 'https://example.com/logos/bbc.png', 'bbc-world', true, '{}'),
('ESPN', 'Sports', '["rtmp://source1.example.com/live/espn", "https://source2.example.com/espn.m3u8"]', 'https://example.com/logos/espn.png', 'espn-main', true, '{}'),
('Discovery Channel', 'Documentary', '["rtmp://source1.example.com/live/discovery", "https://source2.example.com/discovery.m3u8"]', 'https://example.com/logos/discovery.png', 'discovery', true, '{}'),
('National Geographic', 'Documentary', '["rtmp://source1.example.com/live/natgeo", "https://source2.example.com/natgeo.m3u8"]', 'https://example.com/logos/natgeo.png', 'natgeo', true, '{}'),
('MTV', 'Music', '["rtmp://source1.example.com/live/mtv", "https://source2.example.com/mtv.m3u8"]', 'https://example.com/logos/mtv.png', 'mtv-main', true, '{}'),
('Comedy Central', 'Entertainment', '["rtmp://source1.example.com/live/comedy", "https://source2.example.com/comedy.m3u8"]', 'https://example.com/logos/comedy.png', 'comedy-central', true, '{}'),
('HBO', 'Movies', '["rtmp://source1.example.com/live/hbo", "https://source2.example.com/hbo.m3u8"]', 'https://example.com/logos/hbo.png', 'hbo-main', true, '{}'),
('Cartoon Network', 'Kids', '["rtmp://source1.example.com/live/cartoon", "https://source2.example.com/cartoon.m3u8"]', 'https://example.com/logos/cartoon.png', 'cartoon-network', true, '{}'),
('Food Network', 'Lifestyle', '["rtmp://source1.example.com/live/food", "https://source2.example.com/food.m3u8"]', 'https://example.com/logos/food.png', 'food-network', true, '{}');

-- Add sample EPG data for today and tomorrow
INSERT INTO public.epg (channel_id, program_id, title, description, start_time, end_time, category) 
SELECT 
  c.id,
  'prog_' || extract(epoch from now() + (t.hour_offset || ' hours')::interval)::text,
  CASE 
    WHEN c.category = 'News' THEN 
      CASE (t.hour_offset % 4)
        WHEN 0 THEN c.name || ' Breaking News'
        WHEN 1 THEN 'World Report'
        WHEN 2 THEN 'Business Update'
        ELSE 'Evening News'
      END
    WHEN c.category = 'Sports' THEN
      CASE (t.hour_offset % 3)
        WHEN 0 THEN 'SportsCenter'
        WHEN 1 THEN 'Live Game Coverage'
        ELSE 'Sports Analysis'
      END
    WHEN c.category = 'Movies' THEN
      CASE (t.hour_offset % 2)
        WHEN 0 THEN 'Featured Movie'
        ELSE 'Classic Cinema'
      END
    ELSE c.name || ' Programming'
  END,
  'Sample program description for ' || c.name,
  now() + (t.hour_offset || ' hours')::interval,
  now() + ((t.hour_offset + 1) || ' hours')::interval,
  c.category
FROM 
  public.channels c,
  (SELECT generate_series(0, 47) AS hour_offset) t
WHERE c.active = true;

-- Create function to get user role (avoiding RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT roles[1] FROM public.profiles WHERE user_id = user_uuid), 
    'user'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Update RLS policies to use the function for admin access
DROP POLICY IF EXISTS "Admin users can view audit logs" ON public.audit_logs;
CREATE POLICY "Admin users can view audit logs" ON public.audit_logs 
FOR SELECT TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Add RLS policies for admin access to manage all data
CREATE POLICY "Admins can manage all profiles" ON public.profiles 
FOR ALL TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions 
FOR ALL TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all channels" ON public.channels 
FOR ALL TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all streams" ON public.streams 
FOR ALL TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all sessions" ON public.sessions 
FOR ALL TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all packages" ON public.packages 
FOR ALL TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Add insert/update policies for audit logs
CREATE POLICY "System can insert audit logs" ON public.audit_logs 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Update packages to link with channels
UPDATE public.packages SET features = jsonb_build_object(
  'hd_channels', true,
  'dvr', true,
  'multi_device', true,
  'parental_controls', true
);

-- Create some sample audit logs
INSERT INTO public.audit_logs (action, target_type, details) VALUES
('system_start', 'system', '{"message": "IPTV system initialized", "version": "1.0.0"}'),
('database_migration', 'database', '{"message": "Database schema created successfully"}'),
('sample_data_created', 'channels', '{"message": "Sample channels and EPG data added"}');
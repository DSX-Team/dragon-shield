-- Create app_settings table for storing configurable system settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access to app_settings
CREATE POLICY "Admins can manage app settings"
ON public.app_settings
FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
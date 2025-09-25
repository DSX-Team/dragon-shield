-- Fix function search path security issues
-- Update the generate_api_password function with proper security settings
CREATE OR REPLACE FUNCTION public.generate_api_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
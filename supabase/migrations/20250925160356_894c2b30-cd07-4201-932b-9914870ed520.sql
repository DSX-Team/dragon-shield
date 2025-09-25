-- Extend bouquets table to support multiple content types like the original XTREAM system
ALTER TABLE public.bouquets 
ADD COLUMN movie_ids UUID[] DEFAULT '{}',
ADD COLUMN series_ids UUID[] DEFAULT '{}', 
ADD COLUMN radio_ids UUID[] DEFAULT '{}';

-- Create content tables to support movies, series, and radio stations
CREATE TABLE IF NOT EXISTS public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  category VARCHAR,
  description TEXT,
  poster_url TEXT,
  year INTEGER,
  genre VARCHAR,
  rating DECIMAL(3,1),
  duration_minutes INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR NOT NULL,
  category VARCHAR,
  description TEXT,
  poster_url TEXT,
  year INTEGER,
  genre VARCHAR,
  rating DECIMAL(3,1),
  seasons INTEGER DEFAULT 1,
  episodes INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.radio_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  category VARCHAR,
  description TEXT,
  logo_url TEXT,
  frequency VARCHAR,
  country VARCHAR,
  language VARCHAR,
  stream_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_stations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for movies
CREATE POLICY "Admins can manage all movies" 
ON public.movies 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can view active movies" 
ON public.movies 
FOR SELECT 
USING (active = true);

-- Create RLS policies for series  
CREATE POLICY "Admins can manage all series" 
ON public.series 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can view active series" 
ON public.series 
FOR SELECT 
USING (active = true);

-- Create RLS policies for radio stations
CREATE POLICY "Admins can manage all radio stations" 
ON public.radio_stations 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can view active radio stations" 
ON public.radio_stations 
FOR SELECT 
USING (active = true);

-- Add triggers for updated_at
CREATE TRIGGER update_movies_updated_at
BEFORE UPDATE ON public.movies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_series_updated_at
BEFORE UPDATE ON public.series
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_radio_stations_updated_at
BEFORE UPDATE ON public.radio_stations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_movies_category ON public.movies(category);
CREATE INDEX idx_movies_active ON public.movies(active);
CREATE INDEX idx_series_category ON public.series(category);  
CREATE INDEX idx_series_active ON public.series(active);
CREATE INDEX idx_radio_stations_category ON public.radio_stations(category);
CREATE INDEX idx_radio_stations_active ON public.radio_stations(active);

-- Insert sample data
INSERT INTO public.movies (name, category, description, year, genre, rating) VALUES 
('Action Movie Sample', 'Action', 'Sample action movie description', 2023, 'Action', 8.5),
('Comedy Sample', 'Comedy', 'Sample comedy movie description', 2022, 'Comedy', 7.2),
('Drama Sample', 'Drama', 'Sample drama movie description', 2024, 'Drama', 9.1);

INSERT INTO public.series (title, category, description, year, genre, rating, seasons, episodes) VALUES 
('Tech Series', 'Documentary', 'Technology documentary series', 2023, 'Documentary', 8.8, 2, 20),
('Sci-Fi Adventure', 'Science Fiction', 'Space exploration series', 2022, 'Sci-Fi', 9.0, 3, 36),
('Crime Investigation', 'Crime', 'Detective crime series', 2024, 'Crime', 8.3, 1, 12);

INSERT INTO public.radio_stations (name, category, frequency, country, language) VALUES 
('Dragon FM', 'Music', '101.5 FM', 'Global', 'English'),
('News Radio 24/7', 'News', '105.3 FM', 'Global', 'English'),  
('Classic Rock Station', 'Music', '98.7 FM', 'Global', 'English');
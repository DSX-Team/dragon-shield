-- Add bouquet_ids column to packages table
ALTER TABLE public.packages 
ADD COLUMN bouquet_ids UUID[] DEFAULT '{}';

-- Create index for bouquet_ids array
CREATE INDEX idx_packages_bouquet_ids ON public.packages USING GIN(bouquet_ids);

-- Update the ClientManagement component will need to be updated to handle this relationship
-- Create streaming_servers table for managing Linux streaming servers
CREATE TABLE public.streaming_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  hostname VARCHAR NOT NULL,
  ip_address INET NOT NULL,
  port INTEGER NOT NULL DEFAULT 80,
  ssh_port INTEGER NOT NULL DEFAULT 22,
  ssh_username VARCHAR NOT NULL DEFAULT 'root',
  ssh_password VARCHAR,
  ssh_key TEXT,
  os_version VARCHAR NOT NULL, -- e.g., "Ubuntu 22.04", "Ubuntu 24.04"
  status VARCHAR NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance', 'error')),
  max_clients INTEGER NOT NULL DEFAULT 1000,
  current_clients INTEGER NOT NULL DEFAULT 0,
  cpu_usage DECIMAL(5,2) DEFAULT 0.00,
  memory_usage DECIMAL(5,2) DEFAULT 0.00,
  disk_usage DECIMAL(5,2) DEFAULT 0.00,
  bandwidth_in BIGINT DEFAULT 0,
  bandwidth_out BIGINT DEFAULT 0,
  last_ping TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.streaming_servers ENABLE ROW LEVEL SECURITY;

-- Create policies for streaming_servers
CREATE POLICY "Admins can manage all streaming servers" 
ON public.streaming_servers 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can view streaming servers for load balancing" 
ON public.streaming_servers 
FOR SELECT 
USING (active = true AND status = 'online');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_streaming_servers_updated_at
BEFORE UPDATE ON public.streaming_servers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix edge_server_id column type in streams table and add foreign key
ALTER TABLE public.streams 
ALTER COLUMN edge_server_id TYPE UUID USING edge_server_id::UUID;

ALTER TABLE public.streams 
ADD CONSTRAINT fk_streams_edge_server 
FOREIGN KEY (edge_server_id) 
REFERENCES public.streaming_servers(id);

-- Insert sample streaming servers
INSERT INTO public.streaming_servers (name, hostname, ip_address, port, os_version, status, max_clients) VALUES
('Server EU-1', 'stream-eu1.example.com', '192.168.1.10', 8080, 'Ubuntu 22.04', 'online', 2000),
('Server US-1', 'stream-us1.example.com', '192.168.1.11', 8080, 'Ubuntu 24.04', 'online', 1500),
('Server AS-1', 'stream-as1.example.com', '192.168.1.12', 8080, 'Ubuntu 22.04', 'maintenance', 1000);
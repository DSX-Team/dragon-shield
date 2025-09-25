import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Eye, 
  Monitor, 
  RefreshCw, 
  Server, 
  Signal, 
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

interface StreamStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'starting';
  viewers: number;
  uptime: number;
  bitrate: number;
  server_id: string;
  server_name: string;
  last_check: string;
  error_message?: string;
}

interface ServerMetrics {
  id: string;
  name: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  bandwidth_in: number;
  bandwidth_out: number;
  current_clients: number;
  max_clients: number;
  status: string;
  last_ping: string;
}

interface StreamError {
  id: string;
  stream_id: string;
  stream_name: string;
  server_name: string;
  error_type: string;
  error_message: string;
  timestamp: string;
  resolved: boolean;
}

const StreamMonitoring: React.FC = () => {
  const [streamStatuses, setStreamStatuses] = useState<StreamStatus[]>([]);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics[]>([]);
  const [streamErrors, setStreamErrors] = useState<StreamError[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serverFilter, setServerFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMonitoringData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchMonitoringData = async () => {
    try {
      await Promise.all([
        fetchStreamStatuses(),
        fetchServerMetrics(),
        fetchStreamErrors()
      ]);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch monitoring data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStreamStatuses = async () => {
    // In a real implementation, this would fetch actual stream statuses from monitoring services
    // For now, we'll simulate with channels data and generate status info
    const { data: channels, error } = await supabase
      .from('channels')
      .select(`
        id,
        name,
        active,
        created_at
      `);

    if (error) throw error;

    const mockStatuses: StreamStatus[] = (channels || []).map(channel => ({
      id: channel.id,
      name: channel.name,
      status: channel.active 
        ? (['online', 'online', 'online', 'starting', 'error'][Math.floor(Math.random() * 5)] as any)
        : 'offline',
      viewers: Math.floor(Math.random() * 1000),
      uptime: Math.floor(Math.random() * 86400), // Random uptime in seconds
      bitrate: Math.floor(Math.random() * 5000) + 1000, // 1-6 Mbps
      server_id: 'server-' + Math.floor(Math.random() * 3 + 1),
      server_name: 'Server ' + Math.floor(Math.random() * 3 + 1),
      last_check: new Date().toISOString(),
      error_message: Math.random() > 0.8 ? 'Connection timeout' : undefined
    }));

    setStreamStatuses(mockStatuses);
  };

  const fetchServerMetrics = async () => {
    const { data: servers, error } = await supabase
      .from('streaming_servers')
      .select('*');

    if (error) throw error;

    const metrics: ServerMetrics[] = (servers || []).map(server => ({
      id: server.id,
      name: server.name,
      cpu_usage: server.cpu_usage || Math.floor(Math.random() * 80),
      memory_usage: server.memory_usage || Math.floor(Math.random() * 90),
      disk_usage: server.disk_usage || Math.floor(Math.random() * 70),
      bandwidth_in: Math.floor(Math.random() * 1000),
      bandwidth_out: Math.floor(Math.random() * 5000),
      current_clients: server.current_clients,
      max_clients: server.max_clients,
      status: server.status,
      last_ping: server.last_ping || new Date().toISOString()
    }));

    setServerMetrics(metrics);
  };

  const fetchStreamErrors = async () => {
    // Mock error data - in real implementation, fetch from error logs
    const mockErrors: StreamError[] = [
      {
        id: '1',
        stream_id: 'stream-1',
        stream_name: 'BBC One HD',
        server_name: 'Server 1',
        error_type: 'Connection Error',
        error_message: 'Failed to connect to upstream source',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        resolved: false
      },
      {
        id: '2',
        stream_id: 'stream-2',
        stream_name: 'CNN International',
        server_name: 'Server 2',
        error_type: 'Transcoding Error',
        error_message: 'Video codec not supported',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        resolved: true
      }
    ];

    setStreamErrors(mockErrors);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'starting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: 'default',
      offline: 'secondary', 
      error: 'destructive',
      starting: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBitrate = (bitrate: number) => {
    return `${(bitrate / 1000).toFixed(1)} Mbps`;
  };

  const filteredStreams = streamStatuses.filter(stream => {
    const matchesSearch = stream.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || stream.status === statusFilter;
    const matchesServer = serverFilter === 'all' || stream.server_id === serverFilter;
    
    return matchesSearch && matchesStatus && matchesServer;
  });

  const onlineStreams = streamStatuses.filter(s => s.status === 'online').length;
  const totalViewers = streamStatuses.reduce((sum, s) => sum + s.viewers, 0);
  const averageBitrate = streamStatuses.length > 0 
    ? streamStatuses.reduce((sum, s) => sum + s.bitrate, 0) / streamStatuses.length 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stream Monitoring</h2>
          <p className="text-muted-foreground">Real-time monitoring of streams and servers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMonitoringData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className="mr-2 h-4 w-4" />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Streams</CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineStreams}</div>
            <p className="text-xs text-muted-foreground">
              of {streamStatuses.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViewers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              active connections
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Bitrate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBitrate(averageBitrate)}</div>
            <p className="text-xs text-muted-foreground">
              across all streams
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {streamErrors.filter(e => !e.resolved).length}
            </div>
            <p className="text-xs text-muted-foreground">
              requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="streams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="streams">Stream Status</TabsTrigger>
          <TabsTrigger value="servers">Server Metrics</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stream Status</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search streams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="starting">Starting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stream</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Viewers</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Bitrate</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Last Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStreams.map((stream) => (
                    <TableRow key={stream.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(stream.status)}
                          <span className="font-medium">{stream.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(stream.status)}
                        {stream.error_message && (
                          <div className="text-xs text-red-500 mt-1">
                            {stream.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{stream.viewers.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stream.status === 'online' ? formatUptime(stream.uptime) : '-'}
                      </TableCell>
                      <TableCell>
                        {stream.status === 'online' ? formatBitrate(stream.bitrate) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stream.server_name}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(stream.last_check).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CPU</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead>Disk</TableHead>
                    <TableHead>Bandwidth</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Last Ping</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serverMetrics.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Server className="h-4 w-4" />
                          <span className="font-medium">{server.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
                          {server.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{server.cpu_usage}%</span>
                          </div>
                          <Progress value={server.cpu_usage} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{server.memory_usage}%</span>
                          </div>
                          <Progress value={server.memory_usage} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{server.disk_usage}%</span>
                          </div>
                          <Progress value={server.disk_usage} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>↓ {server.bandwidth_in} Mbps</div>
                          <div>↑ {server.bandwidth_out} Mbps</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {server.current_clients} / {server.max_clients}
                        </div>
                        <Progress 
                          value={server.max_clients > 0 ? (server.current_clients / server.max_clients) * 100 : 0} 
                          className="h-2 mt-1" 
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(server.last_ping).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stream</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Error Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streamErrors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="font-medium">{error.stream_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{error.server_name}</Badge>
                      </TableCell>
                      <TableCell>{error.error_type}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={error.error_message}>
                          {error.error_message}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(error.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={error.resolved ? "default" : "destructive"}>
                          {error.resolved ? 'Resolved' : 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StreamMonitoring;
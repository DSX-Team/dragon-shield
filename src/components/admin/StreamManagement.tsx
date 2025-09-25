import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Play, Square, AlertCircle, Monitor, Signal, Settings, Upload, Download, Server, Eye, MoreHorizontal } from 'lucide-react';

interface Stream {
  id: string;
  name: string;
  category: string | null;
  upstream_sources: any;
  active: boolean;
  created_at: string;
  updated_at: string;
  logo_url?: string | null;
  epg_id?: string | null;
  package_ids?: string[] | null;
  license_info?: any;
  transcode_profiles?: any;
}

interface StreamingServer {
  id: string;
  name: string;
  hostname: string;
  ip_address: any;
  status: string;
  current_clients: number;
  max_clients: number;
  cpu_usage: number | null;
  memory_usage: number | null;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

const StreamManagement: React.FC = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [servers, setServers] = useState<StreamingServer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStreams();
    fetchServers(); 
    fetchCategories();
  }, []);

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch streams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('streaming_servers')
        .select('*')
        .order('name');

      if (error) throw error;
      setServers(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      // For now, we'll create some default categories
      // In a real implementation, you'd fetch from a categories table
      const defaultCategories = [
        { id: '1', name: 'Entertainment', type: 'live' },
        { id: '2', name: 'Sports', type: 'live' },
        { id: '3', name: 'News', type: 'live' },
        { id: '4', name: 'Music', type: 'live' },
        { id: '5', name: 'Movies', type: 'vod' },
        { id: '6', name: 'Series', type: 'vod' },
      ];
      setCategories(defaultCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const toggleStreamStatus = async (streamId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('channels')
        .update({ active })
        .eq('id', streamId);

      if (error) throw error;

      setStreams(streams.map(stream => 
        stream.id === streamId ? { ...stream, active } : stream
      ));

      toast({
        title: 'Success',
        description: `Stream ${active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating stream status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stream status',
        variant: 'destructive',
      });
    }
  };

  const deleteStream = async (streamId: string) => {
    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', streamId);

      if (error) throw error;

      setStreams(streams.filter(stream => stream.id !== streamId));
      toast({
        title: 'Success',
        description: 'Stream deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting stream:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete stream',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (stream: Stream) => {
    if (!stream.active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    // In a real implementation, you'd check actual stream status
    return <Badge variant="default">Online</Badge>;
  };

  const getServerStatus = (server: StreamingServer) => {
    const loadPercent = server.max_clients > 0 ? (server.current_clients / server.max_clients) * 100 : 0;
    
    return (
      <div className="flex items-center space-x-2">
        <Badge variant={server.status === 'online' ? 'default' : 'secondary'}>
          {server.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {server.current_clients}/{server.max_clients} ({loadPercent.toFixed(1)}%)
        </span>
      </div>
    );
  };

  const filteredStreams = streams.filter(stream => {
    const matchesSearch = stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stream.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && stream.active) ||
                         (statusFilter === 'inactive' && !stream.active);
    const matchesCategory = categoryFilter === 'all' || stream.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

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
          <h2 className="text-3xl font-bold tracking-tight">Stream Management</h2>
          <p className="text-muted-foreground">Manage your streaming channels and servers</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stream
        </Button>
      </div>

      <Tabs defaultValue="streams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="streams">Streams</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stream List</CardTitle>
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
                      <SelectItem value="active">Active</SelectItem> 
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
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
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sources</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStreams.map((stream) => (
                    <TableRow key={stream.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {stream.logo_url && (
                            <img src={stream.logo_url} alt="" className="w-8 h-8 rounded" />
                          )}
                          <div>
                            <div className="font-medium">{stream.name}</div>
                            <div className="text-sm text-muted-foreground">{stream.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stream.category || 'Uncategorized'}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(stream)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Signal className="h-4 w-4" />
                          <span>{stream.upstream_sources?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(stream.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStreamStatus(stream.id, !stream.active)}
                          >
                            {stream.active ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStream(stream)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Stream</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{stream.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteStream(stream.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
              <CardTitle>Streaming Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Load</TableHead>
                    <TableHead>Resources</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{server.name}</div>
                          <div className="text-sm text-muted-foreground">{server.hostname}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getServerStatus(server)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">CPU: {server.cpu_usage}%</div>
                          <div className="text-sm">RAM: {server.memory_usage}%</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Clients: {server.current_clients}/{server.max_clients}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Monitor className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{streams.length}</div>
                <p className="text-xs text-muted-foreground">
                  {streams.filter(s => s.active).length} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Servers</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {servers.filter(s => s.status === 'online').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {servers.length} total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {servers.reduce((sum, s) => sum + s.current_clients, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  across all servers
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg CPU Usage</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {servers.length > 0 ? (servers.reduce((sum, s) => sum + s.cpu_usage, 0) / servers.length).toFixed(1) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  across all servers
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mass Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import M3U Playlist
                </Button>
                <Button className="w-full" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Stream List
                </Button>
                <Button className="w-full" variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Mass Edit Streams
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Server Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="outline">
                  <Server className="mr-2 h-4 w-4" />
                  Move Streams Between Servers
                </Button>
                <Button className="w-full" variant="outline">
                  <Monitor className="mr-2 h-4 w-4" />
                  Server Health Check
                </Button>
                <Button className="w-full" variant="outline">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View Error Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Stream Dialog */}
      <Dialog open={isCreateDialogOpen || !!selectedStream} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setSelectedStream(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStream ? 'Edit Stream' : 'Create New Stream'}
            </DialogTitle>
          </DialogHeader>
          <StreamForm 
            stream={selectedStream}
            categories={categories}
            servers={servers}
            onSave={() => {
              fetchStreams();
              setIsCreateDialogOpen(false);
              setSelectedStream(null);
            }}
            onCancel={() => {
              setIsCreateDialogOpen(false);
              setSelectedStream(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Stream form component
const StreamForm: React.FC<{
  stream?: Stream | null;
  categories: Category[];
  servers: StreamingServer[];
  onSave: () => void;
  onCancel: () => void;
}> = ({ stream, categories, servers, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: stream?.name || '',
    category: stream?.category || '',
    logo_url: stream?.logo_url || '',
    epg_id: stream?.epg_id || '',
    active: stream?.active ?? true,
    upstream_sources: stream?.upstream_sources || [],
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        logo_url: formData.logo_url,
        epg_id: formData.epg_id,
        active: formData.active,
        upstream_sources: formData.upstream_sources,
      };

      if (stream) {
        const { error } = await supabase
          .from('channels')
          .update(payload)
          .eq('id', stream.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('channels')
          .insert(payload);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Stream ${stream ? 'updated' : 'created'} successfully`,
      });
      onSave();
    } catch (error) {
      console.error('Error saving stream:', error);
      toast({
        title: 'Error',
        description: `Failed to ${stream ? 'update' : 'create'} stream`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Stream Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="epg_id">EPG ID</Label>
              <Input
                id="epg_id"
                value={formData.epg_id}
                onChange={(e) => setFormData({ ...formData, epg_id: e.target.value })}
                placeholder="channel.epg.id"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Upstream Sources</h4>
              <Button type="button" variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Source
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Configure multiple upstream sources for load balancing and redundancy.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Advanced Options</h4>
            <div className="text-sm text-muted-foreground">
              Configure transcoding profiles, recording settings, and other advanced options.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Server Assignment</h4>
            <div className="text-sm text-muted-foreground">
              Assign this stream to specific servers for load balancing.
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (stream ? 'Update' : 'Create')}
        </Button>
      </div>
    </form>
  );
};

export default StreamManagement;
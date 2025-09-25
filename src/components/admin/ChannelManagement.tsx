import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Power, 
  PowerOff, 
  Play, 
  Square, 
  RotateCcw, 
  Trash, 
  MonitorPlay,
  Upload,
  Download,
  Filter,
  Search,
  RefreshCw,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Globe
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface Channel {
  id: string;
  name: string;
  category: string;
  active: boolean;
  created_at: string;
  upstream_sources: any;
  logo_url?: string;
  epg_id?: string;
  package_ids?: string[];
  license_info?: any;
  transcode_profiles?: any;
}

interface StreamSession {
  id: string;
  user_id: string;
  stream_id?: string;
  client_ip: any;
  user_agent?: string;
  start_time: string;
  last_activity: string;
  bytes_transferred: number;
  channels?: any;
}

interface StreamStats {
  total_streams: number;
  active_streams: number;
  total_viewers: number;
  bandwidth_usage: number;
}

interface ChannelManagementProps {
  channels: Channel[];
  onChannelsUpdate: () => void;
}

export const ChannelManagement = ({ channels, onChannelsUpdate }: ChannelManagementProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [streamSessions, setStreamSessions] = useState<StreamSession[]>([]);
  const [streamStats, setStreamStats] = useState<StreamStats>({
    total_streams: 0,
    active_streams: 0,
    total_viewers: 0,
    bandwidth_usage: 0
  });
  const [activeTab, setActiveTab] = useState("channels");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "General",
    upstream_url: "",
    logo_url: "",
    epg_id: "",
    package_ids: [] as string[]
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchStreamStats();
    fetchStreamSessions();
    const interval = setInterval(() => {
      fetchStreamStats();
      fetchStreamSessions();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStreamStats = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("*")
        .is("end_time", null);

      if (error) throw error;

      const stats = {
        total_streams: channels.length,
        active_streams: channels.filter(c => c.active).length,
        total_viewers: sessions?.length || 0,
        bandwidth_usage: sessions?.reduce((total, session) => total + (session.bytes_transferred || 0), 0) || 0
      };

      setStreamStats(stats);
    } catch (error) {
      console.error("Error fetching stream stats:", error);
    }
  };

  const fetchStreamSessions = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("*")
        .is("end_time", null)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setStreamSessions(sessions || []);
    } catch (error) {
      console.error("Error fetching stream sessions:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.upstream_url) {
      toast({
        title: "Error",
        description: "Channel name and upstream URL are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const channelData = {
        name: formData.name,
        category: formData.category,
        logo_url: formData.logo_url,
        epg_id: formData.epg_id,
        package_ids: formData.package_ids,
        upstream_sources: [{ url: formData.upstream_url, type: "m3u8" }]
      };

      if (editingChannel) {
        const { error } = await supabase
          .from("channels")
          .update(channelData)
          .eq("id", editingChannel.id);

        if (error) throw error;
        toast({ title: "Success", description: "Channel updated successfully" });
      } else {
        const { error } = await supabase
          .from("channels")
          .insert({ ...channelData, active: true });

        if (error) throw error;
        toast({ title: "Success", description: "Channel added successfully" });
      }

      setShowDialog(false);
      setEditingChannel(null);
      setFormData({ name: "", category: "General", upstream_url: "", logo_url: "", epg_id: "", package_ids: [] });
      onChannelsUpdate();
      fetchStreamStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save channel",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      category: channel.category,
      upstream_url: channel.upstream_sources?.[0]?.url || "",
      logo_url: channel.logo_url || "",
      epg_id: channel.epg_id || "",
      package_ids: channel.package_ids || []
    });
    setShowDialog(true);
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;

    try {
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Channel deleted successfully"
      });
      onChannelsUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive"
      });
    }
  };

  const toggleChannelStatus = async (channelId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("channels")
        .update({ active: !currentStatus })
        .eq("id", channelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Channel ${!currentStatus ? "enabled" : "disabled"}`
      });
      onChannelsUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update channel",
        variant: "destructive"
      });
    }
  };

  const handleStreamAction = async (channelId: string, action: 'start' | 'stop' | 'restart' | 'purge') => {
    setLoading(true);
    try {
      // Call our stream control edge function
      const { data, error } = await supabase.functions.invoke('stream-control', {
        body: { 
          action: 'stream',
          sub: action,
          stream_id: channelId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Stream ${action} completed successfully`
      });
      
      fetchStreamStats();
      fetchStreamSessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} stream`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'enable' | 'disable' | 'delete') => {
    if (selectedChannels.length === 0) {
      toast({
        title: "Error",
        description: "Please select channels first",
        variant: "destructive"
      });
      return;
    }

    const confirmMessage = action === 'delete' ? 
      "Are you sure you want to delete the selected channels?" :
      `Are you sure you want to ${action} the selected channels?`;
    
    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from("channels")
          .delete()
          .in("id", selectedChannels);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("channels")
          .update({ active: action === 'enable' })
          .in("id", selectedChannels);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Bulk ${action} completed successfully`
      });
      
      setSelectedChannels([]);
      setShowBulkDialog(false);
      onChannelsUpdate();
      fetchStreamStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} channels`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKillSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('stream-control', {
        body: { 
          action: 'line_activity',
          sub: 'kill',
          pid: sessionId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session terminated successfully"
      });
      
      fetchStreamSessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to kill session",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    setEditingChannel(null);
    setFormData({ name: "", category: "General", upstream_url: "", logo_url: "", epg_id: "", package_ids: [] });
    setShowDialog(true);
  };

  const getFilteredChannels = () => {
    return channels.filter(channel => {
      const categoryMatch = !categoryFilter || channel.category === categoryFilter;
      const searchMatch = !searchFilter || 
        channel.name.toLowerCase().includes(searchFilter.toLowerCase());
      return categoryMatch && searchMatch;
    });
  };

  const getUniqueCategories = () => {
    return [...new Set(channels.map(c => c.category).filter(Boolean))];
  };

  const formatBandwidth = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredChannels = getFilteredChannels();

  return (
    <div className="space-y-6">
      {/* Stream Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Streams</CardTitle>
            <MonitorPlay className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streamStats.total_streams}</div>
            <p className="text-xs text-white/70">
              {streamStats.active_streams} active
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Live Viewers</CardTitle>
            <Users className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streamStats.total_viewers}</div>
            <p className="text-xs text-white/70">
              Concurrent connections
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Bandwidth</CardTitle>
            <Activity className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBandwidth(streamStats.bandwidth_usage)}</div>
            <p className="text-xs text-white/70">
              Total transferred
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Categories</CardTitle>
            <Globe className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueCategories().length}</div>
            <p className="text-xs text-white/70">
              Content categories
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">Channel Management</TabsTrigger>
          <TabsTrigger value="sessions">Live Sessions</TabsTrigger>
          <TabsTrigger value="tools">Stream Tools</TabsTrigger>
        </TabsList>
        
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Channel Management</CardTitle>
                  <CardDescription>Manage streaming channels and sources</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBulkDialog(true)} disabled={selectedChannels.length === 0}>
                    <Zap className="w-4 h-4 mr-2" />
                    Bulk Actions ({selectedChannels.length})
                  </Button>
                  <Button onClick={openAddDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Channel
                  </Button>
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Channels</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Label htmlFor="category">Filter by Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {getUniqueCategories().map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => { setCategoryFilter(""); setSearchFilter(""); }}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedChannels.length === filteredChannels.length && filteredChannels.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChannels(filteredChannels.map(c => c.id));
                            } else {
                              setSelectedChannels([]);
                            }
                          }}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>EPG</TableHead>
                      <TableHead>Stream Controls</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChannels.map((channel) => (
                      <TableRow key={channel.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedChannels.includes(channel.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChannels([...selectedChannels, channel.id]);
                              } else {
                                setSelectedChannels(selectedChannels.filter(id => id !== channel.id));
                              }
                            }}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {channel.logo_url && (
                              <img src={channel.logo_url} alt="" className="w-8 h-8 rounded object-cover" />
                            )}
                            <div>
                              <div className="font-medium">{channel.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {channel.upstream_sources?.[0]?.type?.toUpperCase() || 'M3U8'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{channel.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant={channel.active ? 'active' : 'inactive'}>
                            {channel.active ? 'Active' : 'Inactive'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {channel.epg_id ? (
                            <Badge variant="secondary">{channel.epg_id}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No EPG</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStreamAction(channel.id, 'start')}
                              disabled={loading}
                              title="Start Stream"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStreamAction(channel.id, 'restart')}
                              disabled={loading}
                              title="Restart Stream"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStreamAction(channel.id, 'stop')}
                              disabled={loading}
                              title="Stop Stream"
                            >
                              <Square className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStreamAction(channel.id, 'purge')}
                              disabled={loading}
                              title="Purge Connections"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(channel)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={channel.active ? "secondary" : "outline"}
                              onClick={() => toggleChannelStatus(channel.id, channel.active)}
                            >
                              {channel.active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(channel.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Streaming Sessions</CardTitle>
                  <CardDescription>Monitor active viewer connections</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchStreamSessions}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Bandwidth</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {streamSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          User {session.user_id.slice(-8)}
                        </TableCell>
                        <TableCell>
                          {session.stream_id ? `Stream ${session.stream_id.slice(-8)}` : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{session.client_ip || 'Unknown'}</code>
                        </TableCell>
                        <TableCell>
                          {new Date(session.start_time).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatBandwidth(session.bytes_transferred)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant="active">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              Live
                            </div>
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleKillSession(session.id)}
                            title="Terminate Session"
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stream Management Tools</CardTitle>
              <CardDescription>Advanced streaming utilities and bulk operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Upload className="w-6 h-6" />
                  <span>Import M3U</span>
                  <span className="text-xs text-muted-foreground">Bulk import channels</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Download className="w-6 h-6" />
                  <span>Export M3U</span>
                  <span className="text-xs text-muted-foreground">Generate playlist</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Globe className="w-6 h-6" />
                  <span>DNS Replace</span>
                  <span className="text-xs text-muted-foreground">Update stream URLs</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <RefreshCw className="w-6 h-6" />
                  <span>Stream Health</span>
                  <span className="text-xs text-muted-foreground">Check all streams</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Activity className="w-6 h-6" />
                  <span>Load Balancing</span>
                  <span className="text-xs text-muted-foreground">Optimize distribution</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span>Error Report</span>
                  <span className="text-xs text-muted-foreground">Stream diagnostics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Channel Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingChannel ? "Edit Channel" : "Add New Channel"}</DialogTitle>
            <DialogDescription>
              {editingChannel ? "Update channel information" : "Configure a new streaming channel"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. CNN HD"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Movies">Movies</SelectItem>
                    <SelectItem value="Kids">Kids</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Documentary">Documentary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="upstream_url">Stream URL *</Label>
              <Input
                id="upstream_url"
                placeholder="https://example.com/stream.m3u8"
                value={formData.upstream_url}
                onChange={(e) => setFormData({...formData, upstream_url: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL (Optional)</Label>
                <Input
                  id="logo_url"
                  placeholder="https://example.com/logo.png"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="epg_id">EPG ID (Optional)</Label>
                <Input
                  id="epg_id"
                  placeholder="e.g. cnn.us"
                  value={formData.epg_id}
                  onChange={(e) => setFormData({...formData, epg_id: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : editingChannel ? "Update" : "Add"} Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedChannels.length} selected channels
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleBulkAction('enable')}
                disabled={loading}
                className="justify-start"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Enable Selected Channels
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkAction('disable')}
                disabled={loading}
                className="justify-start"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Disable Selected Channels
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleBulkAction('delete')}
                disabled={loading}
                className="justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected Channels
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
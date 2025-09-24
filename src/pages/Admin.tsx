import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Users, Tv, Package, Activity, Shield, Database, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  email: string;
  roles: string[];
  status: string;
  created_at: string;
}

interface Channel {
  id: string;
  name: string;
  category: string;
  active: boolean;
  created_at: string;
}

interface Subscription {
  id: string;
  profiles: { username: string; email: string };
  packages: { name: string };
  status: string;
  start_date: string;
  end_date: string;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: "",
    category: "",
    upstream_url: "",
    logo_url: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      // Check if user is admin
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !profileData?.roles?.includes("admin")) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin panel.",
          variant: "destructive"
        });
        navigate("/admin/login");
        return;
      }

      setProfile(profileData);
      await fetchAdminData();
      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  const fetchAdminData = async () => {
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch all channels
      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (channelsError) throw channelsError;
      setChannels(channelsData || []);

      // Fetch subscriptions data
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select(`
          id,
          user_id,
          status,
          start_date,
          end_date,
          packages(name)
        `)
        .order("created_at", { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // Get user profiles for each subscription
      const enrichedSubscriptions = [];
      if (subscriptionsData) {
        for (const sub of subscriptionsData) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, email")
            .eq("user_id", sub.user_id)
            .single();

          enrichedSubscriptions.push({
            ...sub,
            profiles: profileData || { username: "Unknown", email: "Unknown" }
          });
        }
      }

      setSubscriptions(enrichedSubscriptions);

    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    }
  };

  const addChannel = async () => {
    if (!newChannel.name || !newChannel.upstream_url) {
      toast({
        title: "Error",
        description: "Channel name and upstream URL are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("channels")
        .insert({
          name: newChannel.name,
          category: newChannel.category || "General",
          logo_url: newChannel.logo_url,
          upstream_sources: [{ url: newChannel.upstream_url, type: "m3u8" }],
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Channel added successfully"
      });

      setChannels([data, ...channels]);
      setShowAddChannel(false);
      setNewChannel({ name: "", category: "", upstream_url: "", logo_url: "" });
    } catch (error) {
      console.error("Error adding channel:", error);
      toast({
        title: "Error",
        description: "Failed to add channel",
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

      setChannels(channels.map(ch => 
        ch.id === channelId ? { ...ch, active: !currentStatus } : ch
      ));

      toast({
        title: "Success",
        description: `Channel ${!currentStatus ? "enabled" : "disabled"}`
      });
    } catch (error) {
      console.error("Error updating channel:", error);
      toast({
        title: "Error",
        description: "Failed to update channel",
        variant: "destructive"
      });
    }
  };

  const deleteChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;

      setChannels(channels.filter(ch => ch.id !== channelId));

      toast({
        title: "Success",
        description: "Channel deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive"
      });
    }
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "active").length,
    totalChannels: channels.length,
    activeChannels: channels.filter(c => c.active).length,
    activeSubscriptions: subscriptions.filter(s => s.status === "active").length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Administrator</Badge>
            <span className="text-sm text-muted-foreground">
              {profile?.username}
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Channels</CardTitle>
              <Tv className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChannels}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeChannels} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">
                All services running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Healthy</div>
              <p className="text-xs text-muted-foreground">
                All connections active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "destructive"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles?.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Channel Management</CardTitle>
                  <CardDescription>Manage streaming channels and sources</CardDescription>
                </div>
                <Button 
                  onClick={() => setShowAddChannel(true)}
                  className="flex items-center gap-2"
                >
                  <Tv className="h-4 w-4" />
                  Add Channel
                </Button>
              </CardHeader>
              <CardContent>
                {channels.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No channels configured yet. Add channels to enable streaming.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stream URL</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channels.map((channel) => (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell>{channel.category || "General"}</TableCell>
                          <TableCell>
                            <Badge variant={channel.active ? "default" : "secondary"}>
                              {channel.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              /live/{channel.id}.m3u8
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleChannelStatus(channel.id, channel.active)}
                              >
                                {channel.active ? "Disable" : "Enable"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteChannel(channel.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage user subscriptions and billing</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{subscription.profiles.username}</div>
                            <div className="text-sm text-muted-foreground">{subscription.profiles.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{subscription.packages.name}</TableCell>
                        <TableCell>
                          <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
                            {subscription.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(subscription.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(subscription.end_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Channel Dialog */}
        <Dialog open={showAddChannel} onOpenChange={setShowAddChannel}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Channel</DialogTitle>
              <DialogDescription>
                Configure a new streaming channel for your IPTV service
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. CNN HD"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({...newChannel, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newChannel.category} onValueChange={(value) => setNewChannel({...newChannel, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Movies">Movies</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Kids">Kids</SelectItem>
                    <SelectItem value="Documentary">Documentary</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="upstream_url">Stream URL *</Label>
                <Input
                  id="upstream_url"
                  placeholder="https://example.com/stream.m3u8"
                  value={newChannel.upstream_url}
                  onChange={(e) => setNewChannel({...newChannel, upstream_url: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL (Optional)</Label>
                <Input
                  id="logo_url"
                  placeholder="https://example.com/logo.png"
                  value={newChannel.logo_url}
                  onChange={(e) => setNewChannel({...newChannel, logo_url: e.target.value})}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={addChannel} className="flex-1">
                  Add Channel
                </Button>
                <Button variant="outline" onClick={() => setShowAddChannel(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
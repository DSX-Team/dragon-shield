import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Trash2, Power, PowerOff, Plus, Users, Tv, Package, CreditCard, Eye, EyeOff } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

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
  upstream_sources: any;
  logo_url?: string;
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'users';
  
  const [newChannel, setNewChannel] = useState({
    name: "",
    category: "General",
    upstream_url: "",
    logo_url: ""
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const setCurrentTab = (tab: string) => {
    navigate(`/admin?tab=${tab}`);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
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
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: channelsData } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: subscriptionsData } = await supabase
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

      setUsers(usersData || []);
      setChannels(channelsData || []);

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
          category: newChannel.category,
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
      setNewChannel({ name: "", category: "General", upstream_url: "", logo_url: "" });
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
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold text-foreground">XTREAM Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Manage your IPTV service</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {profile?.username}</span>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-xtream-blue to-xtream-blue-light text-white border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-white/80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-white/70">
                    +{users.filter(u => u.status === 'active').length} active
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-xtream-navy to-xtream-navy-light text-white border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Active Channels</CardTitle>
                  <Tv className="h-4 w-4 text-white/80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{channels.filter(c => c.active).length}</div>
                  <p className="text-xs text-white/70">
                    of {channels.length} total
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-success to-success/80 text-white border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Active Subscriptions</CardTitle>
                  <CreditCard className="h-4 w-4 text-white/80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subscriptions.filter(s => s.status === 'active').length}</div>
                  <p className="text-xs text-white/70">
                    Active subscribers
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-xtream-orange to-xtream-orange/80 text-white border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Available Packages</CardTitle>
                  <Package className="h-4 w-4 text-white/80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-white/70">
                    Service packages
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:flex bg-muted/50">
                <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="channels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Tv className="w-4 h-4 mr-2" />
                  Channels
                </TabsTrigger>
                <TabsTrigger value="packages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Package className="w-4 h-4 mr-2" />
                  Packages
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Subscriptions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
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
                          <TableHead>Role</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <StatusBadge variant={user.status === 'active' ? 'active' : 'inactive'}>
                                {user.status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge variant={user.roles?.includes('admin') ? 'warning' : 'success'}>
                                {user.roles?.includes('admin') ? 'Admin' : 'User'}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="channels">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Channel Management</CardTitle>
                      <CardDescription>Manage streaming channels and sources</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddChannel(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Channel
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {channels.map((channel) => (
                          <TableRow key={channel.id}>
                            <TableCell className="font-medium">{channel.name}</TableCell>
                            <TableCell>{channel.category}</TableCell>
                            <TableCell>
                              <StatusBadge variant={channel.active ? 'active' : 'inactive'}>
                                {channel.active ? 'Active' : 'Inactive'}
                              </StatusBadge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleChannelStatus(channel.id, channel.active)}
                                >
                                  {channel.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteChannel(channel.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
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

              <TabsContent value="packages">
                <Card>
                  <CardHeader>
                    <CardTitle>Package Management</CardTitle>
                    <CardDescription>Manage subscription packages and pricing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Package management interface coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscriptions">
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
                              <StatusBadge variant={subscription.status === 'active' ? 'active' : 'expired'}>
                                {subscription.status}
                              </StatusBadge>
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
                    <Label htmlFor="name">Channel Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. CNN HD"
                      value={newChannel.name}
                      onChange={(e) => setNewChannel({...newChannel, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g. News"
                      value={newChannel.category}
                      onChange={(e) => setNewChannel({...newChannel, category: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="upstream_url">Stream URL</Label>
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
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddChannel(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addChannel}>
                    Add Channel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
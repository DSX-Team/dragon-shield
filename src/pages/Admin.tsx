import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, Tv, Package, CreditCard } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { UserManagement } from "@/components/admin/UserManagement";
import { ChannelManagement } from "@/components/admin/ChannelManagement";
import { PackageManagement } from "@/components/admin/PackageManagement";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";

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

interface PackageData {
  id: string;
  name: string;
  description?: string;
  price?: number;
  duration_days?: number;
  concurrent_limit?: number;
  active: boolean;
  created_at: string;
}

interface Subscription {
  id: string;
  profiles: { username: string; email: string; id: string };
  packages: { name: string; id: string };
  status: string;
  start_date: string;
  end_date: string;
  user_id: string;
  package_id: string;
}

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'users';
  
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

      const { data: packagesData } = await supabase
        .from("packages")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: subscriptionsData } = await supabase
        .from("subscriptions")
        .select(`
          id,
          user_id,
          package_id,
          status,
          start_date,
          end_date,
          packages(name, id)
        `)
        .order("created_at", { ascending: false });

      setUsers(usersData || []);
      setChannels(channelsData || []);
      setPackages(packagesData || []);

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
            profiles: profileData || { username: "Unknown", email: "Unknown", id: "unknown" }
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
                  <div className="text-2xl font-bold">{packages.filter(p => p.active).length}</div>
                  <p className="text-xs text-white/70">
                    of {packages.length} total
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
                <UserManagement users={users} onUsersUpdate={fetchAdminData} />
              </TabsContent>

              <TabsContent value="channels">
                <ChannelManagement channels={channels} onChannelsUpdate={fetchAdminData} />
              </TabsContent>

              <TabsContent value="packages">
                <PackageManagement packages={packages} onPackagesUpdate={fetchAdminData} />
              </TabsContent>

              <TabsContent value="subscriptions">
                <SubscriptionManagement subscriptions={subscriptions} onSubscriptionsUpdate={fetchAdminData} />
              </TabsContent>
            </Tabs>

          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
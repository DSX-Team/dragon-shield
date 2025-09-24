import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tv, Play, Package, Users, CreditCard, BarChart3, Activity } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StatusBadge } from "@/components/ui/status-badge";

interface Channel {
  id: string;
  name: string;
  category: string;
  active: boolean;
  logo_url?: string;
}

interface Subscription {
  id: string;
  status: string;
  end_date: string;
}

const Dashboard = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("roles")
        .eq("user_id", session.user.id)
        .single();
      
      setIsAdmin(profile?.roles?.includes("admin") || false);

      // Fetch channels
      const { data: channelsData } = await supabase
        .from("channels")
        .select("*")
        .eq("active", true)
        .order("name");

      if (channelsData) {
        setChannels(channelsData);
      }

      // Fetch user's subscription
      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .single();

      if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading dashboard...</p>
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
                <h1 className="text-xl font-semibold text-foreground">XTREAM Dashboard</h1>
                <p className="text-sm text-muted-foreground">Your IPTV service overview</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome back!</span>
              {isAdmin && (
                <Button onClick={() => navigate('/admin')}>
                  Admin Panel
                </Button>
              )}
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-xtream-blue to-xtream-blue-light text-white border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Active Channels</CardTitle>
                  <Tv className="h-5 w-5 text-white/80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{channels.filter(c => c.active).length}</div>
                  <p className="text-xs text-white/70">Available to watch</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-xtream-navy to-xtream-navy-light text-white border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Your Package</CardTitle>
                  <Package className="h-5 w-5 text-white/80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subscription ? "Active" : "None"}</div>
                  <p className="text-xs text-white/70">
                    {subscription ? `Expires: ${new Date(subscription.end_date).toLocaleDateString()}` : "No active subscription"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-success to-success/80 text-white border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">Service Status</CardTitle>
                  <Activity className="h-5 w-5 text-white/80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Online</div>
                  <p className="text-xs text-white/70">All systems operational</p>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card className="bg-gradient-to-br from-xtream-orange to-xtream-orange/80 text-white border-0">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">Total Users</CardTitle>
                    <Users className="h-5 w-5 text-white/80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-xs text-white/70">System users</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Available Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="h-5 w-5" />
                  Available Channels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {channels.map((channel) => (
                    <Card key={channel.id} className="hover:shadow-md transition-shadow cursor-pointer border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-sm">{channel.name}</h3>
                          <StatusBadge variant={channel.active ? 'active' : 'inactive'}>
                            {channel.active ? 'Live' : 'Offline'}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{channel.category}</p>
                        <Button 
                          size="sm" 
                          className="w-full" 
                          onClick={() => navigate(`/player/${channel.id}`)}
                          disabled={!channel.active}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Watch
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
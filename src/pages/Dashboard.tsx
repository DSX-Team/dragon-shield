import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogOut, Tv, Users, Settings, BarChart3, Shield, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  email: string;
  roles: string[];
  status: string;
  created_at: string;
  last_login: string | null;
}

interface Subscription {
  id: string;
  package: {
    name: string;
    description: string;
    concurrent_limit: number;
  };
  start_date: string;
  end_date: string;
  status: string;
}

interface Channel {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
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
      await fetchUserData(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select(`
          *,
          package:packages(name, description, concurrent_limit)
        `)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (subscriptionError) throw subscriptionError;
      setSubscription(subscriptionData);

      // Fetch channels
      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("id, name, category, active")
        .eq("active", true)
        .limit(10);

      if (channelsError) throw channelsError;
      setChannels(channelsData || []);

    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out."
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isAdmin = profile?.roles?.includes("admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
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
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Dragon Shield IPTV</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.username}
            </span>
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/admin")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Account Status */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{profile?.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={profile?.status === "active" ? "default" : "destructive"}>
                    {profile?.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <div className="flex gap-2">
                    {profile?.roles?.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Package</p>
                      <p className="font-medium">{subscription.package.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{subscription.package.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Concurrent Streams</p>
                      <p className="font-medium">{subscription.package.concurrent_limit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expires</p>
                      <p className="font-medium">
                        {new Date(subscription.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
                      {subscription.status}
                    </Badge>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No active subscription found. Please contact support to activate your account.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tv className="h-5 w-5 mr-2" />
                Available Channels
              </CardTitle>
              <CardDescription>
                {subscription ? `Access to ${channels.length}+ channels` : "No subscription active"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channels.map((channel) => (
                    <Card key={channel.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{channel.name}</h4>
                            <p className="text-sm text-muted-foreground">{channel.category}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4 mr-1" />
                            Watch
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Subscribe to a package to access streaming channels.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
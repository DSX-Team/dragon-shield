import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Server, 
  Activity,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const SellerPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeSubscriptions: 0,
    revenue: 0,
    commissionRate: 25,
    availableBalance: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    checkSellerAccess();
    loadSellerStats();
  }, []);

  const checkSellerAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.roles?.includes("seller")) {
      toast.error("Access denied. Seller privileges required.");
      navigate("/dashboard");
      return;
    }
    
    setLoading(false);
  };

  const loadSellerStats = async () => {
    // Mock data for demo - in real implementation, these would come from database
    setStats({
      totalCustomers: 247,
      activeSubscriptions: 189,
      revenue: 15420,
      commissionRate: 25,
      availableBalance: 3855,
      totalEarnings: 18750
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Seller Panel</h1>
                <p className="text-muted-foreground">Dragon Shield IPTV Reseller Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-success text-success-foreground">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active Seller
              </Badge>
              <Avatar>
                <AvatarFallback>RS</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-success">+12</span> from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-success">+8</span> this week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.availableBalance}</div>
              <p className="text-xs text-muted-foreground">
                Ready for withdrawal
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.commissionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Per subscription sold
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Your sales performance this month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sales Target</span>
                      <span>76%</span>
                    </div>
                    <Progress value={76} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Customer Retention</span>
                      <span>94%</span>
                    </div>
                    <Progress value={94} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Support Rating</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Manage your business efficiently</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Add New Customer
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Create Subscription
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Request Payout
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage your customer base and their subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Customer Management Coming Soon</h3>
                  <p className="text-muted-foreground mb-4">
                    Advanced customer management tools will be available in the next update.
                  </p>
                  <Button variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    Notify Me When Ready
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage active subscriptions and packages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Subscription Tools Coming Soon</h3>
                  <p className="text-muted-foreground mb-4">
                    Comprehensive subscription management will be available soon.
                  </p>
                  <Button variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    Get Early Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>Track your commissions and payouts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-success">${stats.totalEarnings}</div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">${stats.availableBalance}</div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-warning">$2,105</div>
                    <p className="text-sm text-muted-foreground">Pending Payout</p>
                  </div>
                </div>
                <Button className="w-full">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Request Payout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marketing Tools</CardTitle>
                  <CardDescription>Promote your IPTV services effectively</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Generate Referral Links
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Download Marketing Materials
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Create Promotional Codes
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Support Tools</CardTitle>
                  <CardDescription>Help your customers effectively</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Knowledge Base
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Ticket System
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Live Chat Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SellerPanel;
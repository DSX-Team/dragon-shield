import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Pencil, Trash2, UserPlus, Users, Activity, Wifi, WifiOff, 
  Ban, UnlockKeyhole, Key, Download, Upload, Copy, Eye, EyeOff,
  CreditCard, Clock, MapPin, Globe, Settings2, Zap, PlayCircle,
  Package, Tv, Film, Radio, MonitorPlay
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";

interface Client {
  id: string;
  user_id: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
  max_connections: number;
  allowed_ips: string[];
  banned_ips: string[];
  is_trial: boolean;
  trial_expires_at: string | null;
  notes: string;
  last_ip: unknown;
  total_bandwidth_used: number;
  daily_bandwidth_limit: number;
  user_agent: string;
  country_code: string;
  timezone: string;
  reseller_id: string;
  parent_id: string;
  credits: number;
  bouquet_ids: string[];
  api_password: string;
}

interface Package {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  active: boolean;
  bouquet_ids?: string[];
}

interface Bouquet {
  id: string;
  name: string;
  description: string;
  is_adult: boolean;
}

interface Subscription {
  id: string;
  user_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  status: string;
  package?: Package;
}

interface ClientManagementProps {
  onUpdate?: () => void;
}

export const ClientManagement = ({ onUpdate }: ClientManagementProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    status: "active",
    max_connections: 1,
    allowed_ips: "",
    banned_ips: "",
    is_trial: false,
    trial_expires_at: "",
    notes: "",
    daily_bandwidth_limit: "",
    country_code: "",
    timezone: "",
    bouquet_ids: [] as string[],
    package_id: "",
    subscription_days: 30
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      console.log("Fetching client data...");
      
      // Fetch only regular clients (not admins or resellers)
      const { data: clientsData, error: clientsError } = await supabase
        .from("profiles")
        .select("*")
        .contains("roles", ["user"])
        .not("roles", "cs", "{admin}")
        .not("roles", "cs", "{reseller}")
        .order("created_at", { ascending: false });

      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
        throw clientsError;
      }

      // Fetch packages with bouquets
      const { data: packagesData, error: packagesError } = await supabase
        .from("packages")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true });

      if (packagesError) {
        console.error("Error fetching packages:", packagesError);
        throw packagesError;
      }

      // Fetch bouquets
      const { data: bouquetsData, error: bouquetsError } = await supabase
        .from("bouquets")
        .select("id, name, description, is_adult")
        .order("sort_order", { ascending: true });

      if (bouquetsError) {
        console.error("Error fetching bouquets:", bouquetsError);
        throw bouquetsError;
      }

      // Fetch active subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select(`
          *,
          packages(name, price, duration_days)
        `)
        .eq("status", "active");

      if (subscriptionsError) {
        console.error("Error fetching subscriptions:", subscriptionsError);
        throw subscriptionsError;
      }

      console.log("Data fetched successfully:", {
        clients: clientsData?.length,
        packages: packagesData?.length,
        bouquets: bouquetsData?.length,
        subscriptions: subscriptionsData?.length
      });

      setClients(clientsData || []);
      setPackages(packagesData || []);
      setBouquets(bouquetsData || []);
      setSubscriptions(subscriptionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load client data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.email || (!editingClient && !formData.password)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const profileData = {
        username: formData.username,
        roles: ["user"], // Only regular users
        status: formData.status,
        max_connections: formData.max_connections,
        allowed_ips: formData.allowed_ips ? formData.allowed_ips.split(',').map(ip => ip.trim()) : null,
        banned_ips: formData.banned_ips ? formData.banned_ips.split(',').map(ip => ip.trim()) : null,
        is_trial: formData.is_trial,
        trial_expires_at: formData.trial_expires_at || null,
        notes: formData.notes,
        daily_bandwidth_limit: formData.daily_bandwidth_limit ? parseInt(formData.daily_bandwidth_limit) : null,
        country_code: formData.country_code,
        timezone: formData.timezone,
        bouquet_ids: formData.bouquet_ids,
        api_password: editingClient?.api_password || generateApiPassword()
      };

      // If package is selected, auto-assign its bouquets
      if (formData.package_id) {
        const selectedPackage = packages.find(p => p.id === formData.package_id);
        if (selectedPackage?.bouquet_ids) {
          profileData.bouquet_ids = selectedPackage.bouquet_ids;
        }
      }

      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", editingClient.id);

        if (error) throw error;

        // Update subscription if package changed
        if (formData.package_id) {
          const existingSubscription = subscriptions.find(s => s.user_id === editingClient.user_id);
          
          if (existingSubscription && existingSubscription.package_id !== formData.package_id) {
            // End current subscription
            await supabase
              .from("subscriptions")
              .update({ status: "expired", end_date: new Date().toISOString() })
              .eq("id", existingSubscription.id);
          }

          if (!existingSubscription || existingSubscription.package_id !== formData.package_id) {
            // Create new subscription
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + formData.subscription_days);

            await supabase
              .from("subscriptions")
              .insert({
                user_id: editingClient.user_id,
                package_id: formData.package_id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: "active"
              });
          }
        }

        toast({
          title: "Success",
          description: "Client updated successfully"
        });
      } else {
        // Create new client
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username: formData.username
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update(profileData)
            .eq("user_id", authData.user.id);

          if (profileError) throw profileError;

          // Create subscription if package selected
          if (formData.package_id) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + formData.subscription_days);

            await supabase
              .from("subscriptions")
              .insert({
                user_id: authData.user.id,
                package_id: formData.package_id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: "active"
              });
          }
        }

        toast({
          title: "Success",
          description: "Client created successfully"
        });
      }

      setShowDialog(false);
      setEditingClient(null);
      resetForm();
      fetchAllData();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save client",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      status: "active",
      max_connections: 1,
      allowed_ips: "",
      banned_ips: "",
      is_trial: false,
      trial_expires_at: "",
      notes: "",
      daily_bandwidth_limit: "",
      country_code: "",
      timezone: "",
      bouquet_ids: [],
      package_id: "",
      subscription_days: 30
    });
    setActiveTab("basic");
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    
    // Get current subscription
    const currentSubscription = subscriptions.find(s => s.user_id === client.user_id && s.status === 'active');
    
    setFormData({
      username: client.username,
      email: client.email,
      password: "",
      status: client.status,
      max_connections: client.max_connections || 1,
      allowed_ips: client.allowed_ips?.join(', ') || "",
      banned_ips: client.banned_ips?.join(', ') || "",
      is_trial: client.is_trial || false,
      trial_expires_at: client.trial_expires_at || "",
      notes: client.notes || "",
      daily_bandwidth_limit: client.daily_bandwidth_limit?.toString() || "",
      country_code: client.country_code || "",
      timezone: client.timezone || "",
      bouquet_ids: client.bouquet_ids || [],
      package_id: currentSubscription?.package_id || "",
      subscription_days: 30
    });
    setShowDialog(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client? This will also cancel their subscriptions.")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client deleted successfully"
      });
      fetchAllData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedClients.length === 0) {
      toast({
        title: "Error",
        description: "Please select clients first",
        variant: "destructive"
      });
      return;
    }

    try {
      let updateData: any = {};
      
      switch (action) {
        case 'activate':
          updateData = { status: 'active' };
          break;
        case 'deactivate':
          updateData = { status: 'inactive' };
          break;
        case 'ban':
          updateData = { status: 'banned' };
          break;
        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedClients.length} clients?`)) return;
          
          const { error: deleteError } = await supabase
            .from("profiles")
            .delete()
            .in("id", selectedClients);

          if (deleteError) throw deleteError;
          
          toast({
            title: "Success",
            description: `${selectedClients.length} clients deleted successfully`
          });
          setSelectedClients([]);
          fetchAllData();
          onUpdate?.();
          return;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .in("id", selectedClients);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedClients.length} clients updated successfully`
      });
      setSelectedClients([]);
      fetchAllData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive"
      });
    }
  };

    const handleDownloadM3U = async (client: Client) => {
      if (!client.api_password) {
        toast({
          title: "Error",
          description: "Client doesn't have an API password set. Please generate one first.",
          variant: "destructive"
        });
        return;
      }

      try {
        const supabaseUrl = "https://ccibslznriatjflaknso.supabase.co";
        const playlistUrl = `${supabaseUrl}/functions/v1/playlist-generator?username=${encodeURIComponent(client.username)}&password=${encodeURIComponent(client.api_password)}&format=both`;
        
        const response = await fetch(playlistUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const m3uContent = await response.text();
        const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${client.username}_playlist.m3u`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: `M3U playlist downloaded for ${client.username}`
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to download M3U playlist",
          variant: "destructive"
        });
      }
    };

  const handleBouquetToggle = (bouquetId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        bouquet_ids: [...formData.bouquet_ids, bouquetId]
      });
    } else {
      setFormData({
        ...formData,
        bouquet_ids: formData.bouquet_ids.filter(id => id !== bouquetId)
      });
    }
  };

  const openAddDialog = () => {
    setEditingClient(null);
    resetForm();
    setShowDialog(true);
  };

  const getClientSubscription = (client: Client) => {
    return subscriptions.find(s => s.user_id === client.user_id && s.status === 'active');
  };

  const getBouquetNames = (bouquetIds: string[]) => {
    if (!bouquetIds || bouquetIds.length === 0) return "No bouquets";
    return bouquetIds.map(id => {
      const bouquet = bouquets.find(b => b.id === id);
      return bouquet?.name || "Unknown";
    }).join(", ");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Management
            </CardTitle>
            <CardDescription>Manage client accounts, packages, and bouquets</CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedClients.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                  <Wifi className="w-4 h-4 mr-1" />
                  Activate
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')}>
                  <WifiOff className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('ban')}>
                  <Ban className="w-4 h-4 mr-1" />
                  Ban
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete ({selectedClients.length})
                </Button>
              </div>
            )}
            <Button onClick={openAddDialog}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedClients.length === clients.length && clients.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedClients(clients.map(c => c.id));
                      } else {
                        setSelectedClients([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Bouquets</TableHead>
                <TableHead>Connections</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const subscription = getClientSubscription(client);
                
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClients([...selectedClients, client.id]);
                          } else {
                            setSelectedClients(selectedClients.filter(id => id !== client.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{client.username}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>
                      <StatusBadge variant={
                        client.status === 'active' ? 'active' : 
                        client.status === 'banned' ? 'destructive' : 'inactive'
                      }>
                        {client.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {subscription ? (
                        <div>
                          <Badge variant="secondary">{subscription.package?.name}</Badge>
                          <div className="text-xs text-muted-foreground">
                            Expires: {new Date(subscription.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No package</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {client.bouquet_ids && client.bouquet_ids.length > 0 ? (
                          <Badge variant="outline">{client.bouquet_ids.length} bouquets</Badge>
                        ) : (
                          <span className="text-muted-foreground">No bouquets</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.max_connections} max</Badge>
                    </TableCell>
                    <TableCell>
                      {client.is_trial ? (
                        <Badge variant="secondary">Trial</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadM3U(client)}
                          title="Download M3U"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No clients found. Create your first client to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Create New Client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? "Update client information, subscriptions, and bouquets" : "Create a new client with subscriptions and access settings"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="subscription">Package</TabsTrigger>
              <TabsTrigger value="bouquets">Bouquets</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!!editingClient}
                  />
                </div>
                
                {!editingClient && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_connections">Max Connections</Label>
                  <Input
                    id="max_connections"
                    type="number"
                    min="1"
                    value={formData.max_connections}
                    onChange={(e) => setFormData({...formData, max_connections: parseInt(e.target.value) || 1})}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_trial"
                      checked={formData.is_trial}
                      onCheckedChange={(checked) => setFormData({...formData, is_trial: checked as boolean})}
                    />
                    <Label htmlFor="is_trial">Trial Account</Label>
                  </div>
                </div>
              </div>
              
              {formData.is_trial && (
                <div className="space-y-2">
                  <Label htmlFor="trial_expires_at">Trial Expires At</Label>
                  <Input
                    id="trial_expires_at"
                    type="datetime-local"
                    value={formData.trial_expires_at}
                    onChange={(e) => setFormData({...formData, trial_expires_at: e.target.value})}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="subscription" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="package_id">Package</Label>
                  <Select value={formData.package_id} onValueChange={(value) => setFormData({...formData, package_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No package</SelectItem>
                      {packages.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - ${pkg.price || "Free"} ({pkg.duration_days} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.package_id && (
                  <div className="space-y-2">
                    <Label htmlFor="subscription_days">Package Duration</Label>
                    <Select 
                      value={formData.subscription_days.toString()} 
                      onValueChange={(value) => setFormData({...formData, subscription_days: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">1 Month (30 days)</SelectItem>
                        <SelectItem value="90">3 Months (90 days)</SelectItem>
                        <SelectItem value="180">6 Months (180 days)</SelectItem>
                        <SelectItem value="365">12 Months (365 days)</SelectItem>
                        <SelectItem value="7">1 Week (7 days)</SelectItem>
                        <SelectItem value="14">2 Weeks (14 days)</SelectItem>
                        <SelectItem value="60">2 Months (60 days)</SelectItem>
                        <SelectItem value="730">24 Months (730 days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              {editingClient && getClientSubscription(editingClient) && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Current Package</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>Package: {getClientSubscription(editingClient)?.package?.name}</p>
                    <p>Expires: {new Date(getClientSubscription(editingClient)!.end_date).toLocaleDateString()}</p>
                    <p>Status: {getClientSubscription(editingClient)?.status}</p>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="bouquets" className="space-y-4">
              <div className="space-y-4">
                {formData.package_id ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Package Bouquets</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        The selected package includes these bouquets automatically:
                      </p>
                      {(() => {
                        const selectedPackage = packages.find(p => p.id === formData.package_id);
                        const packageBouquets = selectedPackage?.bouquet_ids 
                          ? bouquets.filter(b => selectedPackage.bouquet_ids!.includes(b.id))
                          : [];
                        
                        return packageBouquets.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {packageBouquets.map(bouquet => (
                              <div key={bouquet.id} className="flex items-center space-x-2 p-2 bg-background rounded border">
                                <Tv className="w-4 h-4 text-primary" />
                                <span className="text-sm">{bouquet.name}</span>
                                {bouquet.is_adult && (
                                  <Badge variant="secondary" className="text-xs">Adult</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No bouquets included in this package</p>
                        );
                      })()}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Additional Bouquets (Optional)</Label>
                      <p className="text-sm text-muted-foreground">
                        Select additional bouquets beyond what's included in the package:
                      </p>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {bouquets.filter(bouquet => {
                          const selectedPackage = packages.find(p => p.id === formData.package_id);
                          return !selectedPackage?.bouquet_ids?.includes(bouquet.id);
                        }).map(bouquet => (
                          <div key={bouquet.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bouquet-${bouquet.id}`}
                              checked={formData.bouquet_ids.includes(bouquet.id)}
                              onCheckedChange={(checked) => handleBouquetToggle(bouquet.id, checked as boolean)}
                            />
                            <Label 
                              htmlFor={`bouquet-${bouquet.id}`} 
                              className="text-sm flex items-center space-x-2 cursor-pointer"
                            >
                              <Tv className="w-4 h-4" />
                              <span>{bouquet.name}</span>
                              {bouquet.is_adult && (
                                <Badge variant="secondary" className="text-xs">Adult</Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Settings2 className="w-4 h-4 text-yellow-600" />
                        <p className="text-sm text-yellow-800">
                          Select a subscription package first to see available bouquets, or manually assign bouquets below.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Manual Bouquet Selection</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {bouquets.map(bouquet => (
                          <div key={bouquet.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bouquet-${bouquet.id}`}
                              checked={formData.bouquet_ids.includes(bouquet.id)}
                              onCheckedChange={(checked) => handleBouquetToggle(bouquet.id, checked as boolean)}
                            />
                            <Label 
                              htmlFor={`bouquet-${bouquet.id}`} 
                              className="text-sm flex items-center space-x-2 cursor-pointer"
                            >
                              <Tv className="w-4 h-4" />
                              <span>{bouquet.name}</span>
                              {bouquet.is_adult && (
                                <Badge variant="secondary" className="text-xs">Adult</Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allowed_ips">Allowed IPs (comma separated)</Label>
                  <Textarea
                    id="allowed_ips"
                    value={formData.allowed_ips}
                    onChange={(e) => setFormData({...formData, allowed_ips: e.target.value})}
                    placeholder="192.168.1.1, 10.0.0.1"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="banned_ips">Banned IPs (comma separated)</Label>
                  <Textarea
                    id="banned_ips"
                    value={formData.banned_ips}
                    onChange={(e) => setFormData({...formData, banned_ips: e.target.value})}
                    placeholder="192.168.1.100, 10.0.0.100"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="daily_bandwidth_limit">Daily Bandwidth Limit (MB)</Label>
                  <Input
                    id="daily_bandwidth_limit"
                    type="number"
                    value={formData.daily_bandwidth_limit}
                    onChange={(e) => setFormData({...formData, daily_bandwidth_limit: e.target.value})}
                    placeholder="1000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country_code">Country Code</Label>
                  <Input
                    id="country_code"
                    value={formData.country_code}
                    onChange={(e) => setFormData({...formData, country_code: e.target.value})}
                    placeholder="US, UK, RO"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                    placeholder="Europe/Bucharest"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingClient ? "Update" : "Create"} Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
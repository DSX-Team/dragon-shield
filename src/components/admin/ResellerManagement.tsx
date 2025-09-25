import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Pencil, Trash2, UserPlus, Users, CreditCard, 
  DollarSign, Package, TrendingUp, Eye, Settings2,
  Crown, Shield
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";

interface Reseller {
  id: string;
  user_id: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
  credits: number;
  credit_price: number;
  allowed_packages: string[];
  max_users: number;
  created_users: number;
  commission_rate: number;
  is_active: boolean;
  notes: string;
}

interface Package {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface ResellerManagementProps {
  onUpdate?: () => void;
}

export const ResellerManagement = ({ onUpdate }: ResellerManagementProps) => {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResellers, setSelectedResellers] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    status: "active",
    credits: 0,
    credit_price: 1.0,
    allowed_packages: [] as string[],
    max_users: 100,
    commission_rate: 0.1,
    notes: ""
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch resellers with their profile data
      const { data: resellersData, error: resellersError } = await supabase
        .from("resellers")
        .select(`
          *,
          profiles!inner(
            username,
            email,
            status,
            created_at,
            credits,
            notes
          )
        `)
        .order("created_at", { ascending: false });

      if (resellersError) throw resellersError;

      // Fetch available packages
      const { data: packagesData, error: packagesError } = await supabase
        .from("packages")
        .select("id, name, price, active")
        .eq("active", true)
        .order("name", { ascending: true });

      if (packagesError) throw packagesError;

      // Transform the data to match our interface
      const transformedResellers = resellersData?.map(r => ({
        id: r.id,
        user_id: r.user_id,
        username: r.profiles.username,
        email: r.profiles.email,
        status: r.profiles.status,
        created_at: r.profiles.created_at,
        credits: r.profiles.credits,
        credit_price: r.credit_price,
        allowed_packages: r.allowed_packages || [],
        max_users: r.max_users,
        created_users: r.created_users,
        commission_rate: r.commission_rate,
        is_active: r.is_active,
        notes: r.profiles.notes || ""
      })) || [];

      setResellers(transformedResellers);
      setPackages(packagesData || []);
    } catch (error) {
      console.error("Error fetching resellers:", error);
      toast({
        title: "Error",
        description: "Failed to load resellers data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.email || (!editingReseller && !formData.password)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingReseller) {
        // Update existing reseller
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            username: formData.username,
            status: formData.status,
            credits: formData.credits,
            notes: formData.notes,
            roles: ['reseller']
          })
          .eq("user_id", editingReseller.user_id);

        if (profileError) throw profileError;

        const { error: resellerError } = await supabase
          .from("resellers")
          .update({
            credit_price: formData.credit_price,
            allowed_packages: formData.allowed_packages,
            max_users: formData.max_users,
            commission_rate: formData.commission_rate,
            is_active: formData.status === 'active'
          })
          .eq("id", editingReseller.id);

        if (resellerError) throw resellerError;

        toast({
          title: "Success",
          description: "Reseller updated successfully"
        });
      } else {
        // Create new reseller
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
          // Update profile with reseller role
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              roles: ['reseller'],
              status: formData.status,
              credits: formData.credits,
              notes: formData.notes
            })
            .eq("user_id", authData.user.id);

          if (profileError) throw profileError;

          // Create reseller record
          const { error: resellerError } = await supabase
            .from("resellers")
            .insert([{
              user_id: authData.user.id,
              credit_price: formData.credit_price,
              allowed_packages: formData.allowed_packages,
              max_users: formData.max_users,
              commission_rate: formData.commission_rate,
              is_active: formData.status === 'active'
            }]);

          if (resellerError) throw resellerError;
        }

        toast({
          title: "Success",
          description: "Reseller created successfully"
        });
      }

      setShowDialog(false);
      setEditingReseller(null);
      resetForm();
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save reseller",
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
      credits: 0,
      credit_price: 1.0,
      allowed_packages: [],
      max_users: 100,
      commission_rate: 0.1,
      notes: ""
    });
  };

  const handleEdit = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setFormData({
      username: reseller.username,
      email: reseller.email,
      password: "",
      status: reseller.status,
      credits: reseller.credits,
      credit_price: reseller.credit_price,
      allowed_packages: reseller.allowed_packages,
      max_users: reseller.max_users,
      commission_rate: reseller.commission_rate,
      notes: reseller.notes
    });
    setShowDialog(true);
  };

  const handleDelete = async (resellerId: string) => {
    if (!confirm("Are you sure you want to delete this reseller? This will also delete all their clients.")) return;

    try {
      const { error } = await supabase
        .from("resellers")
        .delete()
        .eq("id", resellerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reseller deleted successfully"
      });
      fetchData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reseller",
        variant: "destructive"
      });
    }
  };

  const handlePackageToggle = (packageId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        allowed_packages: [...formData.allowed_packages, packageId]
      });
    } else {
      setFormData({
        ...formData,
        allowed_packages: formData.allowed_packages.filter(id => id !== packageId)
      });
    }
  };

  const openAddDialog = () => {
    setEditingReseller(null);
    resetForm();
    setShowDialog(true);
  };

  const getPackageName = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    return pkg?.name || "Unknown Package";
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
              <Crown className="h-5 w-5 text-yellow-500" />
              Reseller Management
            </CardTitle>
            <CardDescription>Manage reseller accounts and their permissions</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Reseller
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Packages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.map((reseller) => (
                <TableRow key={reseller.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      {reseller.username}
                    </div>
                  </TableCell>
                  <TableCell>{reseller.email}</TableCell>
                  <TableCell>
                    <StatusBadge variant={
                      reseller.status === 'active' ? 'active' : 
                      reseller.status === 'banned' ? 'destructive' : 'inactive'
                    }>
                      {reseller.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{reseller.credits.toFixed(2)}</span>
                      <span className="text-muted-foreground text-xs">
                        (@${reseller.credit_price})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{reseller.created_users}/{reseller.max_users}</div>
                      <div className="text-muted-foreground">users</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {(reseller.commission_rate * 100).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {reseller.allowed_packages.length} packages
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(reseller.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(reseller)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(reseller.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {resellers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No resellers found. Create your first reseller to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingReseller ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              {editingReseller ? "Edit Reseller" : "Create New Reseller"}
            </DialogTitle>
            <DialogDescription>
              {editingReseller ? "Update reseller information and permissions" : "Create a new reseller account"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
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
                  disabled={!!editingReseller}
                />
              </div>
              
              {!editingReseller && (
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
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  step="0.01"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-price">Credit Price ($)</Label>
                <Input
                  id="credit-price"
                  type="number"
                  step="0.01"
                  value={formData.credit_price}
                  onChange={(e) => setFormData({...formData, credit_price: parseFloat(e.target.value) || 1.0})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-users">Max Users</Label>
                <Input
                  id="max-users"
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({...formData, max_users: parseInt(e.target.value) || 100})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission">Commission Rate (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({...formData, commission_rate: parseFloat(e.target.value) || 0.1})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed Packages ({formData.allowed_packages.length} selected)</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-4 space-y-2">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`package-${pkg.id}`}
                      checked={formData.allowed_packages.includes(pkg.id)}
                      onCheckedChange={(checked) => handlePackageToggle(pkg.id, !!checked)}
                    />
                    <Label htmlFor={`package-${pkg.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span>{pkg.name}</span>
                        <Badge variant="outline">${pkg.price}</Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this reseller..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingReseller ? "Update" : "Create"} Reseller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
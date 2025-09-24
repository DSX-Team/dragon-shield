import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

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

interface SubscriptionManagementProps {
  subscriptions: Subscription[];
  onSubscriptionsUpdate: () => void;
}

export const SubscriptionManagement = ({ subscriptions, onSubscriptionsUpdate }: SubscriptionManagementProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    user_id: "",
    package_id: "",
    status: "active",
    start_date: "",
    end_date: ""
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsersAndPackages();
  }, []);

  const fetchUsersAndPackages = async () => {
    try {
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, username, email, user_id")
        .order("username");

      const { data: packagesData } = await supabase
        .from("packages")
        .select("id, name, duration_days")
        .eq("active", true)
        .order("name");

      setUsers(usersData || []);
      setPackages(packagesData || []);
    } catch (error) {
      console.error("Error fetching users and packages:", error);
    }
  };

  const calculateEndDate = (startDate: string, packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg || !startDate) return "";
    
    const start = new Date(startDate);
    start.setDate(start.getDate() + (pkg.duration_days || 30));
    return start.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!formData.user_id || !formData.package_id || !formData.start_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const subscriptionData = {
        user_id: formData.user_id,
        package_id: formData.package_id,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date
      };

      if (editingSubscription) {
        // Update existing subscription
        const { error } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", editingSubscription.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Subscription updated successfully"
        });
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("subscriptions")
          .insert(subscriptionData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Subscription created successfully"
        });
      }

      setShowDialog(false);
      setEditingSubscription(null);
      setFormData({
        user_id: "",
        package_id: "",
        status: "active",
        start_date: "",
        end_date: ""
      });
      onSubscriptionsUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subscription",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      user_id: subscription.user_id,
      package_id: subscription.package_id,
      status: subscription.status,
      start_date: subscription.start_date.split('T')[0],
      end_date: subscription.end_date.split('T')[0]
    });
    setShowDialog(true);
  };

  const handleDelete = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", subscriptionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription deleted successfully"
      });
      onSubscriptionsUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    setEditingSubscription(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      user_id: "",
      package_id: "",
      status: "active",
      start_date: today,
      end_date: ""
    });
    setShowDialog(true);
  };

  // Auto-calculate end date when start date or package changes
  useEffect(() => {
    if (formData.start_date && formData.package_id) {
      const endDate = calculateEndDate(formData.start_date, formData.package_id);
      setFormData(prev => ({ ...prev, end_date: endDate }));
    }
  }, [formData.start_date, formData.package_id, packages]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>Manage user subscriptions and billing</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <CreditCard className="w-4 h-4 mr-2" />
            Add Subscription
          </Button>
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
                <TableHead>Actions</TableHead>
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
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(subscription)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(subscription.id)}
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubscription ? "Edit Subscription" : "Add New Subscription"}</DialogTitle>
            <DialogDescription>
              {editingSubscription ? "Update subscription information" : "Create a new user subscription"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user_id">User</Label>
              <Select value={formData.user_id} onValueChange={(value) => setFormData({...formData, user_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="package_id">Package</Label>
              <Select value={formData.package_id} onValueChange={(value) => setFormData({...formData, package_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.duration_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingSubscription ? "Update" : "Create"} Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
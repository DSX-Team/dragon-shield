import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface PackageData {
  id: string;
  name: string;
  description?: string;
  price?: number;
  duration_days?: number;
  concurrent_limit?: number;
  active: boolean;
  created_at: string;
  features?: any;
  bitrate_limits?: any;
}

interface PackageManagementProps {
  packages: PackageData[];
  onPackagesUpdate: () => void;
}

export const PackageManagement = ({ packages, onPackagesUpdate }: PackageManagementProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "30",
    concurrent_limit: "1",
    active: true,
    features: "",
    max_bitrate: ""
  });
  
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Package name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const packageData = {
        name: formData.name,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        duration_days: parseInt(formData.duration_days) || 30,
        concurrent_limit: parseInt(formData.concurrent_limit) || 1,
        active: formData.active,
        features: formData.features ? { features: formData.features.split(',').map(f => f.trim()) } : {},
        bitrate_limits: formData.max_bitrate ? { max_bitrate: formData.max_bitrate } : {}
      };

      if (editingPackage) {
        // Update existing package
        const { error } = await supabase
          .from("packages")
          .update(packageData)
          .eq("id", editingPackage.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Package updated successfully"
        });
      } else {
        // Create new package
        const { error } = await supabase
          .from("packages")
          .insert(packageData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Package created successfully"
        });
      }

      setShowDialog(false);
      setEditingPackage(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        duration_days: "30",
        concurrent_limit: "1",
        active: true,
        features: "",
        max_bitrate: ""
      });
      onPackagesUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save package",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (pkg: PackageData) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price?.toString() || "",
      duration_days: pkg.duration_days?.toString() || "30",
      concurrent_limit: pkg.concurrent_limit?.toString() || "1",
      active: pkg.active,
      features: pkg.features?.features ? pkg.features.features.join(', ') : "",
      max_bitrate: pkg.bitrate_limits?.max_bitrate || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;

    try {
      const { error } = await supabase
        .from("packages")
        .delete()
        .eq("id", packageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Package deleted successfully"
      });
      onPackagesUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete package",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    setEditingPackage(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      duration_days: "30",
      concurrent_limit: "1",
      active: true,
      features: "",
      max_bitrate: ""
    });
    setShowDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Package Management</CardTitle>
            <CardDescription>Manage subscription packages and pricing</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Package className="w-4 h-4 mr-2" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Concurrent Streams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>${pkg.price || "Free"}</TableCell>
                  <TableCell>{pkg.duration_days} days</TableCell>
                  <TableCell>{pkg.concurrent_limit}</TableCell>
                  <TableCell>
                    <StatusBadge variant={pkg.active ? 'active' : 'inactive'}>
                      {pkg.active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(pkg.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit Package" : "Add New Package"}</DialogTitle>
            <DialogDescription>
              {editingPackage ? "Update package information" : "Configure a new subscription package"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name</Label>
              <Input
                id="name"
                placeholder="e.g. Premium HD"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="29.99"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration_days">Duration (days)</Label>
              <Input
                id="duration_days"
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="concurrent_limit">Concurrent Streams</Label>
              <Input
                id="concurrent_limit"
                type="number"
                value={formData.concurrent_limit}
                onChange={(e) => setFormData({...formData, concurrent_limit: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_bitrate">Max Bitrate</Label>
              <Input
                id="max_bitrate"
                placeholder="e.g. 1080p, 4K"
                value={formData.max_bitrate}
                onChange={(e) => setFormData({...formData, max_bitrate: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="active">Status</Label>
              <Select value={formData.active.toString()} onValueChange={(value) => setFormData({...formData, active: value === "true"})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Package description..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="features">Features (comma separated)</Label>
              <Input
                id="features"
                placeholder="HD Quality, DVR, Multiple Devices"
                value={formData.features}
                onChange={(e) => setFormData({...formData, features: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPackage ? "Update" : "Create"} Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
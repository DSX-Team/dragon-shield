import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Package, Tv, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";

interface Bouquet {
  id: string;
  name: string;
  description: string;
  channel_ids: string[];
  is_adult: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Channel {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

interface BouquetManagementProps {
  onUpdate?: () => void;
}

export const BouquetManagement = ({ onUpdate }: BouquetManagementProps) => {
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBouquet, setEditingBouquet] = useState<Bouquet | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    channel_ids: [] as string[],
    is_adult: false,
    sort_order: 0
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch bouquets
      const { data: bouquetsData, error: bouquetsError } = await supabase
        .from("bouquets")
        .select("*")
        .order("sort_order", { ascending: true });

      if (bouquetsError) throw bouquetsError;

      // Fetch channels
      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("id, name, category, active")
        .eq("active", true)
        .order("name", { ascending: true });

      if (channelsError) throw channelsError;

      setBouquets(bouquetsData || []);
      setChannels(channelsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load bouquets data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bouquet name",
        variant: "destructive"
      });
      return;
    }

    try {
      const bouquetData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        channel_ids: formData.channel_ids,
        is_adult: formData.is_adult,
        sort_order: formData.sort_order
      };

      if (editingBouquet) {
        const { error } = await supabase
          .from("bouquets")
          .update(bouquetData)
          .eq("id", editingBouquet.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Bouquet updated successfully"
        });
      } else {
        const { error } = await supabase
          .from("bouquets")
          .insert([bouquetData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Bouquet created successfully"
        });
      }

      setShowDialog(false);
      setEditingBouquet(null);
      resetForm();
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save bouquet",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      channel_ids: [],
      is_adult: false,
      sort_order: bouquets.length
    });
  };

  const handleEdit = (bouquet: Bouquet) => {
    setEditingBouquet(bouquet);
    setFormData({
      name: bouquet.name,
      description: bouquet.description || "",
      channel_ids: bouquet.channel_ids || [],
      is_adult: bouquet.is_adult || false,
      sort_order: bouquet.sort_order || 0
    });
    setShowDialog(true);
  };

  const handleDelete = async (bouquetId: string) => {
    if (!confirm("Are you sure you want to delete this bouquet?")) return;

    try {
      const { error } = await supabase
        .from("bouquets")
        .delete()
        .eq("id", bouquetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bouquet deleted successfully"
      });
      fetchData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bouquet",
        variant: "destructive"
      });
    }
  };

  const handleChannelToggle = (channelId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        channel_ids: [...formData.channel_ids, channelId]
      });
    } else {
      setFormData({
        ...formData,
        channel_ids: formData.channel_ids.filter(id => id !== channelId)
      });
    }
  };

  const openAddDialog = () => {
    setEditingBouquet(null);
    resetForm();
    setShowDialog(true);
  };

  const getChannelName = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    return channel?.name || "Unknown Channel";
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
              <Package className="h-5 w-5" />
              Bouquet Management
            </CardTitle>
            <CardDescription>Manage channel bouquets and packages</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Bouquet
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sort Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bouquets.map((bouquet) => (
                <TableRow key={bouquet.id}>
                  <TableCell>
                    <Badge variant="outline">{bouquet.sort_order}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{bouquet.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {bouquet.description || "No description"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4" />
                      <span>{bouquet.channel_ids?.length || 0} channels</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {bouquet.is_adult ? (
                      <Badge variant="destructive">Adult</Badge>
                    ) : (
                      <Badge variant="secondary">General</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(bouquet.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(bouquet)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(bouquet.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {bouquets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No bouquets found. Create your first bouquet to get started.
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
              {editingBouquet ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingBouquet ? "Edit Bouquet" : "Create New Bouquet"}
            </DialogTitle>
            <DialogDescription>
              {editingBouquet ? "Update bouquet information and channel selection" : "Create a new channel bouquet"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bouquet Name *</Label>
                <Input
                  id="name"
                  placeholder="Premium Sports"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sort-order">Sort Order</Label>
                <Input
                  id="sort-order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Premium sports channels including..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-adult"
                checked={formData.is_adult}
                onCheckedChange={(checked) => setFormData({...formData, is_adult: !!checked})}
              />
              <Label htmlFor="is-adult">Adult Content Bouquet</Label>
            </div>

            <div className="space-y-4">
              <Label>Select Channels ({formData.channel_ids.length} selected)</Label>
              <div className="max-h-60 overflow-y-auto border rounded-md p-4 space-y-2">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`channel-${channel.id}`}
                      checked={formData.channel_ids.includes(channel.id)}
                      onCheckedChange={(checked) => handleChannelToggle(channel.id, !!checked)}
                    />
                    <Label htmlFor={`channel-${channel.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span>{channel.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {channel.category}
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
                {channels.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No channels available. Add channels first to create bouquets.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingBouquet ? "Update" : "Create"} Bouquet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
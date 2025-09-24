import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface Channel {
  id: string;
  name: string;
  category: string;
  active: boolean;
  created_at: string;
  upstream_sources: any;
  logo_url?: string;
}

interface ChannelManagementProps {
  channels: Channel[];
  onChannelsUpdate: () => void;
}

export const ChannelManagement = ({ channels, onChannelsUpdate }: ChannelManagementProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "General",
    upstream_url: "",
    logo_url: ""
  });
  
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.name || !formData.upstream_url) {
      toast({
        title: "Error",
        description: "Channel name and upstream URL are required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingChannel) {
        // Update existing channel
        const { error } = await supabase
          .from("channels")
          .update({
            name: formData.name,
            category: formData.category,
            logo_url: formData.logo_url,
            upstream_sources: [{ url: formData.upstream_url, type: "m3u8" }]
          })
          .eq("id", editingChannel.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Channel updated successfully"
        });
      } else {
        // Create new channel
        const { error } = await supabase
          .from("channels")
          .insert({
            name: formData.name,
            category: formData.category,
            logo_url: formData.logo_url,
            upstream_sources: [{ url: formData.upstream_url, type: "m3u8" }],
            active: true
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Channel added successfully"
        });
      }

      setShowDialog(false);
      setEditingChannel(null);
      setFormData({ name: "", category: "General", upstream_url: "", logo_url: "" });
      onChannelsUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save channel",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      category: channel.category,
      upstream_url: channel.upstream_sources?.[0]?.url || "",
      logo_url: channel.logo_url || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;

    try {
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Channel deleted successfully"
      });
      onChannelsUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete channel",
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

      toast({
        title: "Success",
        description: `Channel ${!currentStatus ? "enabled" : "disabled"}`
      });
      onChannelsUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update channel",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    setEditingChannel(null);
    setFormData({ name: "", category: "General", upstream_url: "", logo_url: "" });
    setShowDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Channel Management</CardTitle>
            <CardDescription>Manage streaming channels and sources</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
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
                        onClick={() => handleEdit(channel)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
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
                        onClick={() => handleDelete(channel.id)}
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
            <DialogTitle>{editingChannel ? "Edit Channel" : "Add New Channel"}</DialogTitle>
            <DialogDescription>
              {editingChannel ? "Update channel information" : "Configure a new streaming channel"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                placeholder="e.g. CNN HD"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. News"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="upstream_url">Stream URL</Label>
              <Input
                id="upstream_url"
                placeholder="https://example.com/stream.m3u8"
                value={formData.upstream_url}
                onChange={(e) => setFormData({...formData, upstream_url: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL (Optional)</Label>
              <Input
                id="logo_url"
                placeholder="https://example.com/logo.png"
                value={formData.logo_url}
                onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingChannel ? "Update" : "Add"} Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
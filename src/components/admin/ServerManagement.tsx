import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Power, PowerOff, Server, Activity, HardDrive } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface StreamingServer {
  id: string;
  name: string;
  hostname: string;
  ip_address: string;
  port: number;
  ssh_port: number;
  ssh_username: string;
  ssh_password?: string;
  ssh_key?: string;
  os_version: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  max_clients: number;
  current_clients: number;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  bandwidth_in?: number;
  bandwidth_out?: number;
  last_ping?: string;
  active: boolean;
  notes?: string;
  config: any;
  created_at: string;
}

interface ServerManagementProps {
  servers: StreamingServer[];
  onServersUpdate: () => void;
}

export const ServerManagement = ({ servers, onServersUpdate }: ServerManagementProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<StreamingServer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    hostname: "",
    ip_address: "",
    port: 8080,
    ssh_port: 22,
    ssh_username: "root",
    ssh_password: "",
    ssh_key: "",
    os_version: "Ubuntu 22.04",
    max_clients: 1000,
    notes: ""
  });
  
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.name || !formData.hostname || !formData.ip_address) {
      toast({
        title: "Eroare",
        description: "Numele, hostname-ul și adresa IP sunt obligatorii",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingServer) {
        // Update existing server
        const { error } = await supabase
          .from("streaming_servers")
          .update({
            name: formData.name,
            hostname: formData.hostname,
            ip_address: formData.ip_address,
            port: formData.port,
            ssh_port: formData.ssh_port,
            ssh_username: formData.ssh_username,
            ssh_password: formData.ssh_password || null,
            ssh_key: formData.ssh_key || null,
            os_version: formData.os_version,
            max_clients: formData.max_clients,
            notes: formData.notes || null
          })
          .eq("id", editingServer.id);

        if (error) throw error;

        toast({
          title: "Succes",
          description: "Server actualizat cu succes"
        });
      } else {
        // Create new server
        const { error } = await supabase
          .from("streaming_servers")
          .insert({
            name: formData.name,
            hostname: formData.hostname,
            ip_address: formData.ip_address,
            port: formData.port,
            ssh_port: formData.ssh_port,
            ssh_username: formData.ssh_username,
            ssh_password: formData.ssh_password || null,
            ssh_key: formData.ssh_key || null,
            os_version: formData.os_version,
            max_clients: formData.max_clients,
            notes: formData.notes || null,
            status: 'offline',
            active: true
          });

        if (error) throw error;

        toast({
          title: "Succes",
          description: "Server adăugat cu succes"
        });
      }

      setShowDialog(false);
      setEditingServer(null);
      resetForm();
      onServersUpdate();
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut salva server-ul",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      hostname: "",
      ip_address: "",
      port: 8080,
      ssh_port: 22,
      ssh_username: "root",
      ssh_password: "",
      ssh_key: "",
      os_version: "Ubuntu 22.04",
      max_clients: 1000,
      notes: ""
    });
  };

  const handleEdit = (server: StreamingServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      hostname: server.hostname,
      ip_address: server.ip_address,
      port: server.port,
      ssh_port: server.ssh_port,
      ssh_username: server.ssh_username,
      ssh_password: server.ssh_password || "",
      ssh_key: server.ssh_key || "",
      os_version: server.os_version,
      max_clients: server.max_clients,
      notes: server.notes || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm("Sigur vrei să ștergi acest server?")) return;

    try {
      const { error } = await supabase
        .from("streaming_servers")
        .delete()
        .eq("id", serverId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Server șters cu succes"
      });
      onServersUpdate();
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge server-ul",
        variant: "destructive"
      });
    }
  };

  const toggleServerStatus = async (serverId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("streaming_servers")
        .update({ active: !currentStatus })
        .eq("id", serverId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Server ${!currentStatus ? "activat" : "dezactivat"}`
      });
      onServersUpdate();
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza server-ul",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    setEditingServer(null);
    resetForm();
    setShowDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'active';
      case 'offline': return 'inactive';
      case 'maintenance': return 'warning';
      case 'error': return 'destructive';
      default: return 'inactive';
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Managementul Serverelor
            </CardTitle>
            <CardDescription>Gestionează serverele Linux pentru streaming</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Server
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>IP/Hostname</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clienți</TableHead>
                <TableHead>Resurse</TableHead>
                <TableHead>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{server.hostname}</div>
                      <div className="text-muted-foreground">{server.ip_address}:{server.port}</div>
                    </div>
                  </TableCell>
                  <TableCell>{server.os_version}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getStatusColor(server.status)}>
                      {server.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {server.current_clients}/{server.max_clients}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      {server.cpu_usage && (
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          CPU: {server.cpu_usage.toFixed(1)}%
                        </div>
                      )}
                      {server.memory_usage && (
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          RAM: {server.memory_usage.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(server)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleServerStatus(server.id, server.active)}
                      >
                        {server.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(server.id)}
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
            <DialogTitle>{editingServer ? "Editează Server" : "Adaugă Server Nou"}</DialogTitle>
            <DialogDescription>
              {editingServer ? "Actualizează informațiile server-ului" : "Configurează un server Linux pentru streaming"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Nume Server</Label>
              <Input
                id="name"
                placeholder="ex. Server EU-1"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                id="hostname"
                placeholder="ex. stream1.example.com"
                value={formData.hostname}
                onChange={(e) => setFormData({...formData, hostname: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ip_address">Adresa IP</Label>
              <Input
                id="ip_address"
                placeholder="192.168.1.100"
                value={formData.ip_address}
                onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="port">Port HTTP</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ssh_port">Port SSH</Label>
              <Input
                id="ssh_port"
                type="number"
                value={formData.ssh_port}
                onChange={(e) => setFormData({...formData, ssh_port: parseInt(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ssh_username">Utilizator SSH</Label>
              <Input
                id="ssh_username"
                value={formData.ssh_username}
                onChange={(e) => setFormData({...formData, ssh_username: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ssh_password">Parolă SSH (opțional)</Label>
              <Input
                id="ssh_password"
                type="password"
                value={formData.ssh_password}
                onChange={(e) => setFormData({...formData, ssh_password: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="os_version">Versiune OS</Label>
              <Select value={formData.os_version} onValueChange={(value) => setFormData({...formData, os_version: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ubuntu 22.04">Ubuntu 22.04 LTS</SelectItem>
                  <SelectItem value="Ubuntu 24.04">Ubuntu 24.04 LTS</SelectItem>
                  <SelectItem value="CentOS 7">CentOS 7</SelectItem>
                  <SelectItem value="CentOS 8">CentOS 8</SelectItem>
                  <SelectItem value="Debian 11">Debian 11</SelectItem>
                  <SelectItem value="Debian 12">Debian 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_clients">Clienți Maximi</Label>
              <Input
                id="max_clients"
                type="number"
                value={formData.max_clients}
                onChange={(e) => setFormData({...formData, max_clients: parseInt(e.target.value)})}
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ssh_key">Cheie SSH (opțional)</Label>
              <Textarea
                id="ssh_key"
                placeholder="-----BEGIN RSA PRIVATE KEY-----"
                value={formData.ssh_key}
                onChange={(e) => setFormData({...formData, ssh_key: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notițe</Label>
              <Textarea
                id="notes"
                placeholder="Informații suplimentare despre server..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Anulează
            </Button>
            <Button onClick={handleSubmit}>
              {editingServer ? "Actualizează" : "Adaugă"} Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
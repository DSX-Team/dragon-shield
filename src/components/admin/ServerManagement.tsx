import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Edit, 
  Trash2, 
  Power, 
  PowerOff, 
  Plus, 
  Server, 
  Wifi, 
  WifiOff,
  Shield,
  Key,
  AlertTriangle,
  CheckCircle,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

interface StreamingServer {
  id: string;
  name: string;
  hostname: string;
  ip_address: string;
  port: number;
  ssh_port: number;
  ssh_username: string;
  os_version: string;
  status: 'online' | 'offline' | 'maintenance';
  active: boolean;
  current_clients: number;
  max_clients: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  bandwidth_in: number;
  bandwidth_out: number;
  last_ping: string;
  notes: string;
  server_key: string; // New secure identifier
  config: any;
}

interface ServerManagementProps {
  servers: StreamingServer[];
  onServersUpdate: () => void;
}

const ServerManagement = ({ servers, onServersUpdate }: ServerManagementProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<StreamingServer | null>(null);
  const [deleteServerId, setDeleteServerId] = useState<string | null>(null);
  const [connectionTest, setConnectionTest] = useState<{[key: string]: 'testing' | 'success' | 'failed'}>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ip_address: '',
    port: 80,
    ssh_port: 22,
    ssh_username: 'root',
    os_version: '',
    max_clients: 1000,
    notes: ''
  });

  const [credentialsData, setCredentialsData] = useState({
    password: '',
    privateKey: ''
  });

  const handleSubmit = async () => {
    try {
      const serverData = {
        ...formData,
        server_key: editingServer?.server_key || `server_${formData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`
      };

      if (editingServer) {
        const { error } = await supabase
          .from('streaming_servers')
          .update(serverData)
          .eq('id', editingServer.id);

        if (error) throw error;
      } else {
        const { data: newServer, error } = await supabase
          .from('streaming_servers')
          .insert([serverData])
          .select()
          .single();

        if (error) throw error;

        // If credentials were provided, store them securely
        if (credentialsData.password || credentialsData.privateKey) {
          await storeServerCredentials(newServer.id, serverData.server_key, {
            hostname: formData.hostname,
            username: formData.ssh_username,
            port: formData.ssh_port,
            password: credentialsData.password || undefined,
            privateKey: credentialsData.privateKey || undefined
          });
        }
      }

      onServersUpdate();
      resetForm();
      setShowDialog(false);
      
      toast({
        title: editingServer ? "Server updated" : "Server created",
        description: `Server ${formData.name} has been ${editingServer ? 'updated' : 'created'} successfully.`,
      });
    } catch (error) {
      console.error('Error saving server:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingServer ? 'update' : 'create'} server. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const storeServerCredentials = async (serverId: string, serverKey: string, credentials: any) => {
    try {
      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'store',
          serverId,
          serverKey,
          credentials
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to store credentials');
      }

      toast({
        title: "Credentials Secured",
        description: "Server credentials have been encrypted and stored securely.",
      });
    } catch (error) {
      console.error('Error storing credentials:', error);
      toast({
        title: "Credential Storage Warning",
        description: "Server was created but credentials could not be stored securely. Please update them later.",
        variant: "destructive"
      });
    }
  };

  const testServerConnection = async (server: StreamingServer) => {
    setConnectionTest(prev => ({ ...prev, [server.id]: 'testing' }));
    
    try {
      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'test_connection',
          serverId: server.id
        }
      });

      if (response.data?.success) {
        setConnectionTest(prev => ({ ...prev, [server.id]: 'success' }));
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${server.name}`,
        });
      } else {
        throw new Error(response.data?.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionTest(prev => ({ ...prev, [server.id]: 'failed' }));
      toast({
        title: "Connection Failed",
        description: `Failed to connect to ${server.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hostname: '',
      ip_address: '',
      port: 80,
      ssh_port: 22,
      ssh_username: 'root',
      os_version: '',
      max_clients: 1000,
      notes: ''
    });
    setCredentialsData({
      password: '',
      privateKey: ''
    });
    setEditingServer(null);
  };

  const handleEdit = (server: StreamingServer) => {
    setFormData({
      name: server.name,
      hostname: server.hostname,
      ip_address: server.ip_address,
      port: server.port,
      ssh_port: server.ssh_port,
      ssh_username: server.ssh_username,
      os_version: server.os_version,
      max_clients: server.max_clients,
      notes: server.notes || ''
    });
    setEditingServer(server);
    setShowDialog(true);
  };

  const handleDelete = async (serverId: string) => {
    try {
      const { error } = await supabase
        .from('streaming_servers')
        .delete()
        .eq('id', serverId);

      if (error) throw error;

      onServersUpdate();
      setDeleteServerId(null);
      
      toast({
        title: "Server deleted",
        description: "Server has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: "Error",
        description: "Failed to delete server. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleServerStatus = async (serverId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('streaming_servers')
        .update({ active: newStatus })
        .eq('id', serverId);

      if (error) throw error;

      onServersUpdate();
      
      toast({
        title: "Server status updated",
        description: `Server has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      console.error('Error updating server status:', error);
      toast({
        title: "Error",
        description: "Failed to update server status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'active';
      case 'offline': return 'inactive';
      case 'maintenance': return 'warning';
      default: return 'inactive';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <CardTitle>Server Management</CardTitle>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Server Info</th>
                  <th className="text-left p-3 font-medium">Network</th>
                  <th className="text-left p-3 font-medium">SSH Access</th>
                  <th className="text-left p-3 font-medium">OS</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Clients</th>
                  <th className="text-left p-3 font-medium">Resources</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => (
                  <tr key={server.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{server.name}</span>
                          <div className="text-sm text-muted-foreground">{server.hostname}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{server.ip_address}:{server.port}</div>
                        <div className="text-muted-foreground">SSH: {server.ssh_port}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{server.ssh_username}</div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Shield className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600">Encrypted</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{server.os_version}</span>
                    </td>
                    <td className="p-3">
                      <StatusBadge variant={getStatusColor(server.status)}>
                        {server.status}
                      </StatusBadge>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{server.current_clients}/{server.max_clients}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ width: `${(server.current_clients / server.max_clients) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm space-y-1">
                        <div>CPU: {server.cpu_usage?.toFixed(1)}%</div>
                        <div>RAM: {server.memory_usage?.toFixed(1)}%</div>
                        <div>Disk: {formatBytes(server.disk_usage || 0)}</div>
                      </div>
                    </td>
                    <td className="p-3 space-x-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(server)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testServerConnection(server)}
                            disabled={connectionTest[server.id] === 'testing'}
                          >
                            {connectionTest[server.id] === 'testing' && <Wifi className="h-4 w-4 animate-pulse" />}
                            {connectionTest[server.id] === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {connectionTest[server.id] === 'failed' && <WifiOff className="h-4 w-4 text-red-500" />}
                            {!connectionTest[server.id] && <Wifi className="h-4 w-4" />}
                          </Button>

                          <Button
                            size="sm"
                            variant={server.active ? "default" : "secondary"}
                            onClick={() => toggleServerStatus(server.id, !server.active)}
                          >
                            {server.active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteServerId(server.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingServer(server);
                            setShowCredentialsDialog(true);
                          }}
                          className="w-full"
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Credentials
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Server Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingServer ? "Edit Server" : "Add New Server"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Server Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Production Server 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostname">Hostname</Label>
                <Input
                  value={formData.hostname}
                  onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                  placeholder="server1.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address</Label>
                <Input
                  value={formData.ip_address}
                  onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                  placeholder="192.168.1.100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">HTTP Port</Label>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({...formData, port: parseInt(e.target.value) || 80})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ssh_port">SSH Port</Label>
                <Input
                  type="number"
                  value={formData.ssh_port}
                  onChange={(e) => setFormData({...formData, ssh_port: parseInt(e.target.value) || 22})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ssh_username">SSH Username</Label>
                <Input
                  value={formData.ssh_username}
                  onChange={(e) => setFormData({...formData, ssh_username: e.target.value})}
                  placeholder="root"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="os_version">OS Version</Label>
                <Input
                  value={formData.os_version}
                  onChange={(e) => setFormData({...formData, os_version: e.target.value})}
                  placeholder="Ubuntu 22.04"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_clients">Max Clients</Label>
                <Input
                  type="number"
                  value={formData.max_clients}
                  onChange={(e) => setFormData({...formData, max_clients: parseInt(e.target.value) || 1000})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional server information..."
                rows={3}
              />
            </div>

            {!editingServer && (
              <>
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Lock className="h-4 w-4" />
                    <Label className="font-medium">SSH Credentials (Optional)</Label>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Security Notice</p>
                        <p>Credentials will be encrypted and stored securely. You can add them later if needed.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ssh_password">SSH Password</Label>
                      <Input
                        type="password"
                        value={credentialsData.password}
                        onChange={(e) => setCredentialsData({...credentialsData, password: e.target.value})}
                        placeholder="Leave empty to set later"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ssh_key">SSH Private Key</Label>
                      <Textarea
                        value={credentialsData.privateKey}
                        onChange={(e) => setCredentialsData({...credentialsData, privateKey: e.target.value})}
                        placeholder="-----BEGIN PRIVATE KEY-----"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingServer ? "Update" : "Create"} Server
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Management Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Manage Server Credentials</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Secure Credential Storage</p>
                  <p>Credentials are encrypted with AES-256 and stored securely outside the main database.</p>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Server:</strong> {editingServer?.name}</p>
              <p><strong>Hostname:</strong> {editingServer?.hostname}</p>
              <p><strong>Username:</strong> {editingServer?.ssh_username}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cred_password">SSH Password</Label>
                <Input
                  type="password"
                  value={credentialsData.password}
                  onChange={(e) => setCredentialsData({...credentialsData, password: e.target.value})}
                  placeholder="Enter new password or leave empty"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cred_key">SSH Private Key</Label>
                <Textarea
                  value={credentialsData.privateKey}
                  onChange={(e) => setCredentialsData({...credentialsData, privateKey: e.target.value})}
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  rows={6}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCredentialsDialog(false);
                  setCredentialsData({ password: '', privateKey: '' });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (editingServer && (credentialsData.password || credentialsData.privateKey)) {
                    await storeServerCredentials(editingServer.id, editingServer.server_key, {
                      hostname: editingServer.hostname,
                      username: editingServer.ssh_username,
                      port: editingServer.ssh_port,
                      password: credentialsData.password || undefined,
                      privateKey: credentialsData.privateKey || undefined
                    });
                    setShowCredentialsDialog(false);
                    setCredentialsData({ password: '', privateKey: '' });
                  }
                }}
                disabled={!credentialsData.password && !credentialsData.privateKey}
              >
                <Lock className="h-4 w-4 mr-2" />
                Store Securely
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteServerId} onOpenChange={() => setDeleteServerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the server
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteServerId && handleDelete(deleteServerId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServerManagement;
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
  CreditCard, Clock, MapPin, Globe, Settings2, Zap, PlayCircle
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";

interface EnhancedProfile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  roles: string[];
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
  api_password: string;
  bouquet_ids: string[];
}

interface UserConnection {
  id: string;
  ip_address: unknown;
  user_agent: string;
  connected_at: string;
  disconnected_at: string | null;
  is_active: boolean;
  stream_type: string;
  bytes_transferred: number;
}

interface UserActivity {
  id: string;
  action: string;
  ip_address: unknown;
  timestamp: string;
  details: any;
}

interface EnhancedUserManagementProps {
  users: EnhancedProfile[];
  onUsersUpdate: () => void;
}

export const EnhancedUserManagement = ({ users, onUsersUpdate }: EnhancedUserManagementProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<EnhancedProfile | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [userConnections, setUserConnections] = useState<UserConnection[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
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
    credits: 0,
    api_password: ""
  });
  
  const { toast } = useToast();

  const generateApiPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({...formData, api_password: result});
  };

  const fetchUserConnections = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", userId)
        .order("connected_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setUserConnections(data || []);
    } catch (error) {
      console.error("Error fetching user connections:", error);
    }
  };

  const fetchUserActivity = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setUserActivity(data || []);
    } catch (error) {
      console.error("Error fetching user activity:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.email || (!editingUser && !formData.password)) {
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
        roles: [formData.role],
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
        credits: formData.credits,
        api_password: formData.api_password
      };

      if (editingUser) {
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", editingUser.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "User updated successfully"
        });
      } else {
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
        }

        toast({
          title: "Success",
          description: "User created successfully"
        });
      }

      setShowDialog(false);
      setEditingUser(null);
      resetForm();
      onUsersUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save user",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "user",
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
      credits: 0,
      api_password: ""
    });
  };

  const handleEdit = (user: EnhancedProfile) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.roles?.[0] || "user",
      status: user.status,
      max_connections: user.max_connections || 1,
      allowed_ips: user.allowed_ips?.join(', ') || "",
      banned_ips: user.banned_ips?.join(', ') || "",
      is_trial: user.is_trial || false,
      trial_expires_at: user.trial_expires_at || "",
      notes: user.notes || "",
      daily_bandwidth_limit: user.daily_bandwidth_limit?.toString() || "",
      country_code: user.country_code || "",
      timezone: user.timezone || "",
      credits: user.credits || 0,
      api_password: user.api_password || ""
    });
    
    if (user.user_id) {
      fetchUserConnections(user.user_id);
      fetchUserActivity(user.user_id);
    }
    
    setShowDialog(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully"
      });
      onUsersUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select users first",
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
          if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return;
          
          const { error: deleteError } = await supabase
            .from("profiles")
            .delete()
            .in("id", selectedUsers);

          if (deleteError) throw deleteError;
          
          toast({
            title: "Success",
            description: `${selectedUsers.length} users deleted successfully`
          });
          setSelectedUsers([]);
          onUsersUpdate();
          return;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .in("id", selectedUsers);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedUsers.length} users updated successfully`
      });
      setSelectedUsers([]);
      onUsersUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive"
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadM3U = async (user: EnhancedProfile) => {
    try {
      const response = await supabase.functions.invoke('playlist-generator', {
        body: { 
          username: user.username,
          password: user.api_password || 'defaultpass',
          format: 'm3u'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Create and download the M3U file
      const blob = new Blob([response.data], { type: 'audio/x-mpegurl' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${user.username}_playlist.m3u`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `M3U playlist downloaded for ${user.username}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download M3U playlist",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    setEditingUser(null);
    resetForm();
    generateApiPassword();
    setShowDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Advanced User Management
            </CardTitle>
            <CardDescription>Complete Xtream Codes user management system</CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedUsers.length > 0 && (
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
                  Delete ({selectedUsers.length})
                </Button>
              </div>
            )}
            <Button onClick={openAddDialog}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === users.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers(users.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Connections</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>Last IP</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>M3U Download</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.username}
                      {user.country_code && (
                        <Badge variant="outline" className="text-xs">
                          {user.country_code}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <StatusBadge variant={
                      user.status === 'active' ? 'active' : 
                      user.status === 'banned' ? 'destructive' : 'inactive'
                    }>
                      {user.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={user.roles?.includes('admin') ? 'warning' : 'success'}>
                      {user.roles?.includes('admin') ? 'Admin' : 'User'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Max: {user.max_connections || 1}</div>
                      <div className="text-muted-foreground">Active: 0</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatBytes(user.total_bandwidth_used || 0)}
                      {user.daily_bandwidth_limit && (
                        <div className="text-muted-foreground">
                          Limit: {formatBytes(user.daily_bandwidth_limit)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {String(user.last_ip) || 'Never'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_trial && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Trial
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadM3U(user)}
                      disabled={user.status !== 'active'}
                      title={user.status !== 'active' ? 'User must be active to download playlist' : `Download M3U playlist for ${user.username}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      M3U
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(user.id)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information and settings" : "Create a new user account with advanced settings"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="access">Access Control</TabsTrigger>
              <TabsTrigger value="limits">Limits & Quotas</TabsTrigger>
              <TabsTrigger value="connections" disabled={!editingUser}>Connections</TabsTrigger>
              <TabsTrigger value="activity" disabled={!editingUser}>Activity</TabsTrigger>
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
                    disabled={!!editingUser}
                  />
                </div>
                
                {!editingUser && (
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
                  <Label htmlFor="api-password">API Password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-password"
                      type={showPassword ? "text" : "password"}
                      value={formData.api_password}
                      onChange={(e) => setFormData({...formData, api_password: e.target.value})}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateApiPassword}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="reseller">Reseller</SelectItem>
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
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country Code</Label>
                  <Input
                    id="country"
                    placeholder="US, UK, DE..."
                    value={formData.country_code}
                    onChange={(e) => setFormData({...formData, country_code: e.target.value.toUpperCase()})}
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="America/New_York"
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes about this user..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-trial"
                    checked={formData.is_trial}
                    onCheckedChange={(checked) => setFormData({...formData, is_trial: !!checked})}
                  />
                  <Label htmlFor="is-trial">Trial Account</Label>
                </div>

                {formData.is_trial && (
                  <div className="space-y-2">
                    <Label htmlFor="trial-expires">Trial Expires At</Label>
                    <Input
                      id="trial-expires"
                      type="datetime-local"
                      value={formData.trial_expires_at}
                      onChange={(e) => setFormData({...formData, trial_expires_at: e.target.value})}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="allowed-ips">Allowed IPs (comma separated)</Label>
                  <Textarea
                    id="allowed-ips"
                    placeholder="192.168.1.1, 10.0.0.1, ..."
                    value={formData.allowed_ips}
                    onChange={(e) => setFormData({...formData, allowed_ips: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banned-ips">Banned IPs (comma separated)</Label>
                  <Textarea
                    id="banned-ips"
                    placeholder="192.168.1.100, 10.0.0.100, ..."
                    value={formData.banned_ips}
                    onChange={(e) => setFormData({...formData, banned_ips: e.target.value})}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-connections">Max Concurrent Connections</Label>
                  <Input
                    id="max-connections"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_connections}
                    onChange={(e) => setFormData({...formData, max_connections: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily-bandwidth">Daily Bandwidth Limit (bytes)</Label>
                  <Input
                    id="daily-bandwidth"
                    type="number"
                    placeholder="1073741824 (1GB)"
                    value={formData.daily_bandwidth_limit}
                    onChange={(e) => setFormData({...formData, daily_bandwidth_limit: e.target.value})}
                  />
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
              </div>
            </TabsContent>

            {editingUser && (
              <>
                <TabsContent value="connections" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Active Connections
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Connected At</TableHead>
                            <TableHead>Stream Type</TableHead>
                            <TableHead>Bandwidth</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userConnections.map((conn) => (
                            <TableRow key={conn.id}>
                              <TableCell>{String(conn.ip_address)}</TableCell>
                              <TableCell>{new Date(conn.connected_at).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{conn.stream_type}</Badge>
                              </TableCell>
                              <TableCell>{formatBytes(conn.bytes_transferred)}</TableCell>
                              <TableCell>
                                <StatusBadge variant={conn.is_active ? 'active' : 'inactive'}>
                                  {conn.is_active ? 'Active' : 'Disconnected'}
                                </StatusBadge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {userConnections.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No connections found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userActivity.map((activity) => (
                            <TableRow key={activity.id}>
                              <TableCell>
                                <Badge variant="outline">{activity.action}</Badge>
                              </TableCell>
                              <TableCell>{String(activity.ip_address)}</TableCell>
                              <TableCell>{new Date(activity.timestamp).toLocaleString()}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {JSON.stringify(activity.details)}
                                </code>
                              </TableCell>
                            </TableRow>
                          ))}
                          {userActivity.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No activity found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingUser ? "Update" : "Create"} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
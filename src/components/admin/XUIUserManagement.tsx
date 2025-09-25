import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download,
  Eye,
  Key,
  Shield,
  Activity,
  CreditCard,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  email: string;
  roles: string[];
  status: string;
  max_connections: number;
  is_trial: boolean;
  trial_expires_at: string | null;
  credits: number;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  last_ip: unknown;
  api_password?: string;
  country_code?: string;
  timezone?: string;
  notes?: string;
}

interface UserConnection {
  id: string;
  user_id: string;
  ip_address: unknown;
  connected_at: string;
  disconnected_at: string | null;
  bytes_transferred: number;
  is_active: boolean;
}

interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  ip_address: unknown;
  timestamp: string;
  details: any;
}

export function XUIUserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userConnections, setUserConnections] = useState<UserConnection[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    roles: ['user'],
    status: 'active',
    max_connections: 1,
    is_trial: false,
    trial_expires_at: '',
    credits: 0,
    country_code: '',
    timezone: '',
    notes: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserConnections = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', userId)
        .order('connected_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUserConnections(data || []);
    } catch (error) {
      toast.error('Failed to fetch user connections');
    }
  };

  const fetchUserActivity = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUserActivity(data || []);
    } catch (error) {
      toast.error('Failed to fetch user activity');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            username: formData.username,
            email: formData.email,
            roles: formData.roles,
            status: formData.status,
            max_connections: formData.max_connections,
            is_trial: formData.is_trial,
            trial_expires_at: formData.trial_expires_at || null,
            credits: formData.credits,
            country_code: formData.country_code,
            timezone: formData.timezone,
            notes: formData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        toast.success('User updated successfully');
      } else {
        // Create new user - this would typically involve auth.signUp
        toast.info('User creation requires additional authentication setup');
      }

      setShowDialog(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save user');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      roles: ['user'],
      status: 'active',
      max_connections: 1,
      is_trial: false,
      trial_expires_at: '',
      credits: 0,
      country_code: '',
      timezone: '',
      notes: ''
    });
    setEditingUser(null);
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      roles: user.roles,
      status: user.status,
      max_connections: user.max_connections,
      is_trial: user.is_trial,
      trial_expires_at: user.trial_expires_at || '',
      credits: user.credits,
      country_code: user.country_code || '',
      timezone: user.timezone || '',
      notes: user.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (user: Profile) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const generateApiPassword = async (user: Profile) => {
    try {
      const { data, error } = await supabase.rpc('generate_and_store_api_password', {
        user_profile_id: user.id
      });

      if (error) throw error;
      
      toast.success(`New API password generated: ${data}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate API password');
    }
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
      expired: "outline"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage user accounts and subscriptions
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Connections</TableHead>
                  <TableHead className="text-center">Last Login</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-center font-mono text-sm">
                      {user.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(user.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{user.credits}</TableCell>
                    <TableCell className="text-center">{user.max_connections}</TableCell>
                    <TableCell className="text-center">
                      {user.last_login ? 
                        new Date(user.last_login).toLocaleDateString() : 
                        'Never'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateApiPassword(user)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user information and settings' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="limits">Limits</TabsTrigger>
                {editingUser && <TabsTrigger value="activity">Activity</TabsTrigger>}
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  {!editingUser && (
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Optional notes about this user"
                  />
                </div>
              </TabsContent>

              <TabsContent value="access" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country_code">Country</Label>
                    <Input
                      id="country_code"
                      value={formData.country_code}
                      onChange={(e) => setFormData({...formData, country_code: e.target.value})}
                      placeholder="e.g. US, UK, DE"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={formData.timezone}
                      onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                      placeholder="e.g. America/New_York"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="limits" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_connections">Max Connections</Label>
                    <Input
                      id="max_connections"
                      type="number"
                      min="1"
                      value={formData.max_connections}
                      onChange={(e) => setFormData({...formData, max_connections: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="credits">Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.credits}
                      onChange={(e) => setFormData({...formData, credits: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_trial"
                    checked={formData.is_trial}
                    onChange={(e) => setFormData({...formData, is_trial: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="is_trial">Trial Account</Label>
                </div>
                {formData.is_trial && (
                  <div>
                    <Label htmlFor="trial_expires_at">Trial Expires</Label>
                    <Input
                      id="trial_expires_at"
                      type="datetime-local"
                      value={formData.trial_expires_at}
                      onChange={(e) => setFormData({...formData, trial_expires_at: e.target.value})}
                    />
                  </div>
                )}
              </TabsContent>

              {editingUser && (
                <TabsContent value="activity" className="space-y-4">
                  <div className="text-center text-muted-foreground">
                    Activity logs and connection history would be displayed here
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
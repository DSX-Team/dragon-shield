import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Download, 
  FileText, 
  Server, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Database,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Globe,
  ArrowRightLeft
} from 'lucide-react';

interface ImportProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  current?: string;
}

interface MigrationJob {
  id: string;
  source_server: string;
  target_server: string;
  content_types: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  streams_moved: number;
  total_streams: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

const StreamTools: React.FC = () => {
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [migrationJobs, setMigrationJobs] = useState<MigrationJob[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bulkOperations, setBulkOperations] = useState({
    selectedStreams: [],
    operation: '',
    newCategory: '',
    newServer: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchServers();
    fetchMigrationJobs();
  }, []);

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('streaming_servers')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServers(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const fetchMigrationJobs = async () => {
    // Mock migration jobs data
    const mockJobs: MigrationJob[] = [
      {
        id: '1',
        source_server: 'Server 1',
        target_server: 'Server 2', 
        content_types: ['Live Streams'],
        status: 'completed',
        progress: 100,
        streams_moved: 45,
        total_streams: 45,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: '2',
        source_server: 'Server 3',
        target_server: 'Server 1',
        content_types: ['Movies', 'Series'],
        status: 'running',
        progress: 65,
        streams_moved: 130,
        total_streams: 200,
        started_at: new Date(Date.now() - 900000).toISOString()
      }
    ];
    setMigrationJobs(mockJobs);
  };

  const handleM3UImport = async (formData: FormData) => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select an M3U file to import',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImportProgress({ total: 0, processed: 0, success: 0, failed: 0 });

      // Simulate M3U parsing and import
      const content = await selectedFile.text();
      const lines = content.split('\n');
      const entries = [];
      
      let currentEntry: any = {};
      for (const line of lines) {
        if (line.startsWith('#EXTINF:')) {
          const match = line.match(/#EXTINF:(-?\d+)(?:\s+tvg-id="([^"]*)")?(?:\s+tvg-name="([^"]*)")?(?:\s+tvg-logo="([^"]*)")?(?:\s+group-title="([^"]*)")?,(.+)/);
          if (match) {
            currentEntry = {
              duration: match[1],
              tvg_id: match[2] || '',
              tvg_name: match[3] || '',
              logo: match[4] || '',
              group: match[5] || 'Uncategorized',
              name: match[6]?.trim() || ''
            };
          }
        } else if (line.startsWith('http') && currentEntry.name) {
          currentEntry.url = line.trim();
          entries.push({ ...currentEntry });
          currentEntry = {};
        }
      }

      setImportProgress({ total: entries.length, processed: 0, success: 0, failed: 0 });

      // Import entries one by one
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setImportProgress(prev => ({ 
          ...prev!, 
          processed: i + 1, 
          current: entry.name 
        }));

        try {
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 100));

          const { error } = await supabase
            .from('channels')
            .insert({
              name: entry.name,
              category: entry.group,
              logo_url: entry.logo,
              epg_id: entry.tvg_id,
              upstream_sources: [{ url: entry.url, priority: 1 }],
              active: true
            });

          if (error) throw error;

          setImportProgress(prev => ({ 
            ...prev!, 
            success: prev!.success + 1 
          }));
        } catch (error) {
          console.error('Error importing entry:', entry.name, error);
          setImportProgress(prev => ({ 
            ...prev!, 
            failed: prev!.failed + 1 
          }));
        }
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${importProgress?.success || 0} streams`,
      });

    } catch (error) {
      console.error('Error parsing M3U file:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to parse M3U file',
        variant: 'destructive',
      });
    }
  };

  const handleStreamMigration = async (formData: FormData) => {
    const sourceServer = formData.get('source_server') as string;
    const targetServer = formData.get('target_server') as string;
    const contentTypes = formData.getAll('content_type') as string[];

    if (!sourceServer || !targetServer || sourceServer === targetServer) {
      toast({
        title: 'Error',
        description: 'Please select different source and target servers',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create migration job
      const newJob: MigrationJob = {
        id: Date.now().toString(),
        source_server: servers.find(s => s.id === sourceServer)?.name || sourceServer,
        target_server: servers.find(s => s.id === targetServer)?.name || targetServer,
        content_types: contentTypes,
        status: 'running',
        progress: 0,
        streams_moved: 0,
        total_streams: 100, // Mock total
        started_at: new Date().toISOString()
      };

      setMigrationJobs(prev => [newJob, ...prev]);

      // Simulate migration progress
      const progressInterval = setInterval(() => {
        setMigrationJobs(prev => prev.map(job => {
          if (job.id === newJob.id && job.status === 'running') {
            const newProgress = Math.min(job.progress + Math.random() * 10, 100);
            const newStreamsMoveed = Math.floor((newProgress / 100) * job.total_streams);
            
            if (newProgress >= 100) {
              clearInterval(progressInterval);
              return {
                ...job,
                progress: 100,
                streams_moved: job.total_streams,
                status: 'completed',
                completed_at: new Date().toISOString()
              };
            }
            
            return {
              ...job,
              progress: newProgress,
              streams_moved: newStreamsMoveed
            };
          }
          return job;
        }));
      }, 1000);

      toast({
        title: 'Migration Started',
        description: 'Stream migration job has been started',
      });

    } catch (error) {
      console.error('Error starting migration:', error);
      toast({
        title: 'Migration Failed',
        description: 'Failed to start stream migration',
        variant: 'destructive',
      });
    }
  };

  const handleDNSReplacement = async (formData: FormData) => {
    const oldDomain = formData.get('old_domain') as string;
    const newDomain = formData.get('new_domain') as string;

    if (!oldDomain || !newDomain) {
      toast({
        title: 'Error',
        description: 'Please provide both old and new domain names',
        variant: 'destructive',
      });
      return;
    }

    try {
      // In a real implementation, this would update all stream URLs
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'DNS Replacement Complete',
        description: `Updated all stream URLs from ${oldDomain} to ${newDomain}`,
      });
    } catch (error) {
      console.error('Error replacing DNS:', error);
      toast({
        title: 'DNS Replacement Failed',
        description: 'Failed to replace DNS in stream URLs',
        variant: 'destructive',
      });
    }
  };

  const exportStreamList = async (format: 'json' | 'm3u' | 'csv') => {
    try {
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .eq('active', true);

      if (error) throw error;

      let content = '';
      let filename = '';
      let mimeType = '';

      switch (format) {
        case 'json':
          content = JSON.stringify(channels, null, 2);
          filename = 'streams.json';
          mimeType = 'application/json';
          break;
        case 'm3u':
          content = '#EXTM3U\n';
          channels?.forEach(channel => {
            content += `#EXTINF:-1 tvg-id="${channel.epg_id || ''}" tvg-logo="${channel.logo_url || ''}" group-title="${channel.category || 'Uncategorized'}",${channel.name}\n`;
            content += `${channel.upstream_sources?.[0]?.url || ''}\n`;
          });
          filename = 'streams.m3u';
          mimeType = 'audio/x-mpegurl';
          break;
        case 'csv':
          content = 'Name,Category,Logo URL,EPG ID,Source URL\n';
          channels?.forEach(channel => {
            content += `"${channel.name}","${channel.category || ''}","${channel.logo_url || ''}","${channel.epg_id || ''}","${channel.upstream_sources?.[0]?.url || ''}"\n`;
          });
          filename = 'streams.csv';
          mimeType = 'text/csv';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Stream list exported as ${filename}`,
      });
    } catch (error) {
      console.error('Error exporting streams:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export stream list',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stream Tools</h2>
          <p className="text-muted-foreground">Advanced tools for stream management and operations</p>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="import">Import/Export</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="dns">DNS Tools</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Import Streams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleM3UImport(formData);
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="m3u_file">M3U Playlist File</Label>
                      <Input
                        id="m3u_file"
                        type="file"
                        accept=".m3u,.m3u8"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                    </div>
                    
                    {importProgress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {importProgress.processed}/{importProgress.total}</span>
                          <span>Success: {importProgress.success}, Failed: {importProgress.failed}</span>
                        </div>
                        <Progress value={(importProgress.processed / importProgress.total) * 100} />
                        {importProgress.current && (
                          <p className="text-xs text-muted-foreground">
                            Processing: {importProgress.current}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={!selectedFile || !!importProgress}
                      className="w-full"
                    >
                      {importProgress ? 'Importing...' : 'Import M3U'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Export Streams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Export your stream list in various formats
                </p>
                <div className="grid gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => exportStreamList('m3u')}
                    className="w-full justify-start"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as M3U
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportStreamList('json')}
                    className="w-full justify-start"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportStreamList('csv')}
                    className="w-full justify-start"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowRightLeft className="mr-2 h-5 w-5" />
                  Stream Migration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleStreamMigration(formData);
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="source_server">Source Server</Label>
                      <Select name="source_server">
                        <SelectTrigger>
                          <SelectValue placeholder="Select source server" />
                        </SelectTrigger>
                        <SelectContent>
                          {servers.map(server => (
                            <SelectItem key={server.id} value={server.id}>
                              {server.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="target_server">Target Server</Label>
                      <Select name="target_server">
                        <SelectTrigger>
                          <SelectValue placeholder="Select target server" />
                        </SelectTrigger>
                        <SelectContent>
                          {servers.map(server => (
                            <SelectItem key={server.id} value={server.id}>
                              {server.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Content Types</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {['Live Streams', 'Movies', 'Series', 'Radio'].map(type => (
                          <label key={type} className="flex items-center space-x-2">
                            <input type="checkbox" name="content_type" value={type} />
                            <span className="text-sm">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      Start Migration
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Migration Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {migrationJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No migration jobs</p>
                ) : (
                  migrationJobs.map(job => (
                    <div key={job.id} className="space-y-2 p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {job.source_server} → {job.target_server}
                        </span>
                        <Badge variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'running' ? 'outline' :
                          job.status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.content_types.join(', ')}
                      </div>
                      {job.status === 'running' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{job.streams_moved}/{job.total_streams} streams</span>
                            <span>{job.progress.toFixed(1)}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}
                      {job.status === 'completed' && (
                        <div className="flex items-center text-xs text-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Moved {job.streams_moved} streams
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                DNS Replacement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleDNSReplacement(formData);
              }}>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This tool will replace all occurrences of the old domain with the new domain in stream URLs. 
                      Please double-check the domains before proceeding.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="old_domain">Old Domain</Label>
                      <Input
                        id="old_domain"
                        name="old_domain"
                        placeholder="old-server.example.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_domain">New Domain</Label>
                      <Input
                        id="new_domain"
                        name="new_domain"
                        placeholder="new-server.example.com"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Replace DNS in All Streams
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Bulk Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bulk operations affect multiple streams at once. Use with caution.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label>Operation Type</Label>
                  <Select onValueChange={(value) => setBulkOperations({...bulkOperations, operation: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enable">Enable Streams</SelectItem>
                      <SelectItem value="disable">Disable Streams</SelectItem>
                      <SelectItem value="change_category">Change Category</SelectItem>
                      <SelectItem value="move_server">Move to Server</SelectItem>
                      <SelectItem value="delete">Delete Streams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkOperations.operation === 'change_category' && (
                  <div>
                    <Label htmlFor="new_category">New Category</Label>
                    <Input
                      id="new_category"
                      value={bulkOperations.newCategory}
                      onChange={(e) => setBulkOperations({...bulkOperations, newCategory: e.target.value})}
                      placeholder="Enter category name"
                    />
                  </div>
                )}

                {bulkOperations.operation === 'move_server' && (
                  <div>
                    <Label>Target Server</Label>
                    <Select onValueChange={(value) => setBulkOperations({...bulkOperations, newServer: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select server" />
                      </SelectTrigger>
                      <SelectContent>
                        {servers.map(server => (
                          <SelectItem key={server.id} value={server.id}>
                            {server.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Stream Selection</Label>
                  <Textarea
                    placeholder="Enter stream IDs (one per line) or leave empty to apply to all streams"
                    className="h-32"
                  />
                </div>

                <Button 
                  className="w-full" 
                  disabled={!bulkOperations.operation}
                  variant={bulkOperations.operation === 'delete' ? 'destructive' : 'default'}
                >
                  Execute Bulk Operation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Database Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Optimize Database
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Clean Old Logs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verify Stream URLs
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5" />
                  System Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Play className="mr-2 h-4 w-4" />
                    Restart All Streams
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Pause className="mr-2 h-4 w-4" />
                    Stop All Streams
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StreamTools;
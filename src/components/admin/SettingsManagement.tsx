import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Database, Shield, Zap, Globe, Video, Mail, Cloud } from "lucide-react";

interface AppSettings {
  // Application Settings
  app_name: string;
  app_url: string;
  frontend_port: number;
  
  // Streaming Configuration
  max_concurrent_streams: number;
  default_video_quality: string;
  default_audio_bitrate: string;
  stream_buffer_size: number;
  
  // File Storage
  max_file_size: string;
  allowed_file_types: string;
  
  // Security Settings
  rate_limit_enabled: boolean;
  rate_limit_window_ms: number;
  rate_limit_max_requests: number;
  cors_origin: string;
  cors_credentials: boolean;
  ssl_enabled: boolean;
  
  // Monitoring & Logging
  log_level: string;
  enable_metrics: boolean;
  metrics_port: number;
  
  // Backup Configuration
  backup_enabled: boolean;
  backup_interval: string;
  backup_retention: string;
  
  // Load Balancing
  load_balancer_enabled: boolean;
  server_region: string;
}

const defaultSettings: AppSettings = {
  app_name: "Dragon Shield IPTV",
  app_url: "http://localhost:3000",
  frontend_port: 3000,
  max_concurrent_streams: 3,
  default_video_quality: "720p",
  default_audio_bitrate: "128k",
  stream_buffer_size: 30,
  max_file_size: "100mb",
  allowed_file_types: "mp4,mkv,avi,ts,m3u8",
  rate_limit_enabled: true,
  rate_limit_window_ms: 900000,
  rate_limit_max_requests: 100,
  cors_origin: "http://localhost:3000",
  cors_credentials: true,
  ssl_enabled: false,
  log_level: "info",
  enable_metrics: true,
  metrics_port: 9090,
  backup_enabled: true,
  backup_interval: "24h",
  backup_retention: "7d",
  load_balancer_enabled: false,
  server_region: "us-east-1"
};

const SettingsManagement = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load settings from localStorage temporarily
      const savedSettings = localStorage.getItem('dragon_shield_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.log("Using default settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save settings to localStorage temporarily
      localStorage.setItem('dragon_shield_settings', JSON.stringify(settings));

      toast({
        title: "Settings saved",
        description: "Application settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">Configure Dragon Shield IPTV system parameters</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Application Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Application Settings</CardTitle>
            </div>
            <CardDescription>Basic application configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app_name">Application Name</Label>
                <Input
                  id="app_name"
                  value={settings.app_name}
                  onChange={(e) => updateSetting('app_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app_url">Application URL</Label>
                <Input
                  id="app_url"
                  value={settings.app_url}
                  onChange={(e) => updateSetting('app_url', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frontend_port">Frontend Port</Label>
                <Input
                  id="frontend_port"
                  type="number"
                  value={settings.frontend_port}
                  onChange={(e) => updateSetting('frontend_port', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server_region">Server Region</Label>
                <Select
                  value={settings.server_region}
                  onValueChange={(value) => updateSetting('server_region', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                    <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                    <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                    <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streaming Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              <CardTitle>Streaming Configuration</CardTitle>
            </div>
            <CardDescription>Video streaming and quality settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_streams">Max Concurrent Streams</Label>
                <Input
                  id="max_streams"
                  type="number"
                  value={settings.max_concurrent_streams}
                  onChange={(e) => updateSetting('max_concurrent_streams', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_quality">Default Video Quality</Label>
                <Select
                  value={settings.default_video_quality}
                  onValueChange={(value) => updateSetting('default_video_quality', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="480p">480p (SD)</SelectItem>
                    <SelectItem value="360p">360p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audio_bitrate">Default Audio Bitrate</Label>
                <Select
                  value={settings.default_audio_bitrate}
                  onValueChange={(value) => updateSetting('default_audio_bitrate', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="320k">320 kbps</SelectItem>
                    <SelectItem value="256k">256 kbps</SelectItem>
                    <SelectItem value="192k">192 kbps</SelectItem>
                    <SelectItem value="128k">128 kbps</SelectItem>
                    <SelectItem value="96k">96 kbps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer_size">Stream Buffer Size (seconds)</Label>
                <Input
                  id="buffer_size"
                  type="number"
                  value={settings.stream_buffer_size}
                  onChange={(e) => updateSetting('stream_buffer_size', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Storage Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              <CardTitle>File Storage</CardTitle>
            </div>
            <CardDescription>File upload and storage configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_file_size">Maximum File Size</Label>
                <Input
                  id="max_file_size"
                  value={settings.max_file_size}
                  onChange={(e) => updateSetting('max_file_size', e.target.value)}
                  placeholder="e.g., 100mb, 1gb"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowed_types">Allowed File Types</Label>
                <Input
                  id="allowed_types"
                  value={settings.allowed_file_types}
                  onChange={(e) => updateSetting('allowed_file_types', e.target.value)}
                  placeholder="mp4,mkv,avi,ts,m3u8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security Settings</CardTitle>
            </div>
            <CardDescription>Security and access control configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Rate Limiting</Label>
                <p className="text-sm text-muted-foreground">Enable rate limiting for API requests</p>
              </div>
              <Switch
                checked={settings.rate_limit_enabled}
                onCheckedChange={(checked) => updateSetting('rate_limit_enabled', checked)}
              />
            </div>
            
            {settings.rate_limit_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_window">Rate Limit Window (ms)</Label>
                  <Input
                    id="rate_window"
                    type="number"
                    value={settings.rate_limit_window_ms}
                    onChange={(e) => updateSetting('rate_limit_window_ms', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_max">Max Requests per Window</Label>
                  <Input
                    id="rate_max"
                    type="number"
                    value={settings.rate_limit_max_requests}
                    onChange={(e) => updateSetting('rate_limit_max_requests', parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cors_origin">CORS Origin</Label>
                <Input
                  id="cors_origin"
                  value={settings.cors_origin}
                  onChange={(e) => updateSetting('cors_origin', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>CORS Credentials</Label>
                  <p className="text-sm text-muted-foreground">Allow credentials in CORS requests</p>
                </div>
                <Switch
                  checked={settings.cors_credentials}
                  onCheckedChange={(checked) => updateSetting('cors_credentials', checked)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>SSL/TLS Enabled</Label>
                <p className="text-sm text-muted-foreground">Enable HTTPS encryption</p>
              </div>
              <Switch
                checked={settings.ssl_enabled}
                onCheckedChange={(checked) => updateSetting('ssl_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Monitoring & Logging */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Monitoring & Logging</CardTitle>
            </div>
            <CardDescription>System monitoring and logging configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="log_level">Log Level</Label>
                <Select
                  value={settings.log_level}
                  onValueChange={(value) => updateSetting('log_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metrics_port">Metrics Port</Label>
                <Input
                  id="metrics_port"
                  type="number"
                  value={settings.metrics_port}
                  onChange={(e) => updateSetting('metrics_port', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Metrics</Label>
                <p className="text-sm text-muted-foreground">Enable system metrics collection</p>
              </div>
              <Switch
                checked={settings.enable_metrics}
                onCheckedChange={(checked) => updateSetting('enable_metrics', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Backup Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Backup Configuration</CardTitle>
            </div>
            <CardDescription>Database backup and retention settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Backups</Label>
                <p className="text-sm text-muted-foreground">Enable automatic database backups</p>
              </div>
              <Switch
                checked={settings.backup_enabled}
                onCheckedChange={(checked) => updateSetting('backup_enabled', checked)}
              />
            </div>
            
            {settings.backup_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backup_interval">Backup Interval</Label>
                  <Select
                    value={settings.backup_interval}
                    onValueChange={(value) => updateSetting('backup_interval', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Every Hour</SelectItem>
                      <SelectItem value="6h">Every 6 Hours</SelectItem>
                      <SelectItem value="12h">Every 12 Hours</SelectItem>
                      <SelectItem value="24h">Daily</SelectItem>
                      <SelectItem value="168h">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backup_retention">Backup Retention</Label>
                  <Select
                    value={settings.backup_retention}
                    onValueChange={(value) => updateSetting('backup_retention', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">1 Day</SelectItem>
                      <SelectItem value="3d">3 Days</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="14d">14 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Load Balancing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Load Balancing</CardTitle>
            </div>
            <CardDescription>Load balancer and clustering configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Load Balancer Enabled</Label>
                <p className="text-sm text-muted-foreground">Enable load balancing across servers</p>
              </div>
              <Switch
                checked={settings.load_balancer_enabled}
                onCheckedChange={(checked) => updateSetting('load_balancer_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsManagement;
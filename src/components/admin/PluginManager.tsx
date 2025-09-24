import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  BarChart3, 
  Cloud, 
  Download, 
  Tv,
  Globe,
  Lock,
  Activity,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: "security" | "analytics" | "integration" | "automation" | "streaming";
  status: "active" | "inactive" | "error" | "updating";
  icon: any;
  config?: Record<string, any>;
  features: string[];
  lastUpdated: string;
  size: string;
}

const PluginManager = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([
    {
      id: "autoblock",
      name: "Autoblock Plugin",
      description: "Automatically blocks suspicious users and unauthorized access attempts",
      version: "2.1.0",
      author: "Dragon Shield Security",
      category: "security",
      status: "active",
      icon: Shield,
      features: ["IP Blocking", "User Behavior Analysis", "Geolocation Filtering", "VPN Detection"],
      lastUpdated: "2024-01-15",
      size: "2.4 MB",
      config: {
        maxFailedAttempts: 5,
        blockDuration: 3600,
        enableGeoBlocking: true,
        allowedCountries: ["US", "CA", "GB"]
      }
    },
    {
      id: "statistics",
      name: "Statistics Plugin",
      description: "Advanced analytics and reporting for streams, users, and server performance",
      version: "3.0.2",
      author: "Dragon Shield Analytics",
      category: "analytics",
      status: "active",
      icon: BarChart3,
      features: ["Real-time Metrics", "Custom Reports", "Export Tools", "Performance Monitoring"],
      lastUpdated: "2024-01-20",
      size: "4.1 MB",
      config: {
        retentionDays: 90,
        realTimeUpdates: true,
        enableReports: true
      }
    },
    {
      id: "rclone",
      name: "Rclone Plugin",
      description: "Cloud storage integration for content backup and synchronization",
      version: "1.8.5",
      author: "Dragon Shield Storage",
      category: "integration",
      status: "active",
      icon: Cloud,
      features: ["Multi-Cloud Support", "Automated Backup", "Content Sync", "Bandwidth Control"],
      lastUpdated: "2024-01-18",
      size: "8.2 MB",
      config: {
        provider: "aws-s3",
        backupSchedule: "daily",
        compression: true
      }
    },
    {
      id: "plex-importer",
      name: "Plex Importer Plugin",
      description: "Import content libraries from Plex Media Server",
      version: "1.4.1",
      author: "Dragon Shield Media",
      category: "integration",
      status: "inactive",
      icon: Download,
      features: ["Library Sync", "Metadata Import", "Poster Generation", "Auto-categorization"],
      lastUpdated: "2024-01-10",
      size: "3.7 MB",
      config: {
        plexUrl: "",
        plexToken: "",
        syncSchedule: "weekly"
      }
    },
    {
      id: "proxies",
      name: "Proxies Plugin",
      description: "Load balancing and proxy management for global content delivery",
      version: "2.3.0",
      author: "Dragon Shield Network",
      category: "streaming",
      status: "active",
      icon: Globe,
      features: ["Load Balancing", "CDN Integration", "Failover Protection", "Geographic Routing"],
      lastUpdated: "2024-01-22",
      size: "5.8 MB",
      config: {
        enableLoadBalancing: true,
        maxProxies: 10,
        healthCheckInterval: 30
      }
    }
  ]);

  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(plugins[0]);

  const getStatusIcon = (status: Plugin["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "inactive":
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "updating":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Plugin["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "updating":
        return <Badge className="bg-warning text-warning-foreground">Updating</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const togglePlugin = (pluginId: string) => {
    setPlugins(plugins.map(plugin => {
      if (plugin.id === pluginId) {
        const newStatus = plugin.status === "active" ? "inactive" : "active";
        toast.success(`${plugin.name} ${newStatus === "active" ? "activated" : "deactivated"}`);
        return { ...plugin, status: newStatus };
      }
      return plugin;
    }));
  };

  const updatePluginConfig = (pluginId: string, config: Record<string, any>) => {
    setPlugins(plugins.map(plugin => {
      if (plugin.id === pluginId) {
        return { ...plugin, config: { ...plugin.config, ...config } };
      }
      return plugin;
    }));
    toast.success("Configuration updated successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plugin Manager</h2>
          <p className="text-muted-foreground">
            Manage and configure system plugins for enhanced functionality
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {plugins.filter(p => p.status === "active").length}/{plugins.length} Active
          </Badge>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Install Plugin
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plugin List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Installed Plugins</h3>
          {plugins.map((plugin) => (
            <Card 
              key={plugin.id} 
              className={`cursor-pointer transition-colors ${
                selectedPlugin?.id === plugin.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedPlugin(plugin)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <plugin.icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{plugin.name}</span>
                  </div>
                  {getStatusIcon(plugin.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{plugin.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">v{plugin.version}</span>
                  {getStatusBadge(plugin.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plugin Details */}
        <div className="lg:col-span-2">
          {selectedPlugin ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <selectedPlugin.icon className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle>{selectedPlugin.name}</CardTitle>
                      <CardDescription>
                        Version {selectedPlugin.version} by {selectedPlugin.author}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={selectedPlugin.status === "active"}
                    onCheckedChange={() => togglePlugin(selectedPlugin.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-muted-foreground">{selectedPlugin.description}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Features</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedPlugin.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Last Updated</Label>
                        <p className="text-sm text-muted-foreground">{selectedPlugin.lastUpdated}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Size</Label>
                        <p className="text-sm text-muted-foreground">{selectedPlugin.size}</p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Update
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                      <Button size="sm" variant="destructive">
                        Uninstall
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="configuration" className="space-y-4">
                    {selectedPlugin.id === "autoblock" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Max Failed Attempts</Label>
                          <Input
                            type="number"
                            defaultValue={selectedPlugin.config?.maxFailedAttempts || 5}
                            onChange={(e) => updatePluginConfig(selectedPlugin.id, {
                              maxFailedAttempts: parseInt(e.target.value)
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Block Duration (seconds)</Label>
                          <Input
                            type="number"
                            defaultValue={selectedPlugin.config?.blockDuration || 3600}
                            onChange={(e) => updatePluginConfig(selectedPlugin.id, {
                              blockDuration: parseInt(e.target.value)
                            })}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={selectedPlugin.config?.enableGeoBlocking || false}
                            onCheckedChange={(checked) => updatePluginConfig(selectedPlugin.id, {
                              enableGeoBlocking: checked
                            })}
                          />
                          <Label>Enable Geo-blocking</Label>
                        </div>
                      </div>
                    )}

                    {selectedPlugin.id === "statistics" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Data Retention (days)</Label>
                          <Input
                            type="number"
                            defaultValue={selectedPlugin.config?.retentionDays || 90}
                            onChange={(e) => updatePluginConfig(selectedPlugin.id, {
                              retentionDays: parseInt(e.target.value)
                            })}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={selectedPlugin.config?.realTimeUpdates || false}
                            onCheckedChange={(checked) => updatePluginConfig(selectedPlugin.id, {
                              realTimeUpdates: checked
                            })}
                          />
                          <Label>Real-time Updates</Label>
                        </div>
                      </div>
                    )}

                    {selectedPlugin.id === "rclone" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Cloud Provider</Label>
                          <Input
                            defaultValue={selectedPlugin.config?.provider || "aws-s3"}
                            onChange={(e) => updatePluginConfig(selectedPlugin.id, {
                              provider: e.target.value
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Backup Schedule</Label>
                          <Input
                            defaultValue={selectedPlugin.config?.backupSchedule || "daily"}
                            onChange={(e) => updatePluginConfig(selectedPlugin.id, {
                              backupSchedule: e.target.value
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {selectedPlugin.id === "plex-importer" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Plex Server URL</Label>
                          <Input
                            placeholder="http://plex.example.com:32400"
                            defaultValue={selectedPlugin.config?.plexUrl || ""}
                            onChange={(e) => updatePluginConfig(selectedPlugin.id, {
                              plexUrl: e.target.value
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Plex Token</Label>
                          <Input
                            type="password"
                            placeholder="Your Plex authentication token"
                            defaultValue={selectedPlugin.config?.plexToken || ""}
                            onChange={(e) => updatePluginConfig(selectedPlugin.id, {
                              plexToken: e.target.value
                            })}
                          />
                        </div>
                      </div>
                    )}

                    <Button className="w-full">
                      Save Configuration
                    </Button>
                  </TabsContent>

                  <TabsContent value="logs" className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                      <div className="space-y-1">
                        <div className="text-success">[2024-01-22 10:30:15] Plugin initialized successfully</div>
                        <div className="text-primary">[2024-01-22 10:30:16] Configuration loaded</div>
                        <div className="text-muted-foreground">[2024-01-22 10:30:17] Service started</div>
                        <div className="text-warning">[2024-01-22 10:35:42] Warning: High memory usage detected</div>
                        <div className="text-success">[2024-01-22 10:36:01] Memory usage normalized</div>
                        <div className="text-primary">[2024-01-22 11:00:00] Hourly statistics generated</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Full Log
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Plugin Selected</h3>
                <p className="text-muted-foreground">
                  Select a plugin from the list to view details and configuration options.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginManager;
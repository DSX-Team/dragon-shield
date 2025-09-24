import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import WebPlayer from "./WebPlayer";
import StreamTester from "./StreamTester";
import { 
  Grid3X3, 
  Grid2X2, 
  Maximize2, 
  Volume2, 
  VolumeX,
  Settings,
  Monitor,
  Tv,
  Smartphone,
  Cast,
  TestTube,
  Wifi,
  Signal
} from "lucide-react";
import { cn } from "@/lib/utils";
import StreamingEngine, { StreamInfo } from "@/utils/StreamingEngine";

interface StreamSource {
  id: string;
  name: string;
  url: string;
  quality: string;
  language: string;
  type: "live" | "vod";
  thumbnail?: string;
}

interface MultiStreamPlayerProps {
  streams: StreamSource[];
  defaultLayout?: "1x1" | "2x2" | "3x3" | "pip";
  className?: string;
}

const MultiStreamPlayer = ({ 
  streams = [], 
  defaultLayout = "2x2",
  className 
}: MultiStreamPlayerProps) => {
  const [layout, setLayout] = useState<"1x1" | "2x2" | "3x3" | "pip">(defaultLayout);
  const [selectedStreams, setSelectedStreams] = useState<StreamSource[]>([]);
  const [mainStream, setMainStream] = useState<StreamSource | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [outputDevice, setOutputDevice] = useState("default");
  const [streamingCapabilities, setStreamingCapabilities] = useState<any>(null);

  useEffect(() => {
    // Initialize streaming capabilities
    const engine = StreamingEngine.getInstance();
    setStreamingCapabilities(engine.getCapabilities());
    
    // Initialize with first few streams based on layout
    const maxStreams = layout === "1x1" ? 1 : layout === "2x2" ? 4 : 9;
    setSelectedStreams(streams.slice(0, maxStreams));
    if (streams.length > 0 && !mainStream) {
      setMainStream(streams[0]);
    }
  }, [streams, layout, mainStream]);

  const getLayoutClass = () => {
    switch (layout) {
      case "1x1":
        return "grid-cols-1 grid-rows-1";
      case "2x2":
        return "grid-cols-2 grid-rows-2";
      case "3x3":
        return "grid-cols-3 grid-rows-3";
      case "pip":
        return "relative";
      default:
        return "grid-cols-2 grid-rows-2";
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleStreamSelect = (streamId: string, position: number) => {
    const stream = streams.find(s => s.id === streamId);
    if (!stream) return;

    const newStreams = [...selectedStreams];
    newStreams[position] = stream;
    setSelectedStreams(newStreams);
  };

  const renderPiPLayout = () => (
    <div className="relative h-full">
      {mainStream && (
        <WebPlayer
          src={mainStream.url}
          title={mainStream.name}
          className="h-full"
        />
      )}
      <div className="absolute top-4 right-4 w-64 h-36 z-10">
        {selectedStreams[1] && (
          <WebPlayer
            src={selectedStreams[1].url}
            title={selectedStreams[1].name}
            className="h-full border-2 border-white/20 rounded-lg"
            controls={false}
          />
        )}
      </div>
    </div>
  );

  const renderGridLayout = () => (
    <div className={cn("grid gap-2 h-full", getLayoutClass())}>
      {selectedStreams.map((stream, index) => (
        <div key={`${stream?.id}-${index}`} className="relative">
          {stream ? (
            <WebPlayer
              src={stream.url}
              title={stream.name}
              className="h-full"
              controls={index === 0} // Only show controls on first stream
            />
          ) : (
            <div className="h-full bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Monitor className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No stream selected</p>
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              {index + 1}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Multi-Stream Player
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {selectedStreams.filter(Boolean).length}/{selectedStreams.length} Active
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="layout" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="streams">Streams</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="testing">
                <TestTube className="h-4 w-4 mr-1" />
                Test
              </TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Label>Layout:</Label>
                <div className="flex space-x-2">
                  <Button
                    variant={layout === "1x1" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayout("1x1")}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={layout === "2x2" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayout("2x2")}
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={layout === "3x3" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayout("3x3")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={layout === "pip" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayout("pip")}
                  >
                    PiP
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="streams" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: layout === "1x1" ? 1 : layout === "2x2" ? 4 : 9 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Label>Stream {index + 1}</Label>
                    <Select onValueChange={(value) => handleStreamSelect(value, index)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stream..." />
                      </SelectTrigger>
                      <SelectContent>
                        {streams.map((stream) => (
                          <SelectItem key={stream.id} value={stream.id}>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {stream.quality}
                              </Badge>
                              <span>{stream.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Global Audio Control</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Output Device</Label>
                  <Select value={outputDevice} onValueChange={setOutputDevice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <div className="flex items-center space-x-2">
                          <Monitor className="h-4 w-4" />
                          <span>Default</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="speakers">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="h-4 w-4" />
                          <span>Speakers</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tv">
                        <div className="flex items-center space-x-2">
                          <Tv className="h-4 w-4" />
                          <span>TV</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cast">
                        <div className="flex items-center space-x-2">
                          <Cast className="h-4 w-4" />
                          <span>Chromecast</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="sync-audio" 
                    checked={syncEnabled}
                    onCheckedChange={setSyncEnabled}
                  />
                  <Label htmlFor="sync-audio">Sync Audio Across Streams</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buffer Size (seconds)</Label>
                  <Input type="number" defaultValue="3" min="1" max="10" />
                </div>
                
                <div className="space-y-2">
                  <Label>Auto Quality</Label>
                  <Switch defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label>Low Latency Mode</Label>
                  <Switch />
                </div>
                
                <div className="space-y-2">
                  <Label>Hardware Acceleration</Label>
                  <Switch defaultChecked />
                </div>

                {streamingCapabilities && (
                  <div className="space-y-2">
                    <Label>Streaming Capabilities</Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={streamingCapabilities.hls ? "default" : "secondary"}>
                        HLS {streamingCapabilities.hls ? "✓" : "✗"}
                      </Badge>
                      <Badge variant={streamingCapabilities.dash ? "default" : "secondary"}>
                        DASH {streamingCapabilities.dash ? "✓" : "✗"}
                      </Badge>
                      <Badge variant={streamingCapabilities.webrtc ? "default" : "secondary"}>
                        WebRTC {streamingCapabilities.webrtc ? "✓" : "✗"}
                      </Badge>
                      <Badge variant={streamingCapabilities.mse ? "default" : "secondary"}>
                        MSE {streamingCapabilities.mse ? "✓" : "✗"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="testing">
              <StreamTester />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Player Area */}
      <Card>
        <CardContent className="p-0">
          <div className="aspect-video bg-black">
            {layout === "pip" ? renderPiPLayout() : renderGridLayout()}
          </div>
        </CardContent>
      </Card>

      {/* Stream Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {selectedStreams.filter(Boolean).slice(0, 3).map((stream, index) => (
          <Card key={stream.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold truncate">{stream.name}</h4>
                <Badge variant={stream.type === "live" ? "default" : "secondary"}>
                  {stream.type.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {stream.quality}
                </Badge>
                <span>{stream.language}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MultiStreamPlayer;
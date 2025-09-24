import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, TestTube, Wifi, Signal, AlertCircle, CheckCircle } from "lucide-react";
import WebPlayer from "./WebPlayer";
import StreamingEngine, { StreamInfo } from "@/utils/StreamingEngine";
import { useToast } from "@/components/ui/use-toast";

const StreamTester = () => {
  const { toast } = useToast();
  const [testUrl, setTestUrl] = useState("");
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sample stream URLs for testing
  const sampleStreams = {
    hls: [
      {
        name: "Apple HLS Test Stream",
        url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8"
      },
      {
        name: "Big Buck Bunny HLS",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    dash: [
      {
        name: "DASH Test Stream",
        url: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd"
      }
    ],
    progressive: [
      {
        name: "MP4 Test Video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      }
    ]
  };

  const analyzeStream = async () => {
    if (!testUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a stream URL to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const engine = StreamingEngine.getInstance();
      const info = engine.analyzeStream(testUrl);
      const caps = engine.getCapabilities();
      
      setStreamInfo(info);
      setCapabilities(caps);
      
      toast({
        title: "Analysis Complete",
        description: `Stream protocol detected: ${info.protocol.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze stream",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSampleStream = (url: string) => {
    setTestUrl(url);
    setStreamInfo(null);
  };

  const getProtocolBadgeColor = (protocol: string) => {
    switch (protocol) {
      case 'hls': return 'bg-blue-500 text-white';
      case 'dash': return 'bg-green-500 text-white';
      case 'webrtc': return 'bg-purple-500 text-white';
      case 'progressive': return 'bg-gray-500 text-white';
      default: return 'bg-orange-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Stream Testing & Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="test">Test Stream</TabsTrigger>
              <TabsTrigger value="samples">Sample Streams</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stream-url">Stream URL</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="stream-url"
                      placeholder="https://example.com/stream.m3u8"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                    />
                    <Button 
                      onClick={analyzeStream}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze"}
                    </Button>
                  </div>
                </div>

                {streamInfo && (
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center space-x-4">
                      <Badge className={getProtocolBadgeColor(streamInfo.protocol)}>
                        {streamInfo.protocol.toUpperCase()}
                      </Badge>
                      <Badge variant={streamInfo.isLive ? "default" : "secondary"}>
                        {streamInfo.isLive ? "LIVE" : "VOD"}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Signal className="h-4 w-4" />
                        <span>Quality: {streamInfo.quality}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p><strong>Protocol:</strong> {streamInfo.protocol}</p>
                      <p><strong>Stream Type:</strong> {streamInfo.isLive ? "Live Stream" : "Video on Demand"}</p>
                      <p><strong>URL:</strong> <code className="bg-background px-1 rounded text-xs">{streamInfo.url}</code></p>
                    </div>
                  </div>
                )}
              </div>

              {streamInfo && (
                <div className="space-y-2">
                  <Label>Stream Player</Label>
                  <WebPlayer
                    src={streamInfo.url}
                    title={`Test Stream - ${streamInfo.protocol.toUpperCase()}`}
                    className="w-full h-64"
                    onLoad={() => {
                      toast({
                        title: "Stream Loaded",
                        description: "Stream is ready to play",
                      });
                    }}
                    onError={(error) => {
                      toast({
                        title: "Playback Error",
                        description: error,
                        variant: "destructive"
                      });
                    }}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="samples" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Badge className="bg-blue-500 text-white">HLS</Badge>
                    <span>HTTP Live Streaming</span>
                  </h4>
                  <div className="space-y-2">
                    {sampleStreams.hls.map((stream, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{stream.name}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadSampleStream(stream.url)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Badge className="bg-green-500 text-white">DASH</Badge>
                    <span>Dynamic Adaptive Streaming</span>
                  </h4>
                  <div className="space-y-2">
                    {sampleStreams.dash.map((stream, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{stream.name}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadSampleStream(stream.url)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Badge className="bg-gray-500 text-white">MP4</Badge>
                    <span>Progressive Download</span>
                  </h4>
                  <div className="space-y-2">
                    {sampleStreams.progressive.map((stream, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{stream.name}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadSampleStream(stream.url)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="capabilities" className="space-y-4">
              {capabilities ? (
                <div className="space-y-4">
                  <h4 className="font-semibold">Browser Streaming Capabilities</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-500 text-white text-xs">HLS</Badge>
                        <span className="text-sm">Native HLS Support</span>
                      </div>
                      {capabilities.hls ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-500 text-white text-xs">DASH</Badge>
                        <span className="text-sm">MediaSource Extensions</span>
                      </div>
                      {capabilities.dash ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-purple-500 text-white text-xs">WebRTC</Badge>
                        <span className="text-sm">Real-time Communication</span>
                      </div>
                      {capabilities.webrtc ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-orange-500 text-white text-xs">MSE</Badge>
                        <span className="text-sm">Media Source Extensions</span>
                      </div>
                      {capabilities.mse ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">Recommendations</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {!capabilities.hls && <li>• HLS.js will be used for HLS streams</li>}
                      {!capabilities.dash && <li>• DASH streams may not be supported</li>}
                      {capabilities.webrtc && <li>• WebRTC streams are supported for low-latency</li>}
                      {capabilities.mse && <li>• Adaptive streaming is available</li>}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wifi className="h-12 w-12 mx-auto mb-2" />
                  <p>Analyze a stream to view browser capabilities</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default StreamTester;
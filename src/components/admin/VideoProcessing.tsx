import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Play, 
  Square, 
  Settings, 
  Monitor, 
  FileText, 
  Cpu,
  Video,
  AudioLines,
  Eye,
  Download
} from "lucide-react";
import VideoProcessor from "@/utils/VideoProcessor";

interface RunningStream {
  pid: number;
  streamId: string;
  channelId: string;
  command: string;
  startTime: Date;
  status: string;
}

interface FFmpegInfo {
  version: string;
  build: string;
  configuration: string[];
}

const VideoProcessing = () => {
  const [runningStreams, setRunningStreams] = useState<RunningStream[]>([]);
  const [ffmpegInfo, setFfmpegInfo] = useState<FFmpegInfo | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedStreamLogs, setSelectedStreamLogs] = useState<string>('');
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const { toast } = useToast();

  const [streamConfig, setStreamConfig] = useState({
    sourceUrl: '',
    sourceProtocol: 'rtmp' as 'rtmp' | 'rtsp' | 'http' | 'hls' | 'srt' | 'udp',
    sourceUsername: '',
    sourcePassword: '',
    outputFormat: 'hls' as 'hls' | 'dash' | 'rtmp',
    profile: 'hd_h264',
    outputPath: '/tmp/streams',
    channelId: ''
  });

  const videoProcessor = VideoProcessor.getInstance();
  const standardProfiles = VideoProcessor.getStandardProfiles();

  useEffect(() => {
    loadFFmpegInfo();
    loadRunningStreams();
    
    const interval = setInterval(loadRunningStreams, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadFFmpegInfo = async () => {
    try {
      const info = await videoProcessor.getFFmpegVersion();
      setFfmpegInfo(info);
    } catch (error) {
      console.error('Error loading FFmpeg info:', error);
      toast({
        title: "FFmpeg Status",
        description: "Could not detect FFmpeg installation. Please ensure FFmpeg 7.1 is installed.",
        variant: "destructive"
      });
    }
  };

  const loadRunningStreams = async () => {
    try {
      const streams = await videoProcessor.getRunningStreams();
      setRunningStreams(streams);
    } catch (error) {
      console.error('Error loading running streams:', error);
    }
  };

  const handleStartStream = async () => {
    try {
      if (!streamConfig.sourceUrl || !streamConfig.channelId) {
        toast({
          title: "Missing Configuration",
          description: "Please provide source URL and channel ID",
          variant: "destructive"
        });
        return;
      }

      const source = {
        url: streamConfig.sourceUrl,
        protocol: streamConfig.sourceProtocol,
        username: streamConfig.sourceUsername || undefined,
        password: streamConfig.sourcePassword || undefined
      };

      const output = {
        url: `${streamConfig.outputPath}/stream_${Date.now()}`,
        format: streamConfig.outputFormat,
        path: streamConfig.outputPath,
        segmentDuration: 6,
        playlistSize: 10
      };

      const profile = standardProfiles[streamConfig.profile];

      const streamId = await videoProcessor.startTranscode(
        streamConfig.channelId,
        source,
        output,
        profile
      );

      toast({
        title: "Stream Started",
        description: `FFmpeg transcoding started for stream ${streamId}`,
      });

      setShowStartDialog(false);
      loadRunningStreams();
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Stream Start Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleStopStream = async (streamId: string) => {
    try {
      await videoProcessor.stopTranscode(streamId);
      toast({
        title: "Stream Stopped",
        description: `FFmpeg process stopped for stream ${streamId}`,
      });
      loadRunningStreams();
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast({
        title: "Stop Failed",
        description: error instanceof Error ? error.message : "Failed to stop stream",
        variant: "destructive"
      });
    }
  };

  const handleViewLogs = async (streamId: string) => {
    try {
      const logs = await videoProcessor.getStreamLogs(streamId);
      setSelectedStreamLogs(logs);
      setSelectedStreamId(streamId);
      setShowLogsDialog(true);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: "Logs Error",
        description: "Failed to load stream logs",
        variant: "destructive"
      });
    }
  };

  const formatUptime = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* FFmpeg Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <CardTitle>Dragon Shield FFmpeg Integration</CardTitle>
            </div>
            <Badge variant={ffmpegInfo ? "default" : "destructive"}>
              {ffmpegInfo ? 'Active' : 'Not Detected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {ffmpegInfo ? (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Version</Label>
                  <p className="text-sm text-muted-foreground">{ffmpegInfo.version}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Build</Label>
                  <p className="text-sm text-muted-foreground">{ffmpegInfo.build}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Configuration</Label>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {ffmpegInfo.configuration.map((config, index) => (
                    <Badge key={index} variant="outline" className="mr-1 mb-1 text-xs">
                      {config.replace('--', '')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">FFmpeg not detected. Please ensure FFmpeg 7.1 is installed and accessible.</p>
              <Button 
                onClick={loadFFmpegInfo}
                variant="outline"
                className="mt-2"
              >
                <Download className="h-4 w-4 mr-2" />
                Retry Detection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Running Streams */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <CardTitle>Active Transcode Processes</CardTitle>
            </div>
            <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Start Stream
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {runningStreams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Stream ID</th>
                    <th className="text-left p-3 font-medium">Channel</th>
                    <th className="text-left p-3 font-medium">PID</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Uptime</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runningStreams.map((stream) => (
                    <tr key={stream.streamId} className="border-t">
                      <td className="p-3">
                        <span className="font-mono text-sm">{stream.streamId.slice(0, 8)}...</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{stream.channelId}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{stream.pid}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={stream.status === 'running' ? 'default' : 'secondary'}
                        >
                          {stream.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{formatUptime(stream.startTime)}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewLogs(stream.streamId)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStopStream(stream.streamId)}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active transcode processes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Stream Dialog */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start New Transcode Stream</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Channel ID</Label>
              <Input
                value={streamConfig.channelId}
                onChange={(e) => setStreamConfig({...streamConfig, channelId: e.target.value})}
                placeholder="channel-uuid"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Source Protocol</Label>
              <Select 
                value={streamConfig.sourceProtocol} 
                onValueChange={(value: any) => setStreamConfig({...streamConfig, sourceProtocol: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rtmp">RTMP</SelectItem>
                  <SelectItem value="rtsp">RTSP</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="hls">HLS</SelectItem>
                  <SelectItem value="srt">SRT</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Source URL</Label>
            <Input
              value={streamConfig.sourceUrl}
              onChange={(e) => setStreamConfig({...streamConfig, sourceUrl: e.target.value})}
              placeholder="rtmp://source.example.com/live/stream"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username (optional)</Label>
              <Input
                value={streamConfig.sourceUsername}
                onChange={(e) => setStreamConfig({...streamConfig, sourceUsername: e.target.value})}
                placeholder="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Password (optional)</Label>
              <Input
                type="password"
                value={streamConfig.sourcePassword}
                onChange={(e) => setStreamConfig({...streamConfig, sourcePassword: e.target.value})}
                placeholder="password"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transcode Profile</Label>
              <Select 
                value={streamConfig.profile} 
                onValueChange={(value) => setStreamConfig({...streamConfig, profile: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(standardProfiles).map(([key, profile]) => (
                    <SelectItem key={key} value={key}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select 
                value={streamConfig.outputFormat} 
                onValueChange={(value: any) => setStreamConfig({...streamConfig, outputFormat: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hls">HLS (.m3u8)</SelectItem>
                  <SelectItem value="dash">DASH (.mpd)</SelectItem>
                  <SelectItem value="rtmp">RTMP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Output Path</Label>
            <Input
              value={streamConfig.outputPath}
              onChange={(e) => setStreamConfig({...streamConfig, outputPath: e.target.value})}
              placeholder="/tmp/streams"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartStream}>
              <Play className="h-4 w-4 mr-2" />
              Start Transcode
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Stream Logs - {selectedStreamId.slice(0, 8)}...
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={selectedStreamLogs}
              readOnly
              className="font-mono text-xs h-96 resize-none"
              placeholder="Loading logs..."
            />
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowLogsDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoProcessing;
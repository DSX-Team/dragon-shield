import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Channel {
  id: string;
  name: string;
  category: string;
  logo_url: string;
  upstream_sources: any;
}

const Player = () => {
  const { channelId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadChannel();
    };

    checkAuth();
  }, [channelId, navigate]);

  const loadChannel = async () => {
    if (!channelId) {
      setError("Invalid channel ID");
      setLoading(false);
      return;
    }

    try {
      const { data: channelData, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .eq("active", true)
        .single();

      if (error || !channelData) {
        setError("Channel not found or inactive");
        setLoading(false);
        return;
      }

      setChannel(channelData);
      setLoading(false);

      // Initialize video player
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Get user profile for authentication
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user?.id)
          .single();

        if (profileData) {
          const streamUrl = `https://ccibslznriatjflaknso.functions.supabase.co/stream-control/live/${profileData.username}/placeholder_password/${channelId}.m3u8`;
          
          video.src = streamUrl;
          video.load();
        }
      }
    } catch (err) {
      console.error("Error loading channel:", err);
      setError("Failed to load channel");
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (isFullscreen) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Play className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-muted-foreground">Loading channel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-background/90 backdrop-blur-sm border-b p-4 absolute top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {channel?.logo_url && (
              <img src={channel.logo_url} alt={channel.name} className="h-8 w-8 object-contain" />
            )}
            <div>
              <h1 className="font-bold">{channel?.name}</h1>
              <Badge variant="secondary" className="text-xs">
                {channel?.category}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Video Player */}
      <div className="relative w-full h-screen pt-16">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls={false}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("Video error:", e);
            setError("Failed to load stream");
            toast({
              title: "Stream Error",
              description: "Unable to load the video stream. Please try again.",
              variant: "destructive"
            });
          }}
        />

        {/* Custom Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-white text-sm">{channel?.name}</span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading/Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadChannel}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Player;
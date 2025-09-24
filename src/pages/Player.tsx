import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Signal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WebPlayer from "@/components/player/WebPlayer";
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
  const [error, setError] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
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

      // Generate stream URL
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .single();

        if (profileData) {
          const url = `https://ccibslznriatjflaknso.functions.supabase.co/stream-control/live/${profileData.username}/placeholder_password/${channelId}.m3u8`;
          setStreamUrl(url);
          console.log('Stream URL generated:', url);
        }
      }
    } catch (err) {
      console.error("Error loading channel:", err);
      setError("Failed to load channel");
      setLoading(false);
    }
  };

  const handleStreamLoad = () => {
    console.log('Stream loaded successfully');
    toast({
      title: "Stream Connected",
      description: "Now streaming live content",
    });
  };

  const handleStreamError = (error: string) => {
    console.error('Stream error:', error);
    setError(error);
    toast({
      title: "Stream Error",
      description: "Unable to load the video stream. Please try again.",
      variant: "destructive"
    });
  };

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    // Handle time updates if needed for analytics
    console.log('Stream time:', currentTime, duration);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Signal className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
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

      {/* Enhanced Video Player */}
      <div className="relative w-full h-screen pt-16">
        {streamUrl ? (
          <WebPlayer
            src={streamUrl}
            title={channel?.name}
            poster={channel?.logo_url}
            autoplay={true}
            className="w-full h-full"
            onLoad={handleStreamLoad}
            onError={handleStreamError}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <Signal className="h-12 w-12 mx-auto mb-4 animate-pulse" />
              <p className="text-lg mb-2">Preparing stream...</p>
              <p className="text-sm text-white/70">Setting up connection to {channel?.name}</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadChannel}>
                  Retry Connection
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
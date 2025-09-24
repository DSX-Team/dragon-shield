import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  RotateCcw,
  RotateCw,
  Monitor,
  Smartphone,
  Tv
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WebPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const WebPlayer = ({ 
  src, 
  title, 
  poster, 
  autoplay = false, 
  controls = true,
  className,
  onLoad,
  onError,
  onTimeUpdate 
}: WebPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([0.8]);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState("auto");
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile" | "tv">("desktop");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      onLoad?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handleError = () => {
      onError?.("Failed to load video stream");
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("error", handleError);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("error", handleError);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [onLoad, onError, onTimeUpdate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    setVolume([newVolume]);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume[0];
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const rewind = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const fastForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  };

  return (
    <Card className={cn("relative overflow-hidden bg-black", className)}>
      <div 
        className="relative group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoplay}
          className="w-full h-full object-contain"
          playsInline
        />

        {/* Loading/Error Overlay */}
        {!src && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No stream available</p>
            </div>
          </div>
        )}

        {/* Title Overlay */}
        {title && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold">{title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                LIVE
              </Badge>
              <Badge variant="outline" className="text-white border-white/20">
                HD
              </Badge>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {controls && (
          <div 
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Progress Bar */}
            <div className="mb-4">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/70 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={rewind}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={fastForward}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>

                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/10"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <div className="w-16">
                    <Slider
                      value={isMuted ? [0] : volume}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Device Type Indicator */}
                <div className="flex items-center space-x-1">
                  {deviceType === "desktop" && <Monitor className="h-4 w-4 text-white/70" />}
                  {deviceType === "mobile" && <Smartphone className="h-4 w-4 text-white/70" />}
                  {deviceType === "tv" && <Tv className="h-4 w-4 text-white/70" />}
                </div>

                {/* Quality Badge */}
                <Badge variant="outline" className="text-white border-white/20 text-xs">
                  {quality.toUpperCase()}
                </Badge>

                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={toggleFullscreen}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WebPlayer;
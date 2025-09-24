// Stream detection and protocol handling utility

export interface StreamInfo {
  url: string;
  protocol: 'hls' | 'dash' | 'webrtc' | 'progressive' | 'rtmp' | 'ts' | 'm3u' | 'mpegts';
  isLive: boolean;
  quality?: string;
  audioTracks?: AudioTrack[];
  subtitles?: SubtitleTrack[];
}

export interface AudioTrack {
  id: string;
  language: string;
  label: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  src: string;
}

export class StreamingEngine {
  private static instance: StreamingEngine;
  private hlsSupported: boolean;
  private dashSupported: boolean;

  constructor() {
    this.hlsSupported = this.checkHLSSupport();
    this.dashSupported = this.checkDASHSupport();
  }

  public static getInstance(): StreamingEngine {
    if (!StreamingEngine.instance) {
      StreamingEngine.instance = new StreamingEngine();
    }
    return StreamingEngine.instance;
  }

  private checkHLSSupport(): boolean {
    const video = document.createElement('video');
    return video.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  private checkDASHSupport(): boolean {
    return 'MediaSource' in window;
  }

  public detectStreamProtocol(url: string): StreamInfo['protocol'] {
    const urlLower = url.toLowerCase();
    
    // HLS formats
    if (urlLower.includes('.m3u8') || urlLower.includes('hls')) {
      return 'hls';
    }
    
    // M3U playlists
    if (urlLower.includes('.m3u') && !urlLower.includes('.m3u8')) {
      return 'm3u';
    }
    
    // Transport Stream formats
    if (urlLower.includes('.ts') || urlLower.includes('mpegts') || urlLower.includes('mpeg-ts')) {
      return 'ts';
    }
    
    // MPEG-TS specific
    if (urlLower.includes('mpegts') || urlLower.includes('mpeg2ts')) {
      return 'mpegts';
    }
    
    // DASH
    if (urlLower.includes('.mpd') || urlLower.includes('dash')) {
      return 'dash';
    }
    
    // WebRTC
    if (urlLower.startsWith('webrtc:') || urlLower.includes('webrtc')) {
      return 'webrtc';
    }
    
    // RTMP
    if (urlLower.startsWith('rtmp:') || urlLower.startsWith('rtmps:')) {
      return 'rtmp';
    }
    
    return 'progressive';
  }

  public analyzeStream(url: string): StreamInfo {
    const protocol = this.detectStreamProtocol(url);
    const isLive = ['hls', 'dash', 'webrtc', 'rtmp', 'ts', 'm3u', 'mpegts'].includes(protocol);
    
    return {
      url,
      protocol,
      isLive,
      quality: 'auto',
      audioTracks: [],
      subtitles: []
    };
  }

  public async setupPlayer(video: HTMLVideoElement, streamInfo: StreamInfo): Promise<any> {
    console.log('Setting up player for protocol:', streamInfo.protocol, streamInfo.url);
    
    switch (streamInfo.protocol) {
      case 'hls':
        return this.setupHLSPlayer(video, streamInfo);
      case 'dash':
        return this.setupDASHPlayer(video, streamInfo);
      case 'webrtc':
        return this.setupWebRTCPlayer(video, streamInfo);
      case 'ts':
      case 'mpegts':
        return this.setupTSPlayer(video, streamInfo);
      case 'm3u':
        return this.setupM3UPlayer(video, streamInfo);
      case 'progressive':
        return this.setupProgressivePlayer(video, streamInfo);
      default:
        throw new Error(`Unsupported protocol: ${streamInfo.protocol}`);
    }
  }

  private async setupHLSPlayer(video: HTMLVideoElement, streamInfo: StreamInfo) {
    if (this.hlsSupported) {
      // Native HLS support (Safari)
      console.log('Using native HLS support');
      video.src = streamInfo.url;
      return null;
    } else {
      // Use HLS.js for other browsers
      try {
        const Hls = (await import('hls.js')).default;
        
        if (Hls.isSupported()) {
          console.log('Using HLS.js');
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: streamInfo.isLive,
            backBufferLength: streamInfo.isLive ? 10 : 30,
            maxBufferLength: streamInfo.isLive ? 20 : 60,
            maxMaxBufferLength: streamInfo.isLive ? 30 : 120,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            debug: process.env.NODE_ENV === 'development'
          });
          
          hls.loadSource(streamInfo.url);
          hls.attachMedia(video);
          
          // Handle events
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest loaded');
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('Fatal network error, trying to recover...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('Fatal media error, trying to recover...');
                  hls.recoverMediaError();
                  break;
                default:
                  console.log('Fatal error, cannot recover');
                  hls.destroy();
                  break;
              }
            }
          });
          
          return hls;
        } else {
          throw new Error('HLS not supported');
        }
      } catch (error) {
        console.error('Failed to load HLS.js:', error);
        // Fallback to native
        video.src = streamInfo.url;
        return null;
      }
    }
  }

  private async setupDASHPlayer(video: HTMLVideoElement, streamInfo: StreamInfo) {
    try {
      const dashjs = await import('dashjs');
      console.log('Using dash.js');
      
      const player = dashjs.MediaPlayer().create();
      player.initialize(video, streamInfo.url, true);
      
      return player;
    } catch (error) {
      console.error('Failed to load dash.js:', error);
      // Fallback to native
      video.src = streamInfo.url;
      return null;
    }
  }

  private async setupWebRTCPlayer(video: HTMLVideoElement, streamInfo: StreamInfo) {
    console.log('Setting up WebRTC player');
    
    // This is a basic WebRTC setup - you'd need to implement signaling
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    pc.ontrack = (event) => {
      console.log('Received WebRTC stream');
      video.srcObject = event.streams[0];
    };

    // You'd need to implement the actual WebRTC signaling here
    // This is just a placeholder structure
    return pc;
  }

  private async setupTSPlayer(video: HTMLVideoElement, streamInfo: StreamInfo) {
    console.log('Setting up TS/MPEGTS player');
    
    // For TS streams, we can try HLS.js if available, or fall back to native
    if (this.hlsSupported) {
      // Native support - set directly
      video.src = streamInfo.url;
      return null;
    } else {
      // Try HLS.js for better TS handling
      try {
        const Hls = (await import('hls.js')).default;
        
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 5,
            maxBufferLength: 15,
            debug: process.env.NODE_ENV === 'development'
          });
          
          // Create a simple M3U8 wrapper for the TS stream
          const m3u8Url = streamInfo.url.replace(/\.(ts|mpegts)$/i, '.m3u8');
          
          hls.loadSource(m3u8Url);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.warn('HLS TS error, falling back to native:', data);
            if (data.fatal) {
              // Fallback to native
              video.src = streamInfo.url;
            }
          });
          
          return hls;
        }
      } catch (error) {
        console.log('HLS.js not available for TS, using native');
      }
      
      // Fallback to native
      video.src = streamInfo.url;
      return null;
    }
  }

  private async setupM3UPlayer(video: HTMLVideoElement, streamInfo: StreamInfo) {
    console.log('Setting up M3U playlist player');
    
    // M3U files are playlists, we need to fetch and parse them
    try {
      const response = await fetch(streamInfo.url);
      const m3uContent = await response.text();
      
      // Parse M3U content and find the first stream URL
      const lines = m3uContent.split('\n');
      let streamUrl = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          streamUrl = trimmedLine;
          break;
        }
      }
      
      if (streamUrl) {
        console.log('Found stream URL in M3U:', streamUrl);
        // Recursively analyze and setup the actual stream
        const actualStreamInfo = this.analyzeStream(streamUrl);
        return this.setupPlayer(video, actualStreamInfo);
      } else {
        throw new Error('No valid stream URL found in M3U playlist');
      }
    } catch (error) {
      console.error('Failed to parse M3U playlist:', error);
      // Fallback: try to play the M3U directly
      video.src = streamInfo.url;
      return null;
    }
  }

  private setupProgressivePlayer(video: HTMLVideoElement, streamInfo: StreamInfo) {
    console.log('Using progressive download');
    video.src = streamInfo.url;
    return null;
  }

  public cleanup(player: any, protocol: StreamInfo['protocol']) {
    if (!player) return;
    
    switch (protocol) {
      case 'hls':
      case 'ts':
      case 'mpegts':
      case 'm3u':
        if (player && player.destroy) {
          player.destroy();
        }
        break;
      case 'dash':
        if (player && player.destroy) {
          player.destroy();
        }
        break;
      case 'webrtc':
        if (player && player.close) {
          player.close();
        }
        break;
    }
  }

  public getCapabilities() {
    return {
      hls: this.hlsSupported,
      dash: this.dashSupported,
      webrtc: 'RTCPeerConnection' in window,
      mse: 'MediaSource' in window
    };
  }
}

export default StreamingEngine;
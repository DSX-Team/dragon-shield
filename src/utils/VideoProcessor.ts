import { supabase } from "@/integrations/supabase/client";

interface FFmpegProcess {
  pid: number;
  streamId: string;
  channelId: string;
  command: string;
  startTime: Date;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
}

interface TranscodeProfile {
  name: string;
  video: {
    codec: string;
    bitrate: string;
    resolution?: string;
    fps?: number;
  };
  audio: {
    codec: string;
    bitrate: string;
    sampleRate?: number;
  };
  format: string;
  preset?: string;
  options?: string[];
}

interface StreamSource {
  url: string;
  protocol: 'rtmp' | 'rtsp' | 'http' | 'hls' | 'srt' | 'udp';
  username?: string;
  password?: string;
}

interface StreamOutput {
  url: string;
  format: 'hls' | 'dash' | 'rtmp' | 'webrtc';
  segmentDuration?: number;
  playlistSize?: number;
  path: string;
}

export class VideoProcessor {
  private static instance: VideoProcessor;
  private runningProcesses: Map<string, FFmpegProcess> = new Map();
  private ffmpegPath: string = '/usr/local/bin/ffmpeg'; // Default path
  private ffprobePath: string = '/usr/local/bin/ffprobe'; // Default path

  private constructor() {
    this.initializePaths();
  }

  static getInstance(): VideoProcessor {
    if (!VideoProcessor.instance) {
      VideoProcessor.instance = new VideoProcessor();
    }
    return VideoProcessor.instance;
  }

  private async initializePaths() {
    // Check for custom FFmpeg paths in environment or configuration
    try {
      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'execute_command',
          serverId: 'local',
          command: 'which ffmpeg'
        }
      });

      if (response.data?.success && response.data.output) {
        this.ffmpegPath = response.data.output.trim();
      }
    } catch (error) {
      console.warn('Could not determine FFmpeg path, using default:', error);
    }

    try {
      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'execute_command',
          serverId: 'local',
          command: 'which ffprobe'
        }
      });

      if (response.data?.success && response.data.output) {
        this.ffprobePath = response.data.output.trim();
      }
    } catch (error) {
      console.warn('Could not determine FFprobe path, using default:', error);
    }
  }

  async getFFmpegVersion(): Promise<{ version: string; build: string; configuration: string[] }> {
    try {
      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'execute_command',
          serverId: 'local',
          command: 'ffmpeg -version'
        }
      });

      if (response.data?.success) {
        const output = response.data.output;
        const lines = output.split('\n');
        const versionLine = lines[0] || '';
        const buildLine = lines[1] || '';
        const configLines = lines.filter((line: string) => line.includes('--'));

        return {
          version: versionLine.replace('ffmpeg version ', '').split(' ')[0],
          build: buildLine,
          configuration: configLines
        };
      }
      throw new Error('Failed to get FFmpeg version');
    } catch (error) {
      console.error('Error getting FFmpeg version:', error);
      throw error;
    }
  }

  async probeStream(source: StreamSource): Promise<any> {
    try {
      let probeCommand = `${this.ffprobePath} -v quiet -print_format json -show_format -show_streams`;
      
      // Add authentication if provided
      if (source.username && source.password) {
        probeCommand += ` -headers "Authorization: Basic ${btoa(source.username + ':' + source.password)}"`;
      }
      
      probeCommand += ` "${source.url}"`;

      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'execute_command',
          serverId: 'local',
          command: probeCommand
        }
      });

      if (response.data?.success) {
        return JSON.parse(response.data.output);
      }
      throw new Error(response.data?.error || 'Failed to probe stream');
    } catch (error) {
      console.error('Error probing stream:', error);
      throw error;
    }
  }

  buildFFmpegCommand(
    source: StreamSource,
    output: StreamOutput,
    profile: TranscodeProfile,
    streamId: string
  ): string {
    const command = [this.ffmpegPath];

    // Input options
    command.push('-re'); // Read input at native frame rate
    command.push('-i', source.url);

    // Video encoding options
    command.push('-c:v', profile.video.codec);
    command.push('-b:v', profile.video.bitrate);
    
    if (profile.video.resolution) {
      command.push('-s', profile.video.resolution);
    }
    
    if (profile.video.fps) {
      command.push('-r', profile.video.fps.toString());
    }

    // Audio encoding options
    command.push('-c:a', profile.audio.codec);
    command.push('-b:a', profile.audio.bitrate);
    
    if (profile.audio.sampleRate) {
      command.push('-ar', profile.audio.sampleRate.toString());
    }

    // Preset for encoding speed/quality balance
    if (profile.preset) {
      command.push('-preset', profile.preset);
    }

    // Format-specific options
    switch (output.format) {
      case 'hls':
        command.push('-f', 'hls');
        command.push('-hls_time', (output.segmentDuration || 6).toString());
        command.push('-hls_list_size', (output.playlistSize || 10).toString());
        command.push('-hls_flags', 'delete_segments+append_list');
        command.push('-hls_segment_filename', `${output.path}/segment_%03d.ts`);
        command.push(`${output.path}/playlist.m3u8`);
        break;
      
      case 'dash':
        command.push('-f', 'dash');
        command.push('-seg_duration', (output.segmentDuration || 6).toString());
        command.push('-window_size', (output.playlistSize || 5).toString());
        command.push('-remove_at_exit', '1');
        command.push(`${output.path}/manifest.mpd`);
        break;
      
      case 'rtmp':
        command.push('-f', 'flv');
        command.push(output.url);
        break;
    }

    // Add custom options
    if (profile.options) {
      command.push(...profile.options);
    }

    // Add metadata
    command.push('-metadata', `title="Dragon Shield IPTV - Stream ${streamId}"`);
    command.push('-y'); // Overwrite output files

    return command.join(' ');
  }

  async startTranscode(
    channelId: string,
    source: StreamSource,
    output: StreamOutput,
    profile: TranscodeProfile
  ): Promise<string> {
    try {
      // Create stream record
      const { data: stream, error: streamError } = await supabase
        .from('streams')
        .insert({
          channel_id: channelId,
          user_id: (await supabase.auth.getUser()).data.user?.id!,
          state: 'starting',
          stream_url: output.url
        })
        .select()
        .single();

      if (streamError) throw streamError;

      const streamId = stream.id;
      const command = this.buildFFmpegCommand(source, output, profile, streamId);

      console.log(`Starting FFmpeg process for stream ${streamId}:`, command);

      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'execute_command',
          serverId: 'local',
          command: `${command} > /tmp/ffmpeg_${streamId}.log 2>&1 & echo $!`
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to start FFmpeg process');
      }

      const pid = parseInt(response.data.output.trim());
      
      // Update stream with FFmpeg PID
      const { error: updateError } = await supabase
        .from('streams')
        .update({ 
          ffmpeg_pid: pid,
          state: 'running'
        })
        .eq('id', streamId);

      if (updateError) throw updateError;

      // Track the process
      const ffmpegProcess: FFmpegProcess = {
        pid,
        streamId,
        channelId,
        command,
        startTime: new Date(),
        status: 'running'
      };

      this.runningProcesses.set(streamId, ffmpegProcess);

      // Start monitoring the process
      this.monitorProcess(streamId);

      return streamId;
    } catch (error) {
      console.error('Error starting transcode:', error);
      throw error;
    }
  }

  async stopTranscode(streamId: string): Promise<void> {
    try {
      const process = this.runningProcesses.get(streamId);
      if (!process) {
        throw new Error('Process not found');
      }

      // Kill the FFmpeg process
      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'execute_command',
          serverId: 'local',
          command: `kill -TERM ${process.pid}`
        }
      });

      if (!response.data?.success) {
        // Force kill if graceful termination fails
        await supabase.functions.invoke('secure-server-management', {
          body: {
            action: 'execute_command',
            serverId: 'local',
            command: `kill -9 ${process.pid}`
          }
        });
      }

      // Update stream record
      const { error: updateError } = await supabase
        .from('streams')
        .update({ 
          state: 'stopped',
          end_timestamp: new Date().toISOString()
        })
        .eq('id', streamId);

      if (updateError) console.error('Error updating stream record:', updateError);

      // Remove from tracking
      this.runningProcesses.delete(streamId);

      console.log(`Stopped FFmpeg process for stream ${streamId}`);
    } catch (error) {
      console.error('Error stopping transcode:', error);
      throw error;
    }
  }

  private async monitorProcess(streamId: string): Promise<void> {
    const process = this.runningProcesses.get(streamId);
    if (!process) return;

    const checkInterval = setInterval(async () => {
      try {
        // Check if process is still running
        const response = await supabase.functions.invoke('secure-server-management', {
          body: {
            action: 'execute_command',
            serverId: 'local',
            command: `ps -p ${process.pid} -o pid=`
          }
        });

        if (!response.data?.success || !response.data.output.trim()) {
          // Process has stopped
          clearInterval(checkInterval);
          
          const { error: updateError } = await supabase
            .from('streams')
            .update({ 
              state: 'stopped',
              end_timestamp: new Date().toISOString()
            })
            .eq('id', streamId);

          if (updateError) console.error('Error updating stream record:', updateError);
          
          this.runningProcesses.delete(streamId);
          console.log(`FFmpeg process ${process.pid} for stream ${streamId} has stopped`);
        }
      } catch (error) {
        console.error('Error monitoring process:', error);
        clearInterval(checkInterval);
      }
    }, 10000); // Check every 10 seconds
  }

  async getRunningStreams(): Promise<FFmpegProcess[]> {
    return Array.from(this.runningProcesses.values());
  }

  async getStreamLogs(streamId: string): Promise<string> {
    try {
      const response = await supabase.functions.invoke('secure-server-management', {
        body: {
          action: 'execute_command',
          serverId: 'local',
          command: `cat /tmp/ffmpeg_${streamId}.log`
        }
      });

      return response.data?.success ? response.data.output : 'No logs available';
    } catch (error) {
      console.error('Error getting stream logs:', error);
      return 'Error retrieving logs';
    }
  }

  // Predefined transcode profiles for Dragon Shield IPTV
  static getStandardProfiles(): { [key: string]: TranscodeProfile } {
    return {
      'hd_h264': {
        name: 'HD H.264',
        video: {
          codec: 'libx264',
          bitrate: '3000k',
          resolution: '1280x720',
          fps: 25
        },
        audio: {
          codec: 'aac',
          bitrate: '128k',
          sampleRate: 48000
        },
        format: 'hls',
        preset: 'medium',
        options: ['-g', '50', '-keyint_min', '25', '-sc_threshold', '0']
      },
      'sd_h264': {
        name: 'SD H.264',
        video: {
          codec: 'libx264',
          bitrate: '1500k',
          resolution: '854x480',
          fps: 25
        },
        audio: {
          codec: 'aac',
          bitrate: '96k',
          sampleRate: 44100
        },
        format: 'hls',
        preset: 'medium',
        options: ['-g', '50', '-keyint_min', '25']
      },
      'low_latency': {
        name: 'Low Latency',
        video: {
          codec: 'libx264',
          bitrate: '2000k',
          fps: 30
        },
        audio: {
          codec: 'aac',
          bitrate: '128k',
          sampleRate: 48000
        },
        format: 'hls',
        preset: 'ultrafast',
        options: ['-tune', 'zerolatency', '-g', '30']
      }
    };
  }
}

export default VideoProcessor;
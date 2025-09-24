# Dragon Shield IPTV - FFmpeg Integration Guide

## Overview

Dragon Shield IPTV now includes a comprehensive FFmpeg integration system that provides professional-grade video processing capabilities. This system is specifically compiled and optimized for Dragon Shield IPTV operations.

## FFmpeg 7.1 Integration Features

### Core Components

1. **VideoProcessor Class** (`src/utils/VideoProcessor.ts`)
   - Singleton pattern for centralized video processing
   - Stream analysis and transcoding management
   - Process monitoring and lifecycle management
   - Secure command execution through edge functions

2. **Video Processing Admin Panel** (`src/components/admin/VideoProcessing.tsx`)
   - Real-time monitoring of active transcode processes
   - Stream configuration and management interface
   - FFmpeg version detection and capability analysis
   - Live log viewing and process control

3. **Secure Server Management** (Enhanced)
   - Encrypted credential storage for server access
   - Whitelisted command execution for security
   - Process monitoring and management
   - Audit logging for all operations

## Installation Requirements

### Server Requirements

1. **FFmpeg 7.1** - Must be installed and accessible via PATH
2. **FFprobe** - Required for stream analysis
3. **SSH Access** - For remote server management
4. **File System Access** - For output file management

### Installation Steps

#### 1. Install FFmpeg 7.1

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Verify installation
ffmpeg -version
ffprobe -version
```

#### 2. Configure Dragon Shield IPTV

1. Access the Admin Panel
2. Navigate to the "Video Processing" tab
3. The system will automatically detect FFmpeg installation
4. Configure your streaming servers in the "Servers" tab

#### 3. Server Setup

```bash
# Create streams directory
sudo mkdir -p /tmp/streams
sudo chown -R www-data:www-data /tmp/streams
sudo chmod 755 /tmp/streams

# Set up log directory
sudo mkdir -p /tmp/logs
sudo chown -R www-data:www-data /tmp/logs
```

## Configuration

### Transcode Profiles

The system includes pre-configured transcode profiles optimized for IPTV:

#### HD H.264 Profile
- **Video**: H.264, 3000k bitrate, 1280x720, 25fps
- **Audio**: AAC, 128k bitrate, 48kHz
- **Output**: HLS segments
- **Use Case**: High-quality live streaming

#### SD H.264 Profile  
- **Video**: H.264, 1500k bitrate, 854x480, 25fps
- **Audio**: AAC, 96k bitrate, 44.1kHz
- **Output**: HLS segments
- **Use Case**: Bandwidth-optimized streaming

#### Low Latency Profile
- **Video**: H.264, 2000k bitrate, 30fps, ultrafast preset
- **Audio**: AAC, 128k bitrate, 48kHz
- **Output**: HLS with zero latency tuning
- **Use Case**: Interactive streaming applications

### Custom Profiles

You can create custom profiles by modifying the `VideoProcessor.getStandardProfiles()` method:

```typescript
'custom_profile': {
  name: 'Custom Profile',
  video: {
    codec: 'libx264',
    bitrate: '2500k',
    resolution: '1024x576',
    fps: 30
  },
  audio: {
    codec: 'aac', 
    bitrate: '128k',
    sampleRate: 48000
  },
  format: 'hls',
  preset: 'medium',
  options: ['-g', '60', '-keyint_min', '30']
}
```

## Usage

### Starting a Transcode Stream

1. **Via Admin Panel**:
   - Go to Video Processing tab
   - Click "Start Stream"
   - Configure source URL and output settings
   - Select transcode profile
   - Click "Start Transcode"

2. **Via API** (VideoProcessor class):
   ```typescript
   const videoProcessor = VideoProcessor.getInstance();
   
   const source = {
     url: 'rtmp://source.example.com/live/stream',
     protocol: 'rtmp'
   };
   
   const output = {
     url: '/tmp/streams/output',
     format: 'hls',
     path: '/tmp/streams'
   };
   
   const streamId = await videoProcessor.startTranscode(
     channelId,
     source,
     output,
     VideoProcessor.getStandardProfiles()['hd_h264']
   );
   ```

### Monitoring Streams

- **Real-time Process List**: View all active FFmpeg processes
- **Resource Usage**: Monitor CPU, memory, and bandwidth usage
- **Live Logs**: Real-time FFmpeg output and error logs
- **Process Control**: Start, stop, and restart streams

### Stream Analysis

The system can analyze input streams before transcoding:

```typescript
const streamInfo = await videoProcessor.probeStream({
  url: 'rtmp://input.example.com/live/stream',
  protocol: 'rtmp'
});

console.log('Stream format:', streamInfo.format);
console.log('Video streams:', streamInfo.streams.filter(s => s.codec_type === 'video'));
console.log('Audio streams:', streamInfo.streams.filter(s => s.codec_type === 'audio'));
```

## Security Features

### Credential Management
- All SSH credentials are encrypted using AES-GCM
- Master encryption key stored securely in environment variables
- Credentials never stored in plain text
- Access logging for all credential operations

### Command Whitelisting
- Only pre-approved commands can be executed
- FFmpeg commands validated against secure patterns
- Process isolation and monitoring
- Automatic cleanup of orphaned processes

### Audit Logging
- All video processing operations logged
- Server access attempts tracked
- Process lifecycle events recorded
- Security violations flagged

## Troubleshooting

### Common Issues

#### FFmpeg Not Detected
```
Error: FFmpeg not found in PATH
Solution: Install FFmpeg 7.1 and ensure it's accessible via command line
```

#### Permission Denied
```
Error: Permission denied writing to output directory
Solution: Check directory permissions and ownership
```

#### Stream Start Failed
```
Error: Failed to start FFmpeg process
Solution: Check source stream availability and credentials
```

#### High CPU Usage
```
Issue: FFmpeg consuming excessive CPU
Solution: Adjust encoding preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
```

### Debug Commands

```bash
# Check FFmpeg installation
ffmpeg -version

# Test stream connectivity
ffprobe -v quiet -print_format json -show_format "rtmp://source.example.com/live/stream"

# Monitor active processes
ps aux | grep ffmpeg

# Check log files
tail -f /tmp/ffmpeg_*.log
```

### Log Analysis

FFmpeg logs provide detailed information about:
- Input stream analysis
- Encoding progress and statistics
- Error messages and warnings
- Performance metrics

Monitor logs through the admin interface or directly via command line.

## Performance Optimization

### Encoding Presets
- **ultrafast**: Lowest CPU usage, highest file size
- **superfast**: Very low CPU usage, good for high-volume streams
- **veryfast**: Balanced performance for most applications
- **faster**: Good quality/performance balance
- **fast**: Higher quality, moderate CPU usage
- **medium**: Default preset, good balance
- **slow**: Higher quality, increased CPU usage
- **slower**: Very high quality, high CPU usage
- **veryslow**: Maximum quality, maximum CPU usage

### Hardware Acceleration
Configure hardware acceleration for improved performance:

```bash
# Check available encoders
ffmpeg -encoders | grep -i hardware

# NVIDIA GPU acceleration
ffmpeg -hwaccel cuda -c:v h264_nvenc

# Intel Quick Sync
ffmpeg -hwaccel qsv -c:v h264_qsv

# AMD VCE
ffmpeg -hwaccel vaapi -c:v h264_vaapi
```

### Scaling Considerations
- Use multiple servers for high concurrent stream counts
- Implement load balancing across streaming servers
- Monitor resource usage and scale horizontally
- Consider CDN integration for global distribution

## API Reference

### VideoProcessor Methods

#### `getInstance(): VideoProcessor`
Returns the singleton VideoProcessor instance.

#### `getFFmpegVersion(): Promise<FFmpegInfo>`
Retrieves FFmpeg version and build information.

#### `probeStream(source: StreamSource): Promise<any>`
Analyzes input stream properties and metadata.

#### `startTranscode(channelId: string, source: StreamSource, output: StreamOutput, profile: TranscodeProfile): Promise<string>`
Starts a new transcoding process and returns the stream ID.

#### `stopTranscode(streamId: string): Promise<void>`
Stops an active transcoding process.

#### `getRunningStreams(): Promise<FFmpegProcess[]>`
Returns list of all active FFmpeg processes.

#### `getStreamLogs(streamId: string): Promise<string>`
Retrieves logs for a specific stream.

## Support

For technical support and advanced configuration:

1. Check the admin panel logs
2. Review FFmpeg documentation
3. Monitor system resources
4. Contact Dragon Shield IPTV support team

## License

This FFmpeg integration is part of the Dragon Shield IPTV system and is subject to the same licensing terms.
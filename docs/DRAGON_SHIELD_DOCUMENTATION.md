# Dragon Shield IPTV Platform Documentation

Welcome to Dragon Shield IPTV - a comprehensive streaming platform built with modern web technologies.

## 🚀 Quick Start

Dragon Shield IPTV is a full-featured IPTV streaming platform that supports multiple protocols, user management, and advanced video processing capabilities.

### Technologies Used
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Streaming**: HLS.js, dash.js, WebRTC, FFmpeg
- **Authentication**: Supabase Auth with RLS policies
- **Deployment**: Docker, nginx

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [User Management](#user-management)
3. [Streaming Capabilities](#streaming-capabilities)
4. [Admin Panel](#admin-panel)
5. [API Reference](#api-reference)
6. [Deployment Guide](#deployment-guide)
7. [Troubleshooting](#troubleshooting)

## 🏗️ System Architecture

### Core Components

**Frontend Application**
```
src/
├── components/
│   ├── admin/           # Admin panel components
│   ├── player/          # Video players and streaming
│   └── ui/              # shadcn/ui components
├── pages/               # Route components
├── utils/               # Utilities (StreamingEngine, VideoProcessor)
└── integrations/        # Supabase client configuration
```

**Backend Services**
```
supabase/
├── functions/           # Edge functions for API endpoints
│   ├── playlist-generator/
│   ├── stream-control/
│   ├── xtream-api/
│   └── player-api/
└── migrations/          # Database schema migrations
```

### Database Schema

**Core Tables**:
- `profiles` - User profiles and authentication
- `channels` - Streaming channels and sources
- `packages` - Subscription packages
- `subscriptions` - User subscriptions
- `streaming_servers` - Server infrastructure
- `sessions` - User streaming sessions
- `resellers` - Reseller management

## 👥 User Management

### User Roles Hierarchy

1. **Admin** - Full system access
   - Manage all users, channels, servers
   - Access to admin panel and analytics
   - Can create and manage resellers

2. **Reseller** - Limited administrative access
   - Create and manage client accounts
   - Access to assigned packages
   - Credit-based billing system

3. **Client** - End users
   - Stream content based on subscription
   - Download M3U playlists
   - Limited to concurrent connection limits

### Authentication Flow

```typescript
// Authentication is handled via Supabase Auth
import { supabase } from "@/integrations/supabase/client";

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Role-based access control via RLS policies
const userRole = await supabase.rpc('get_user_role', { user_uuid: userId });
```

## 📺 Streaming Capabilities

### Supported Protocols

Dragon Shield supports multiple streaming protocols through the `StreamingEngine`:

- **HLS** (.m3u8) - HTTP Live Streaming
- **DASH** (.mpd) - Dynamic Adaptive Streaming
- **WebRTC** - Real-time communication
- **RTMP** - Real-Time Messaging Protocol
- **MPEG-TS** (.ts) - Transport Stream
- **M3U** - Playlist format

### Player Features

**Single Stream Player** (`WebPlayer`)
- Protocol auto-detection
- Adaptive bitrate streaming
- Fullscreen support
- Volume and playback controls
- Error recovery and fallbacks

**Multi-Stream Player** (`MultiStreamPlayer`)
- Grid layouts: 1x1, 2x2, 3x3
- Picture-in-Picture mode
- Audio synchronization
- Individual stream controls

### Stream Processing

**Video Transcoding** (FFmpeg Integration)
```typescript
// Start transcoding stream
const streamId = await videoProcessor.startTranscode({
  source: { url: 'rtmp://source.com/stream', protocol: 'rtmp' },
  output: { format: 'hls', path: '/streams/output' },
  profile: 'hd_h264'
});
```

**Available Profiles**:
- `hd_h264` - 1080p H.264 encoding
- `sd_h264` - 720p H.264 encoding  
- `low_latency` - Optimized for low latency

## 🛠️ Admin Panel

### Channel Management
- Add/edit streaming channels
- Configure upstream sources
- Set channel categories and logos
- Manage EPG (Electronic Program Guide)

### User Management
- Create/edit user accounts
- Set subscription packages
- Manage connection limits
- Download M3U playlists per user
- Monitor user activity and sessions

### Package Management
- Create subscription packages
- Set concurrent stream limits
- Configure pricing and duration
- Manage package features

### Server Management
- Add streaming servers
- Monitor server load and status
- Configure SSH access and credentials
- Load balancing across servers

### Analytics & Monitoring
- Real-time streaming statistics
- User connection monitoring
- Bandwidth usage tracking
- Server performance metrics

## 🔌 API Reference

### Edge Functions

**Playlist Generator** (`/functions/v1/playlist-generator`)
```http
GET /functions/v1/playlist-generator?username=user&password=pass
Content-Type: audio/x-mpegurl

# Generated M3U8 playlist with user's available channels
```

**Stream Control** (`/functions/v1/stream-control`)
```http
GET /functions/v1/stream-control/live/{channel_id}.m3u8
Authorization: Bearer {token}

# Returns HLS stream for specific channel
```

**Xtream Codes API** (`/functions/v1/xtream-api`)
```http
GET /functions/v1/xtream-api/player_api.php?username=user&password=pass&action=get_live_streams

# Compatible with Xtream Codes API format
```

### Database Functions

**User Statistics**
```sql
SELECT * FROM get_user_statistics('user-uuid');
-- Returns: total_connections, active_connections, total_bandwidth, last_activity
```

**Admin Dashboard Stats**
```sql
SELECT * FROM get_admin_dashboard_stats();
-- Returns: total_users, active_users, active_channels, active_streams
```

## 🚀 Deployment Guide

### Docker Deployment

1. **Build the application**
```bash
docker build -t dragon-shield .
```

2. **Run with docker-compose**
```bash
docker-compose up -d
```

3. **Configure environment variables**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Ubuntu Server Deployment

Use the provided deployment scripts:

```bash
# Initial server setup
./scripts/ubuntu-install.sh

# Deploy application
./scripts/deploy.sh

# Setup services
./scripts/setup.sh
```

### nginx Configuration

The platform includes nginx configuration for:
- Static file serving
- Reverse proxy for API endpoints
- SSL termination
- Load balancing

## 🔍 Troubleshooting

### Common Issues

**Stream Not Loading**
1. Check if channel is active in admin panel
2. Verify upstream source URL is accessible
3. Test stream with StreamTester component
4. Check browser console for errors

**User Can't Access Stream**
1. Verify user has active subscription
2. Check concurrent connection limits
3. Ensure API password is generated
4. Verify package includes requested channels

**Admin Panel Access Denied**
1. Confirm user has admin role in profiles table
2. Check RLS policies are properly configured
3. Verify Supabase authentication

**FFmpeg Processing Errors**
1. Check FFmpeg is installed and accessible
2. Verify server has sufficient resources
3. Check streaming server credentials
4. Review process logs in admin panel

### Debug Tools

**Console Logging**
```typescript
// Enable debug mode in StreamingEngine
const engine = StreamingEngine.getInstance();
console.log('Capabilities:', engine.getCapabilities());
```

**Stream Testing**
Use the built-in StreamTester component to:
- Test stream URLs
- Check protocol detection
- Verify browser capabilities
- Test sample streams

**Database Queries**
```sql
-- Check user sessions
SELECT * FROM sessions WHERE user_id = 'user-uuid' ORDER BY created_at DESC;

-- Monitor active streams
SELECT * FROM streams WHERE state IN ('starting', 'running');

-- Check server status
SELECT * FROM streaming_servers WHERE active = true;
```

### Performance Optimization

**Client-Side**
- Enable hardware acceleration in player settings
- Use appropriate buffer sizes for live vs VOD
- Implement lazy loading for channel lists

**Server-Side**
- Distribute load across multiple streaming servers
- Use CDN for static assets and popular streams
- Monitor and scale based on concurrent users

## 📖 Additional Resources

- [FFmpeg Integration Guide](./FFMPEG_INTEGRATION.md)
- [Ubuntu Deployment Guide](./UBUNTU_DEPLOYMENT.md)
- [API Documentation](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)

## 🤝 Support

For technical support and questions:
1. Check this documentation first
2. Review console logs and error messages
3. Test with provided debugging tools
4. Contact system administrator

---

**Dragon Shield IPTV Platform** - Built with React, Supabase, and modern streaming technologies.
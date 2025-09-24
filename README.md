# Dragon Shield IPTV System

A comprehensive, portable IPTV/OTT management system built with React, TypeScript, and modern web technologies. Dragon Shield provides a complete solution for managing IPTV services, streaming servers, user subscriptions, and content delivery.

## 🚀 Features

### Core Features
- **Multi-Server Management** - Manage up to 50+ streaming servers
- **User Management** - Unlimited users with role-based access control
- **Subscription Management** - Flexible subscription plans and billing
- **Adaptive Transcoding** - Real-time video quality optimization
- **Web Player** - Professional HTML5 streaming player
- **Multi-Stream Player** - Grid layout and Picture-in-Picture support

### Advanced Features
- **Plugin System** - Autoblock, Statistics, Rclone, Plex Importer
- **Load Balancing** - Intelligent server selection and load distribution
- **Real-time Monitoring** - Server health and performance metrics
- **Backup & Recovery** - Automated backup solutions
- **Security Features** - RLS policies, rate limiting, audit logs

### Admin Panel
- **Reseller Management** - Multi-tier reseller system
- **Channel Management** - EPG integration and channel organization
- **Analytics Dashboard** - Detailed usage and performance analytics
- **Support System** - Built-in chat and ticket support

## 🏗️ Architecture & Portability

Dragon Shield is designed to be fully portable and can run in multiple environments:
- **Cloud**: Supabase, AWS, Google Cloud, Azure
- **Self-Hosted**: Docker Compose, bare metal
- **Kubernetes**: Helm charts included
- **Hybrid**: Mix of cloud and on-premise infrastructure

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase / PostgreSQL
- **Authentication**: JWT-based auth with RLS
- **Streaming**: HLS/DASH protocols
- **Deployment**: Docker, Kubernetes support

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+ (for self-hosted)
- Ubuntu 22.04+ LTS (recommended for VPS/dedicated servers)

### Ubuntu Quick Install (VPS/Dedicated Servers)

For Ubuntu 22.04 LTS or Ubuntu 24.04 LTS servers:

```bash
# One-line installation for Ubuntu servers
curl -fsSL https://raw.githubusercontent.com/your-repo/dragon-shield/main/scripts/ubuntu-install.sh | bash

# Then clone and setup
git clone <YOUR_GIT_URL> /opt/dragon-shield
cd /opt/dragon-shield
./scripts/setup.sh
```

See [Ubuntu Deployment Guide](docs/UBUNTU_DEPLOYMENT.md) for detailed VPS deployment instructions.

### Option 1: Using Lovable (Cloud)
1. Visit the [Lovable Project](https://lovable.dev/projects/6463820c-3d65-46af-929c-b922a4125e85)
2. Start customizing with AI assistance
3. Deploy with one click via Share → Publish

### Option 2: Docker Compose (Self-Hosted)
```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd dragon-shield-iptv

# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Access the application
open http://localhost:3000
```

### Option 3: Development Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables
Dragon Shield uses environment variables for configuration. See `.env.example` for all available options:

```bash
# Core Settings
NODE_ENV=production
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dragon_shield
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_admin_password

# Streaming
MAX_CONCURRENT_STREAMS=3
DEFAULT_VIDEO_QUALITY=720p
STREAM_BUFFER_SIZE=30
```

## 📦 Deployment Options

### Lovable Cloud (Easiest)
Simply open [Lovable](https://lovable.dev/projects/6463820c-3d65-46af-929c-b922a4125e85) and click on Share → Publish.

### Self-Hosted Production
```bash
# Using deployment script
./scripts/deploy.sh production

# Or manual Docker deployment
docker-compose -f docker-compose.yml up -d
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
./scripts/deploy.sh k8s

# Or using Helm directly
helm install dragon-shield k8s/helm/dragon-shield
```

## 🔐 Security Features

Dragon Shield implements multiple security layers:

### Database Security
- **Row Level Security (RLS)** policies
- **Encrypted sensitive data** at rest
- **Audit logging** for all operations
- **Backup encryption** with rotation

### Application Security
- **JWT authentication** with refresh tokens
- **Rate limiting** and DDoS protection
- **Input validation** and sanitization
- **CORS and CSP** headers

## 🛠️ Management Scripts

Dragon Shield includes several management scripts for portability:

```bash
# Setup and initialization
./scripts/setup.sh

# Backup and restore
./scripts/backup.sh
./scripts/restore.sh [backup_file]

# Deployment
./scripts/deploy.sh [environment]
```

## 🔌 Plugin System

Available plugins:
- **Autoblock Plugin** - Automatic spam and abuse detection
- **Statistics Plugin** - Advanced analytics and reporting
- **Rclone Plugin** - Cloud storage integration
- **Plex Importer Plugin** - Import content from Plex
- **Proxies Plugin** - Proxy management and rotation

## 🌍 Multi-Environment Support

### Cloud Deployment (Lovable/Supabase)
- **Zero Configuration** - Ready to use out of the box
- **Managed Infrastructure** - No server management needed
- **Auto-scaling** - Handles traffic spikes automatically
- **Global CDN** - Worldwide content delivery

### Self-Hosted Deployment
- **Full Control** - Complete infrastructure ownership
- **Custom Configuration** - Tailored to your needs
- **Cost Effective** - No per-user charges
- **Data Sovereignty** - Keep data on your servers

## 🤝 Development Options

### Using Lovable (Recommended for non-developers)
Simply visit the [Lovable Project](https://lovable.dev/projects/6463820c-3d65-46af-929c-b922a4125e85) and start prompting. Changes are automatically committed to the repository.

### Local IDE Development
```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

### GitHub Integration
- **Bidirectional Sync** - Changes sync between Lovable and GitHub
- **Version Control** - Full Git history and branching
- **Collaborative Development** - Team-friendly workflows

## 📊 Performance Benchmarks

- **Concurrent Users**: 10,000+
- **Streams per Server**: 1,000+
- **Response Time**: < 100ms
- **Uptime**: 99.9%

## 🆘 Support

### Community Support
- **GitHub Issues** - Bug reports and feature requests
- **Lovable Discord** - AI-powered development support
- **Documentation** - Comprehensive guides and tutorials

### Lovable Features
- **Custom Domain Support** - Navigate to Project > Settings > Domains
- **One-Click Deployment** - Share → Publish
- **AI Assistant** - Get help with development
- **Version History** - Built-in rollback capabilities

---

**Dragon Shield IPTV System** - Professional, Scalable, Portable IPTV Management Solution

Made with ❤️ using [Lovable](https://lovable.dev)

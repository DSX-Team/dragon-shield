# Ubuntu Deployment Guide

This guide covers deploying Dragon Shield IPTV System on Ubuntu 22.04 LTS and Ubuntu 24.04 LTS servers (VPS or Dedicated).

## Quick Installation

For a fresh Ubuntu server, use the automated installation script:

```bash
# Download and run the Ubuntu installation script
curl -fsSL https://raw.githubusercontent.com/your-repo/dragon-shield/main/scripts/ubuntu-install.sh | bash

# Or clone the repository first
git clone https://github.com/your-repo/dragon-shield.git /opt/dragon-shield
cd /opt/dragon-shield
chmod +x scripts/ubuntu-install.sh
./scripts/ubuntu-install.sh
```

## Manual Installation Steps

### 1. System Requirements

**Minimum Requirements:**
- Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- 2GB RAM (4GB+ recommended)
- 10GB free disk space (50GB+ recommended)
- 1 CPU core (2+ cores recommended)

**Recommended VPS Specifications:**
- 4GB RAM
- 2 CPU cores
- 50GB SSD storage
- 100 Mbps network

### 2. System Preparation

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install essential packages
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    git \
    wget \
    unzip \
    openssl \
    ufw \
    htop

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 3. Docker Installation

```bash
# Remove old Docker versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Add Docker repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 4. System Optimization

#### Docker Configuration
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "10"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

sudo systemctl restart docker
```

#### Network Optimization
```bash
sudo tee /etc/sysctl.d/99-dragon-shield.conf > /dev/null << 'EOF'
# Network optimization for streaming
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 300000
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_congestion_control = bbr
EOF

sudo sysctl -p /etc/sysctl.d/99-dragon-shield.conf
```

#### System Limits
```bash
sudo tee -a /etc/security/limits.conf > /dev/null << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF
```

### 5. Application Deployment

```bash
# Create application directory
sudo mkdir -p /opt/dragon-shield
sudo chown $USER:$USER /opt/dragon-shield
cd /opt/dragon-shield

# Clone the repository
git clone https://github.com/your-repo/dragon-shield.git .

# Make scripts executable
chmod +x scripts/*.sh

# Run the setup script
./scripts/setup.sh
```

## Production Configuration

### SSL/TLS Setup

For production deployments, configure SSL certificates:

```bash
# Option 1: Let's Encrypt (recommended)
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*.pem

# Option 2: Self-signed (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Environment Configuration

Update your `.env` file with production settings:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your production values
nano .env
```

Key production settings:
- Set strong passwords
- Configure proper domain names
- Set production database credentials
- Configure SMTP settings
- Set proper CORS origins

### Monitoring Setup

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Set up log rotation
sudo tee /etc/logrotate.d/dragon-shield > /dev/null << 'EOF'
/opt/dragon-shield/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
```

## Maintenance

### Regular Updates

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Update Docker images
cd /opt/dragon-shield
docker-compose pull
docker-compose up -d --build

# Clean up old images
docker system prune -f
```

### Backup

```bash
# Run backup script
./scripts/backup.sh

# Schedule automated backups (crontab)
crontab -e
# Add: 0 2 * * * /opt/dragon-shield/scripts/backup.sh
```

### Monitoring

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resources
htop
docker stats
```

## Troubleshooting

### Common Issues

1. **Docker permission denied**
   ```bash
   # Log out and back in, or run:
   newgrp docker
   ```

2. **Port conflicts**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :3000
   sudo lsof -i :3000
   ```

3. **Memory issues**
   ```bash
   # Check memory usage
   free -h
   docker stats --no-stream
   ```

4. **Firewall blocking connections**
   ```bash
   # Check firewall status
   sudo ufw status verbose
   
   # Allow specific ports
   sudo ufw allow 3000/tcp
   ```

### Performance Optimization

1. **Enable BBR congestion control** (already configured in optimization steps)
2. **Increase file descriptor limits** (already configured)
3. **Configure swap** (if needed):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## Security Hardening

### SSH Security
```bash
# Disable password authentication (use SSH keys)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### Automatic Security Updates
```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Fail2Ban Setup
```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Support

For deployment issues specific to Ubuntu:
1. Check the logs: `docker-compose logs`
2. Verify system requirements
3. Ensure all ports are accessible
4. Check firewall configuration
5. Verify Docker is running: `sudo systemctl status docker`

For additional help, refer to the main [README.md](../README.md) or create an issue in the repository.
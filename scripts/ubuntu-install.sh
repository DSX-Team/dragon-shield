#!/bin/bash

# Dragon Shield IPTV System - Ubuntu Quick Install Script
# Optimized for Ubuntu 22.04 LTS and Ubuntu 24.04 LTS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check if running on Ubuntu
check_ubuntu() {
    if [ ! -f /etc/os-release ]; then
        error "Cannot detect OS version"
    fi
    
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        error "This script is designed for Ubuntu systems only. Detected: $PRETTY_NAME"
    fi
    
    UBUNTU_VERSION=$(echo $VERSION_ID | cut -d. -f1)
    if [[ "$UBUNTU_VERSION" != "22" && "$UBUNTU_VERSION" != "24" ]]; then
        warn "This script is optimized for Ubuntu 22.04 and 24.04. Detected: $VERSION_ID"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log "Ubuntu $VERSION_ID detected - proceeding with installation"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package lists
    sudo apt-get update
    
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
        htop \
        nano \
        logrotate
    
    log "System dependencies installed!"
}

# Install Docker and Docker Compose
install_docker() {
    log "Installing Docker..."
    
    # Remove old Docker versions
    sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    # Start Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log "Docker installed and started!"
}

# Configure system for production
configure_system() {
    log "Configuring system for production use..."
    
    # Configure Docker daemon
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
    
    # Configure firewall
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
    
    # Configure system limits
    sudo tee -a /etc/security/limits.conf > /dev/null << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF
    
    # Configure sysctl for better network performance
    sudo tee /etc/sysctl.d/99-dragon-shield.conf > /dev/null << 'EOF'
# Network optimization
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 300000
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_congestion_control = bbr
EOF
    
    sudo sysctl -p /etc/sysctl.d/99-dragon-shield.conf
    
    log "System configuration completed!"
}

# Create application directories
create_app_structure() {
    log "Creating application directory structure..."
    
    # Create main app directory
    sudo mkdir -p /opt/dragon-shield
    sudo chown $USER:$USER /opt/dragon-shield
    cd /opt/dragon-shield
    
    # Create subdirectories
    mkdir -p {logs,data,backups,config,ssl}
    
    log "Application structure created in /opt/dragon-shield"
}

# Display final instructions
show_completion_message() {
    echo
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Ubuntu Installation Complete!${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "1. Log out and back in (or run 'newgrp docker')"
    echo -e "2. Clone Dragon Shield repository to /opt/dragon-shield"
    echo -e "3. Run the setup script: ./scripts/setup.sh"
    echo
    echo -e "${GREEN}Application directory:${NC} /opt/dragon-shield"
    echo -e "${GREEN}Docker status:${NC} $(sudo systemctl is-active docker)"
    echo -e "${GREEN}Firewall status:${NC} $(sudo ufw status | head -1)"
    echo
    echo -e "${YELLOW}Important:${NC}"
    echo -e "- System has been optimized for production use"
    echo -e "- Firewall is enabled with basic rules"
    echo -e "- Docker logging is configured"
    echo -e "- System limits have been increased"
    echo
}

# Main installation function
main() {
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════╗
║      Dragon Shield IPTV - Ubuntu Install      ║
║            Ubuntu 22.04 & 24.04 LTS          ║
╚═══════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    check_ubuntu
    install_dependencies
    install_docker
    configure_system
    create_app_structure
    show_completion_message
    
    log "Ubuntu installation completed successfully!"
}

# Run main function
main "$@"
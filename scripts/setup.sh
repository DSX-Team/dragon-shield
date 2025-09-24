#!/bin/bash

# Dragon Shield IPTV System - Setup Script
# This script helps set up the Dragon Shield system on any Unix-based system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        warn "Running as root. This is not recommended for production."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check for Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check for Node.js (for development)
    if ! command -v node &> /dev/null; then
        warn "Node.js is not installed. This is only required for development."
    fi
    
    log "System requirements check passed!"
}

# Create directory structure
create_directories() {
    log "Creating directory structure..."
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p backups
    mkdir -p database/init
    mkdir -p database/migrations
    mkdir -p nginx/ssl
    
    log "Directory structure created!"
}

# Generate secure passwords
generate_passwords() {
    log "Generating secure passwords..."
    
    # Generate random passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    
    log "Secure passwords generated!"
}

# Setup environment file
setup_environment() {
    log "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log "Copied .env.example to .env"
        else
            error ".env.example file not found!"
        fi
    else
        warn ".env file already exists. Backing up to .env.backup"
        cp .env .env.backup
    fi
    
    # Update passwords in .env file
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env
    sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASSWORD}/" .env
    
    log "Environment configuration updated!"
}

# Initialize database
init_database() {
    log "Initializing database..."
    
    # Start PostgreSQL container
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to be ready
    log "Waiting for PostgreSQL to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            break
        fi
        sleep 2
        ((timeout-=2))
    done
    
    if [ $timeout -le 0 ]; then
        error "PostgreSQL failed to start within 60 seconds"
    fi
    
    log "Database initialized successfully!"
}

# Setup SSL certificates (self-signed for development)
setup_ssl() {
    read -p "Setup SSL certificates for HTTPS? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Setting up SSL certificates..."
        
        if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout nginx/ssl/key.pem \
                -out nginx/ssl/cert.pem \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
            
            log "Self-signed SSL certificates generated!"
            warn "These are self-signed certificates for development only."
        else
            log "SSL certificates already exist!"
        fi
    fi
}

# Start services
start_services() {
    log "Starting Dragon Shield services..."
    
    # Build and start all services
    docker-compose up -d --build
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    if docker-compose ps | grep -q "Up"; then
        log "Services started successfully!"
    else
        error "Some services failed to start. Check logs with: docker-compose logs"
    fi
}

# Display final information
display_info() {
    echo
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Dragon Shield Setup Complete!${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo
    echo -e "${GREEN}Frontend URL:${NC} http://localhost:3000"
    echo -e "${GREEN}Admin Email:${NC} admin@dragonshield.local"
    echo -e "${GREEN}Admin Password:${NC} ${ADMIN_PASSWORD}"
    echo
    echo -e "${YELLOW}Important:${NC}"
    echo -e "1. Change the admin password after first login"
    echo -e "2. Update .env file with your production settings"
    echo -e "3. Setup proper SSL certificates for production"
    echo -e "4. Configure your firewall and security settings"
    echo
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "Start services: docker-compose up -d"
    echo -e "Stop services: docker-compose down"
    echo -e "View logs: docker-compose logs -f"
    echo -e "Database backup: ./scripts/backup.sh"
    echo
}

# Main setup function
main() {
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════╗
║           Dragon Shield IPTV System           ║
║                Setup Script                   ║
╚═══════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    check_root
    check_requirements
    create_directories
    generate_passwords
    setup_environment
    setup_ssl
    init_database
    start_services
    display_info
    
    log "Setup completed successfully!"
}

# Run main function
main "$@"
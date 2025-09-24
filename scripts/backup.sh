#!/bin/bash

# Dragon Shield IPTV System - Backup Script
# This script creates backups of the database and important files

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="${BACKUP_DIR}/db_backup_${DATE}.sql"
FILES_BACKUP_FILE="${BACKUP_DIR}/files_backup_${DATE}.tar.gz"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Load environment variables
if [ -f .env ]; then
    source .env
else
    error ".env file not found!"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
backup_database() {
    log "Starting database backup..."
    
    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec -T postgres pg_dump -U "${DB_USER:-postgres}" "${DB_NAME:-dragon_shield}" > "$DB_BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            log "Database backup created: $DB_BACKUP_FILE"
        else
            error "Database backup failed!"
        fi
    else
        error "PostgreSQL container is not running!"
    fi
}

# Files backup
backup_files() {
    log "Starting files backup..."
    
    # Files to backup
    FILES_TO_BACKUP=(
        ".env"
        "uploads/"
        "logs/"
        "nginx/"
        "database/init/"
    )
    
    # Create tar archive
    tar -czf "$FILES_BACKUP_FILE" "${FILES_TO_BACKUP[@]}" 2>/dev/null || true
    
    if [ -f "$FILES_BACKUP_FILE" ]; then
        log "Files backup created: $FILES_BACKUP_FILE"
    else
        warn "Files backup may have issues, but continuing..."
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    local retention_days=${BACKUP_RETENTION_DAYS:-7}
    
    log "Cleaning up backups older than $retention_days days..."
    
    find "$BACKUP_DIR" -name "*.sql" -type f -mtime +$retention_days -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$retention_days -delete 2>/dev/null || true
    
    log "Old backups cleaned up!"
}

# Compress and verify backup
compress_backup() {
    log "Compressing database backup..."
    
    if [ -f "$DB_BACKUP_FILE" ]; then
        gzip "$DB_BACKUP_FILE"
        log "Database backup compressed: ${DB_BACKUP_FILE}.gz"
    fi
}

# Main backup function
main() {
    log "Starting Dragon Shield backup process..."
    
    backup_database
    backup_files
    compress_backup
    cleanup_old_backups
    
    log "Backup process completed successfully!"
    
    # Display backup info
    echo
    echo "Backup Summary:"
    echo "==============="
    echo "Database: ${DB_BACKUP_FILE}.gz"
    echo "Files: $FILES_BACKUP_FILE"
    echo "Location: $BACKUP_DIR"
    echo
}

# Run backup
main "$@"
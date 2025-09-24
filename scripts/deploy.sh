#!/bin/bash

# Dragon Shield IPTV System - Deployment Script
# This script handles deployment to various environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEFAULT_ENV="production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; exit 1; }

# Help function
show_help() {
    cat << EOF
Dragon Shield IPTV System - Deployment Script

Usage: $0 [OPTIONS] [ENVIRONMENT]

ENVIRONMENTS:
    local       Deploy locally using Docker Compose
    staging     Deploy to staging server
    production  Deploy to production server
    k8s         Deploy to Kubernetes cluster

OPTIONS:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output
    -b, --backup        Create backup before deployment
    -f, --force         Force deployment without prompts
    --no-build          Skip building step
    --no-migrate        Skip database migrations
    --rollback VERSION  Rollback to specific version

EXAMPLES:
    $0 local                    # Deploy locally
    $0 production --backup      # Deploy to production with backup
    $0 k8s --no-migrate         # Deploy to k8s without migrations
    $0 --rollback v1.2.0        # Rollback to version 1.2.0

EOF
}

# Parse command line arguments
parse_args() {
    ENVIRONMENT="${DEFAULT_ENV}"
    BACKUP=false
    FORCE=false
    BUILD=true
    MIGRATE=true
    VERBOSE=false
    ROLLBACK=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -b|--backup)
                BACKUP=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            --no-build)
                BUILD=false
                shift
                ;;
            --no-migrate)
                MIGRATE=false
                shift
                ;;
            --rollback)
                ROLLBACK="$2"
                shift 2
                ;;
            local|staging|production|k8s)
                ENVIRONMENT="$1"
                shift
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites for $ENVIRONMENT..."
    
    case "$ENVIRONMENT" in
        local)
            command -v docker >/dev/null 2>&1 || error "Docker is required for local deployment"
            command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || error "Docker Compose is required"
            ;;
        staging|production)
            command -v ssh >/dev/null 2>&1 || error "SSH is required for remote deployment"
            command -v rsync >/dev/null 2>&1 || error "rsync is required for remote deployment"
            ;;
        k8s)
            command -v kubectl >/dev/null 2>&1 || error "kubectl is required for Kubernetes deployment"
            command -v helm >/dev/null 2>&1 || error "Helm is required for Kubernetes deployment"
            ;;
    esac
    
    log "Prerequisites check passed!"
}

# Create backup
create_backup() {
    if [[ "$BACKUP" == true ]]; then
        log "Creating backup before deployment..."
        
        case "$ENVIRONMENT" in
            local)
                ./scripts/backup.sh
                ;;
            staging|production)
                # Remote backup
                ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH && ./scripts/backup.sh"
                ;;
            k8s)
                # Kubernetes backup
                kubectl exec -n dragon-shield deployment/postgres -- pg_dump -U postgres dragon_shield > "backup_$(date +%Y%m%d_%H%M%S).sql"
                ;;
        esac
        
        log "Backup completed!"
    fi
}

# Build application
build_application() {
    if [[ "$BUILD" == true ]]; then
        log "Building Dragon Shield application..."
        
        cd "$PROJECT_ROOT"
        
        # Install dependencies
        npm ci --production
        
        # Build frontend
        npm run build
        
        # Build Docker images for containerized deployments
        if [[ "$ENVIRONMENT" == "local" || "$ENVIRONMENT" == "k8s" ]]; then
            docker build -t dragon-shield:latest .
        fi
        
        log "Build completed!"
    fi
}

# Deploy to local environment
deploy_local() {
    log "Deploying to local environment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing containers
    docker-compose down || true
    
    # Start services
    docker-compose up -d --build
    
    # Wait for services
    sleep 10
    
    # Run migrations
    if [[ "$MIGRATE" == true ]]; then
        run_migrations_local
    fi
    
    # Health check
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        log "Local deployment successful! Visit http://localhost:3000"
    else
        error "Local deployment health check failed!"
    fi
}

# Deploy to remote environment (staging/production)
deploy_remote() {
    local env="$1"
    log "Deploying to $env environment..."
    
    # Load environment-specific configuration
    if [[ -f "config/${env}.env" ]]; then
        source "config/${env}.env"
    else
        error "Configuration file config/${env}.env not found!"
    fi
    
    # Sync files to remote server
    log "Syncing files to remote server..."
    rsync -avz --delete \
        --exclude node_modules \
        --exclude .git \
        --exclude dist \
        --exclude logs \
        --exclude backups \
        "$PROJECT_ROOT/" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
    
    # Execute remote deployment commands
    ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        cd $DEPLOY_PATH
        
        # Install dependencies
        npm ci --production
        
        # Build application
        npm run build
        
        # Stop services
        docker-compose down || true
        
        # Start services
        docker-compose up -d --build
        
        # Run migrations
        if [[ "$MIGRATE" == true ]]; then
            docker-compose exec -T postgres psql -U postgres -d dragon_shield -f /migrations/latest.sql
        fi
        
        # Health check
        sleep 10
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            echo "Remote deployment successful!"
        else
            echo "Remote deployment health check failed!"
            exit 1
        fi
EOF
    
    log "$env deployment completed!"
}

# Deploy to Kubernetes
deploy_k8s() {
    log "Deploying to Kubernetes..."
    
    cd "$PROJECT_ROOT"
    
    # Check if Helm chart exists
    if [[ ! -d "k8s/helm" ]]; then
        error "Kubernetes Helm charts not found in k8s/helm directory!"
    fi
    
    # Update Helm dependencies
    helm dependency update k8s/helm/dragon-shield
    
    # Deploy or upgrade
    if helm status dragon-shield >/dev/null 2>&1; then
        helm upgrade dragon-shield k8s/helm/dragon-shield \
            --namespace dragon-shield \
            --timeout 600s
    else
        helm install dragon-shield k8s/helm/dragon-shield \
            --namespace dragon-shield \
            --create-namespace \
            --timeout 600s
    fi
    
    # Wait for rollout
    kubectl rollout status deployment/frontend -n dragon-shield --timeout=300s
    
    # Get service URL
    SERVICE_URL=$(kubectl get svc frontend -n dragon-shield -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    
    log "Kubernetes deployment completed!"
    log "Service URL: $SERVICE_URL (may take a few minutes to be available)"
}

# Run database migrations
run_migrations_local() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            break
        fi
        sleep 2
        ((timeout-=2))
    done
    
    # Run migrations
    if [[ -d "database/migrations" ]]; then
        for migration in database/migrations/*.sql; do
            if [[ -f "$migration" ]]; then
                log "Running migration: $(basename "$migration")"
                docker-compose exec -T postgres psql -U postgres -d dragon_shield -f "/migrations/$(basename "$migration")"
            fi
        done
    fi
    
    log "Database migrations completed!"
}

# Rollback deployment
rollback_deployment() {
    local version="$1"
    log "Rolling back to version $version..."
    
    case "$ENVIRONMENT" in
        local)
            git checkout "$version"
            deploy_local
            ;;
        staging|production)
            # Remote rollback
            ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
                cd $DEPLOY_PATH
                git checkout $version
                docker-compose down
                docker-compose up -d --build
EOF
            ;;
        k8s)
            helm rollback dragon-shield --namespace dragon-shield
            ;;
    esac
    
    log "Rollback to $version completed!"
}

# Main deployment function
main() {
    parse_args "$@"
    
    # Handle rollback
    if [[ -n "$ROLLBACK" ]]; then
        rollback_deployment "$ROLLBACK"
        return
    fi
    
    # Confirmation prompt
    if [[ "$FORCE" != true ]]; then
        echo -e "${YELLOW}About to deploy Dragon Shield to $ENVIRONMENT environment.${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user."
            exit 0
        fi
    fi
    
    # Execute deployment pipeline
    check_prerequisites
    create_backup
    build_application
    
    case "$ENVIRONMENT" in
        local)
            deploy_local
            ;;
        staging|production)
            deploy_remote "$ENVIRONMENT"
            ;;
        k8s)
            deploy_k8s
            ;;
        *)
            error "Unknown environment: $ENVIRONMENT"
            ;;
    esac
    
    log "Deployment pipeline completed successfully!"
}

# Execute main function
main "$@"
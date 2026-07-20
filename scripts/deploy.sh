#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Deploy Script
# Used by GitHub Actions for SSH deployment
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────

DEPLOY_ENV="${DEPLOY_ENV:-development}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/vestara}"
HEALTH_URL="http://localhost:3000/api/health"
HEALTH_RETRIES=10
HEALTH_DELAY=5

# ── Pre-deploy checks ────────────────────────

pre_deploy() {
    log "Running pre-deploy checks..."

    # Check if running as correct user
    if [ "$(whoami)" = "root" ]; then
        warn "Running as root"
    fi

    # Check if deployment directory exists
    if [ ! -d "$DEPLOY_PATH" ]; then
        error "Deployment directory not found: $DEPLOY_PATH"
    fi

    log "Pre-deploy checks passed"
}

# ── Backup ────────────────────────────────────

backup() {
    log "Creating backup..."

    if [ -f "$DEPLOY_PATH/scripts/backup.sh" ]; then
        cd "$DEPLOY_PATH"
        ./scripts/backup.sh backup
        log "Backup created"
    else
        warn "Backup script not found, skipping backup"
    fi
}

# ── Deploy ────────────────────────────────────

deploy() {
    log "Deploying to $DEPLOY_ENV..."

    cd "$DEPLOY_PATH"

    # Install production dependencies
    log "Installing dependencies..."
    pnpm install --frozen-lockfile --prod

    # Build if needed
    if [ ! -d "packages/types/dist" ]; then
        log "Building..."
        pnpm build
    fi

    # Run migrations
    log "Running migrations..."
    pnpm migrate 2>/dev/null || true

    log "Deployment complete"
}

# ── Restart services ─────────────────────────

restart_services() {
    log "Restarting services..."

    if [ "$DEPLOY_ENV" = "development" ]; then
        # Development: start dev servers
        pnpm dev &
        sleep 5
    else
        # Production: restart systemd services
        sudo systemctl restart vestara-api.service
        sudo systemctl restart nginx
        sleep 5
    fi

    log "Services restarted"
}

# ── Health check ──────────────────────────────

health_check() {
    log "Running health check..."

    local attempt=1
    while [ $attempt -le $HEALTH_RETRIES ]; do
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi

        log "Health check attempt $attempt/$HEALTH_RETRIES failed"
        attempt=$((attempt + 1))
        sleep $HEALTH_DELAY
    done

    error "Health check failed after $HEALTH_RETRIES attempts"
}

# ── Rollback ──────────────────────────────────

rollback() {
    log "Rolling back..."

    if [ -f "$DEPLOY_PATH/scripts/upgrade.sh" ]; then
        cd "$DEPLOY_PATH"
        ./scripts/upgrade.sh rollback
    else
        error "Upgrade script not found"
    fi
}

# ── Main ─────────────────────────────────────

usage() {
    echo "Usage: $0 {deploy|rollback|health-check}"
    exit 1
}

main() {
    local cmd="${1:-}"

    case "$cmd" in
        deploy)
            pre_deploy
            backup
            deploy
            restart_services
            health_check
            ;;
        rollback)
            rollback
            ;;
        health-check)
            health_check
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"

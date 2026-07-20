#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Upgrade Script
# Upgrades Vestara to latest version
# Usage: vestara upgrade
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[VESTARA]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Check for updates ────────────────────────

check_updates() {
    log "Checking for updates..."

    # Update package lists
    sudo apt-get update -qq

    # Check for available upgrades
    local upgradable=$(apt list --upgradable 2>/dev/null | grep vestara | wc -l)

    if [ "$upgradable" -eq 0 ]; then
        log "Vestara is up to date"
        return 1
    fi

    log "Updates available:"
    apt list --upgradable 2>/dev/null | grep vestara
    return 0
}

# ── Backup before upgrade ────────────────────

backup_before_upgrade() {
    log "Creating backup before upgrade..."

    local backup_dir="/home/ai/vestara-backups"
    local backup_name="vestara-pre-upgrade-$(date +%Y%m%d-%H%M%S)"

    mkdir -p "$backup_dir"

    # Backup database
    if [ -f "/home/ai/vestara/data/vestara.db" ]; then
        cp "/home/ai/vestara/data/vestara.db" "$backup_dir/$backup_name.db"
    fi

    # Backup config
    if [ -d "/home/ai/vestara/config" ]; then
        tar -czf "$backup_dir/$backup_name-config.tar.gz" -C /home/ai/vestara config
    fi

    log "Backup created: $backup_dir/$backup_name*"
}

# ── Stop services ────────────────────────────

stop_services() {
    log "Stopping services..."

    sudo systemctl stop vestara-api.service 2>/dev/null || true
    sudo systemctl stop nginx 2>/dev/null || true

    log "Services stopped"
}

# ── Upgrade packages ────────────────────────

upgrade_packages() {
    log "Upgrading Vestara packages..."

    sudo apt-get upgrade -y vestara-core vestara-api vestara-dashboard vestara-cli vestara-systemd

    log "Packages upgraded"
}

# ── Start services ───────────────────────────

start_services() {
    log "Starting services..."

    sudo systemctl start vestara-api.service
    sudo systemctl start nginx

    log "Services started"
}

# ── Verify upgrade ───────────────────────────

verify_upgrade() {
    log "Verifying upgrade..."

    # Check API health
    local max_retries=10
    local retry=0

    while [ $retry -lt $max_retries ]; do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            log "API is healthy"
            break
        fi

        retry=$((retry + 1))
        sleep 2
    done

    if [ $retry -eq $max_retries ]; then
        warn "API health check failed"
        return 1
    fi

    # Show version
    local version=$(curl -sf http://localhost:3000/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    log "Vestara version: $version"

    return 0
}

# ── Main ─────────────────────────────────────

main() {
    echo -e "${BLUE}"
    echo "  Vestara AI OS — Upgrade"
    echo -e "${NC}"

    if ! check_updates; then
        exit 0
    fi

    read -p "Proceed with upgrade? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi

    backup_before_upgrade
    stop_services
    upgrade_packages
    start_services
    verify_upgrade

    echo
    log "═══════════════════════════════════════"
    log "  Upgrade complete!"
    log "═══════════════════════════════════════"
}

main "$@"

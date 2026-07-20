#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Backup Script
# Backs up user data from portable SSD
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[VESTARA]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────

VESTARA_HOME="${VESTARA_HOME:-/home/ai/vestara}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/vestara-backups}"
BACKUP_NAME="vestara-backup-$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# ── Pre-flight checks ────────────────────────

check_deps() {
    local deps=("rsync" "tar" "gzip")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &>/dev/null; then
            error "Missing dependency: $dep"
        fi
    done
}

# ── Backup user data ─────────────────────────

backup_data() {
    local backup_path="$BACKUP_DIR/$BACKUP_NAME"
    mkdir -p "$backup_path"

    log "Backing up Vestara data to $backup_path"

    # Backup SQLite database
    if [ -f "$VESTARA_HOME/data/vestara.db" ]; then
        log "Backing up database..."
        cp "$VESTARA_HOME/data/vestara.db" "$backup_path/vestara.db"
    fi

    # Backup configuration
    if [ -d "$VESTARA_HOME/config" ]; then
        log "Backing up configuration..."
        rsync -a "$VESTARA_HOME/config/" "$backup_path/config/"
    fi

    # Backup knowledge base
    if [ -d "$VESTARA_HOME/knowledge" ]; then
        log "Backing up knowledge base..."
        rsync -a "$VESTARA_HOME/knowledge/" "$backup_path/knowledge/"
    fi

    # Backup memory
    if [ -d "$VESTARA_HOME/memory" ]; then
        log "Backing up memory..."
        rsync -a "$VESTARA_HOME/memory/" "$backup_path/memory/"
    fi

    # Backup projects
    if [ -d "$VESTARA_HOME/projects" ]; then
        log "Backing up projects..."
        rsync -a "$VESTARA_HOME/projects/" "$backup_path/projects/"
    fi

    # Create compressed archive
    log "Creating archive..."
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
    rm -rf "$backup_path"

    log "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
}

# ── Cleanup old backups ──────────────────────

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "vestara-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
}

# ── List backups ─────────────────────────────

list_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    ls -lh "$BACKUP_DIR"/vestara-backup-*.tar.gz 2>/dev/null || echo "No backups found"
}

# ── Restore from backup ──────────────────────

restore_backup() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi

    log "Restoring from $backup_file..."

    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"

    local backup_name=$(basename "$backup_file" .tar.gz)
    local restore_path="$temp_dir/$backup_name"

    # Restore database
    if [ -f "$restore_path/vestara.db" ]; then
        log "Restoring database..."
        mkdir -p "$VESTARA_HOME/data"
        cp "$restore_path/vestara.db" "$VESTARA_HOME/data/vestara.db"
    fi

    # Restore configuration
    if [ -d "$restore_path/config" ]; then
        log "Restoring configuration..."
        rsync -a "$restore_path/config/" "$VESTARA_HOME/config/"
    fi

    # Restore knowledge base
    if [ -d "$restore_path/knowledge" ]; then
        log "Restoring knowledge base..."
        rsync -a "$restore_path/knowledge/" "$VESTARA_HOME/knowledge/"
    fi

    # Restore memory
    if [ -d "$restore_path/memory" ]; then
        log "Restoring memory..."
        rsync -a "$restore_path/memory/" "$VESTARA_HOME/memory/"
    fi

    rm -rf "$temp_dir"
    log "Restore complete!"
}

# ── Main ─────────────────────────────────────

main() {
    local command="${1:-backup}"

    case "$command" in
        backup)
            check_deps
            backup_data
            cleanup_old_backups
            ;;
        restore)
            if [ -z "${2:-}" ]; then
                error "Usage: $0 restore <backup-file>"
            fi
            restore_backup "$2"
            ;;
        list)
            list_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore|list}"
            exit 1
            ;;
    esac
}

main "$@"

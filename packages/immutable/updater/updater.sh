#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Atomic Updater
# Downloads and applies updates atomically
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[UPDATE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────

UPDATE_SERVER="${UPDATE_SERVER:-https://releases.vestara.ai}"
STATE_DIR="/var/lib/vestara"
UPDATE_DIR="$STATE_DIR/updates"
AB_MANAGER="/usr/lib/vestara/immutable/ab-system/ab-manager.sh"

# ── Check for updates ────────────────────────

check_updates() {
    log "Checking for updates..."

    local current_version=$(cat /etc/vestara-version 2>/dev/null || echo "0.0.0")
    log "Current version: $current_version"

    # Fetch latest version info
    local version_info=$(curl -sf "$UPDATE_SERVER/latest.json" 2>/dev/null || echo "{}")
    local latest_version=$(echo "$version_info" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    local download_url=$(echo "$version_info" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    local checksum=$(echo "$version_info" | grep -o '"checksum":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$latest_version" ]; then
        warn "Could not fetch update information"
        return 1
    fi

    if [ "$current_version" = "$latest_version" ]; then
        log "System is up to date ($current_version)"
        return 1
    fi

    echo -e "${GREEN}Update available: $current_version → $latest_version${NC}"
    echo -e "  Download: $download_url"
    echo -e "  Checksum: $checksum"
    echo

    echo "$version_info"
}

# ── Download update ──────────────────────────

download_update() {
    local url="$1"
    local checksum="$2"

    mkdir -p "$UPDATE_DIR"

    local filename=$(basename "$url")
    local filepath="$UPDATE_DIR/$filename"

    log "Downloading update..."

    # Download with progress
    curl -L --progress-bar -o "$filepath" "$url"

    # Verify checksum
    log "Verifying checksum..."
    local actual_checksum=$(sha256sum "$filepath" | awk '{print $1}')

    if [ "$actual_checksum" != "$checksum" ]; then
        rm -f "$filepath"
        error "Checksum mismatch. Download may be corrupted."
    fi

    log "Download verified"
    echo "$filepath"
}

# ── Apply update ─────────────────────────────

apply_update() {
    local update_file="$1"

    log "Applying update..."

    # Prepare next slot
    local mount_point=$(bash "$AB_MANAGER" prepare)

    # Extract update
    log "Extracting update..."
    tar -xzf "$update_file" -C "$mount_point"

    # Run post-install hooks
    if [ -d "$mount_point/usr/lib/vestara/hooks/post-install" ]; then
        log "Running post-install hooks..."
        for hook in "$mount_point/usr/lib/vestara/hooks/post-install/"*.sh; do
            if [ -x "$hook" ]; then
                bash "$hook"
            fi
        done
    fi

    # Commit update
    bash "$AB_MANAGER" commit "$mount_point"

    log "Update applied successfully"
}

# ── Full update process ──────────────────────

full_update() {
    local version_info=$(check_updates)

    if [ $? -eq 1 ]; then
        return
    fi

    local download_url=$(echo "$version_info" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    local checksum=$(echo "$version_info" | grep -o '"checksum":"[^"]*"' | cut -d'"' -f4)

    read -p "Apply update? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "Update cancelled"
        return
    fi

    local update_file=$(download_update "$download_url" "$checksum")
    apply_update "$update_file"

    echo
    log "═══════════════════════════════════════"
    log "  Update applied!"
    log "  Reboot to activate new version."
    log "═══════════════════════════════════════"
}

# ── Create update package ────────────────────

create_update_package() {
    local version="$1"
    local output_dir="${2:-.}"

    log "Creating update package v$version..."

    # Build the update
    local build_dir="/tmp/vestara-update-build"
    rm -rf "$build_dir"
    mkdir -p "$build_dir"

    # Copy system files
    mkdir -p "$build_dir/usr/lib/vestara"
    rsync -a --exclude='node_modules' --exclude='.git' \
        /usr/lib/vestara/ "$build_dir/usr/lib/vestara/"

    # Copy binaries
    mkdir -p "$build_dir/usr/bin"
    cp /usr/bin/vestara "$build_dir/usr/bin/" 2>/dev/null || true

    # Create version file
    echo "$version" > "$build_dir/etc/vestara-version"
    mkdir -p "$build_dir/etc"

    # Create tarball
    local filename="vestara-update-$version.tar.gz"
    tar -czf "$output_dir/$filename" -C "$build_dir" .

    # Calculate checksum
    local checksum=$(sha256sum "$output_dir/$filename" | awk '{print $1}')

    # Create manifest
    cat > "$output_dir/manifest.json" << EOF
{
    "version": "$version",
    "filename": "$filename",
    "checksum": "$checksum",
    "created": "$(date -Iseconds)",
    "size": $(stat -c%s "$output_dir/$filename")
}
EOF

    rm -rf "$build_dir"

    log "Update package created: $output_dir/$filename"
    log "Checksum: $checksum"
}

# ── Main ─────────────────────────────────────

usage() {
    echo "Usage: $0 {check|update|create <version>}"
    exit 1
}

main() {
    local cmd="${1:-}"

    case "$cmd" in
        check)
            check_updates
            ;;
        update)
            full_update
            ;;
        create)
            if [ -z "${2:-}" ]; then
                error "Version required: $0 create <version>"
            fi
            create_update_package "$2" "${3:-.}"
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"

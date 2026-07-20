#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — APT Repository Builder
# Creates a signed APT repository from .deb files
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$ROOT_DIR/dist/apt"
DEB_DIR="$ROOT_DIR/dist/deb"
GPG_KEY="${GPG_KEY:-vestara}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[REPO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ────────────────────────

check_deps() {
    local deps=("dpkg-scanpackages" "gpg")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &>/dev/null; then
            error "Missing dependency: $dep"
        fi
    done
}

# ── Generate GPG key ────────────────────────

generate_key() {
    if ! gpg --list-keys "$GPG_KEY" &>/dev/null; then
        log "Generating GPG key..."
        
        cat > /tmp/gpg-key-params << EOF
%echo Generating Vestara AI OS signing key
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: Vestara AI OS
Name-Email: signing@vestara.ai
Expire-Date: 0
%no-protection
%commit
%echo Done
EOF
        
        gpg --batch --gen-key /tmp/gpg-key-params
        rm /tmp/gpg-key-params
        
        # Export public key
        gpg --armor --export "$GPG_KEY" > "$REPO_DIR/key.gpg"
        
        log "GPG key generated"
    fi
}

# ── Create repository ────────────────────────

create_repo() {
    mkdir -p "$REPO_DIR/pool/main"
    mkdir -p "$REPO_DIR/dists/stable/main/binary-amd64"
    
    # Copy .deb files
    log "Copying packages..."
    cp "$DEB_DIR"/*.deb "$REPO_DIR/pool/main/"
    
    # Generate Packages file
    log "Generating Packages file..."
    cd "$REPO_DIR"
    dpkg-scanpackages --multiversion pool/main/ > dists/stable/main/binary-amd64/Packages
    gzip -9c dists/stable/main/binary-amd64/Packages > dists/stable/main/binary-amd64/Packages.gz
    
    # Generate Release file
    log "Generating Release file..."
    cat > dists/stable/Release << EOF
Origin: Vestara AI OS
Label: Vestara AI OS
Suite: stable
Codename: stable
Architectures: amd64
Components: main
Description: Vestara AI OS - Portable AI Operating System
Date: $(date -R)
EOF
    
    # Add checksums to Release
    cd "$REPO_DIR"
    for f in dists/stable/main/binary-amd64/Packages*; do
        size=$(stat -c%s "$f")
        md5=$(md5sum "$f" | awk '{print $1}')
        sha1=$(sha1sum "$f" | awk '{print $1}')
        sha256=$(sha256sum "$f" | awk '{print $1}')
        
        echo " $f:
 MD5Sum: $md5 $size $(basename $f)
 SHA1: $sha1 $size $(basename $f)
 SHA256: $sha256 $size $(basename $f)" >> dists/stable/Release
    done
    
    # Sign Release file
    log "Signing Release file..."
    gpg --default-key "$GPG_KEY" -abs -o dists/stable/Release.gpg dists/stable/Release
    gpg --default-key "$GPG_KEY" --clearsign -o dists/stable/InRelease dists/stable/Release
    
    log "APT repository created at $REPO_DIR"
}

# ── Main ─────────────────────────────────────

main() {
    check_deps
    generate_key
    create_repo
    
    echo
    log "═══════════════════════════════════════"
    log "  APT Repository Ready!"
    log "  Location: $REPO_DIR"
    log "═══════════════════════════════════════"
}

main "$@"

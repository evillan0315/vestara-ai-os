#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Debian Package Builder
# Builds all .deb packages from monorepo
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/dist/deb"
VERSION="${VERSION:-0.1.0}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[BUILD]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ────────────────────────

check_deps() {
    local deps=("dpkg-deb" "fakeroot")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &>/dev/null; then
            error "Missing dependency: $dep"
        fi
    done
}

# ── Build vestara-core ───────────────────────

build_core() {
    local pkg="$BUILD_DIR/vestara-core"
    log "Building vestara-core..."
    
    rm -rf "$pkg"
    mkdir -p "$pkg/DEBIAN"
    mkdir -p "$pkg/usr/lib/vestara/core"
    mkdir -p "$pkg/usr/share/doc/vestara-core"
    
    # Control file
    cat > "$pkg/DEBIAN/control" << EOF
Package: vestara-core
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Depends: nodejs (>= 22.0.0)
Maintainer: Vestara <support@vestara.ai>
Description: Vestara AI OS - Core Library
 Core library for Vestara AI OS including SQLite database,
 memory service, knowledge base, and agent runtime.
EOF
    
    # Copy built files
    cp -r "$ROOT_DIR/packages/types/dist"/* "$pkg/usr/lib/vestara/core/" 2>/dev/null || true
    cp -r "$ROOT_DIR/packages/constants/dist"/* "$pkg/usr/lib/vestara/core/" 2>/dev/null || true
    cp -r "$ROOT_DIR/packages/validation/dist"/* "$pkg/usr/lib/vestara/core/" 2>/dev/null || true
    cp -r "$ROOT_DIR/packages/utils/dist"/* "$pkg/usr/lib/vestara/core/" 2>/dev/null || true
    cp -r "$ROOT_DIR/packages/config/dist"/* "$pkg/usr/lib/vestara/core/" 2>/dev/null || true
    cp -r "$ROOT_DIR/services/core/dist"/* "$pkg/usr/lib/vestara/core/" 2>/dev/null || true
    
    # Copy source for runtime
    mkdir -p "$pkg/usr/lib/vestara/core/src"
    cp -r "$ROOT_DIR/services/core/src"/* "$pkg/usr/lib/vestara/core/src/"
    
    # Documentation
    cat > "$pkg/usr/share/doc/vestara-core/README.md" << 'EOF'
# vestara-core

Core library for Vestara AI OS.

## Components

- SQLite database with 16 tables
- Memory service with consolidation
- Knowledge base with search
- Agent runtime with tool execution
- Event bus and logging
EOF
    
    echo -e "0.1.0" > "$pkg/usr/share/doc/vestara-core/changelog.Debian"
    gzip -9 "$pkg/usr/share/doc/vestara-core/changelog.Debian"
    
    # Build
    fakeroot dpkg-deb --build "$pkg" "$BUILD_DIR/"
    log "Built vestara-core"
}

# ── Build vestara-api ────────────────────────

build_api() {
    local pkg="$BUILD_DIR/vestara-api"
    log "Building vestara-api..."
    
    rm -rf "$pkg"
    mkdir -p "$pkg/DEBIAN"
    mkdir -p "$pkg/usr/lib/vestara/api"
    mkdir -p "$pkg/usr/share/doc/vestara-api"
    mkdir -p "$pkg/etc/systemd/system"
    
    # Control file
    cat > "$pkg/DEBIAN/control" << EOF
Package: vestara-api
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Depends: nodejs (>= 22.0.0), vestara-core
Maintainer: Vestara <support@vestara.ai>
Description: Vestara AI OS - API Server
 Fastify API server for Vestara AI OS with REST endpoints,
 WebSocket support, and AI provider integration.
EOF
    
    # Copy built files
    mkdir -p "$pkg/usr/lib/vestara/api/src"
    cp -r "$ROOT_DIR/services/api/src"/* "$pkg/usr/lib/vestara/api/src/"
    cp "$ROOT_DIR/services/api/package.json" "$pkg/usr/lib/vestara/api/"
    
    # Systemd service
    cat > "$pkg/etc/systemd/system/vestara-api.service" << 'EOF'
[Unit]
Description=Vestara AI OS API Server
After=network.target vestara-core.service
Wants=vestara-core.service

[Service]
Type=simple
User=ai
Group=ai
WorkingDirectory=/usr/lib/vestara/api
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF
    
    # Documentation
    cat > "$pkg/usr/share/doc/vestara-api/README.md" << 'EOF'
# vestara-api

Fastify API server for Vestara AI OS.

## Endpoints

- `/api/health` — Health check
- `/api/chat` — AI chat
- `/api/providers` — Provider management
- `/api/agents` — Agent management
- `/api/memory` — Memory store
- `/api/knowledge` — Knowledge base
EOF
    
    echo -e "0.1.0" > "$pkg/usr/share/doc/vestara-api/changelog.Debian"
    gzip -9 "$pkg/usr/share/doc/vestara-api/changelog.Debian"
    
    # Build
    fakeroot dpkg-deb --build "$pkg" "$BUILD_DIR/"
    log "Built vestara-api"
}

# ── Build vestara-dashboard ──────────────────

build_dashboard() {
    local pkg="$BUILD_DIR/vestara-dashboard"
    log "Building vestara-dashboard..."
    
    rm -rf "$pkg"
    mkdir -p "$pkg/DEBIAN"
    mkdir -p "$pkg/usr/lib/vestara/dashboard"
    mkdir -p "$pkg/usr/share/doc/vestara-dashboard"
    mkdir -p "$pkg/etc/nginx/sites-available"
    
    # Control file
    cat > "$pkg/DEBIAN/control" << EOF
Package: vestara-dashboard
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Depends: nginx, vestara-api
Maintainer: Vestara <support@vestara.ai>
Description: Vestara AI OS - Dashboard
 React dashboard for Vestara AI OS with 10 pages including
 AI chat, agents, memory, knowledge, and system monitor.
EOF
    
    # Copy built files
    if [ -d "$ROOT_DIR/apps/dashboard/dist" ]; then
        cp -r "$ROOT_DIR/apps/dashboard/dist"/* "$pkg/usr/lib/vestara/dashboard/"
    fi
    
    # Nginx config
    cat > "$pkg/etc/nginx/sites-available/vestara" << 'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/lib/vestara/dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    
    # Post-install script
    cat > "$pkg/DEBIAN/postinst" << 'EOF'
#!/bin/bash
ln -sf /etc/nginx/sites-available/vestara /etc/nginx/sites-enabled/vestara
rm -f /etc/nginx/sites-enabled/default
systemctl reload nginx
EOF
    chmod 755 "$pkg/DEBIAN/postinst"
    
    # Documentation
    cat > "$pkg/usr/share/doc/vestara-dashboard/README.md" << 'EOF'
# vestara-dashboard

React dashboard for Vestara AI OS.

## Pages

- Dashboard, AI Chat, OpenCode, Agents, Models
- Memory, Knowledge, Terminal, System, Settings
EOF
    
    echo -e "0.1.0" > "$pkg/usr/share/doc/vestara-dashboard/changelog.Debian"
    gzip -9 "$pkg/usr/share/doc/vestara-dashboard/changelog.Debian"
    
    # Build
    fakeroot dpkg-deb --build "$pkg" "$BUILD_DIR/"
    log "Built vestara-dashboard"
}

# ── Build vestara-cli ────────────────────────

build_cli() {
    local pkg="$BUILD_DIR/vestara-cli"
    log "Building vestara-cli..."
    
    rm -rf "$pkg"
    mkdir -p "$pkg/DEBIAN"
    mkdir -p "$pkg/usr/lib/vestara/cli"
    mkdir -p "$pkg/usr/bin"
    mkdir -p "$pkg/usr/share/doc/vestara-cli"
    
    # Control file
    cat > "$pkg/DEBIAN/control" << EOF
Package: vestara-cli
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Depends: nodejs (>= 22.0.0)
Maintainer: Vestara <support@vestara.ai>
Description: Vestara AI OS - Command Line Interface
 CLI tool for managing Vestara AI OS services, chat,
 models, and configuration.
EOF
    
    # Copy built files
    mkdir -p "$pkg/usr/lib/vestara/cli/src"
    cp -r "$ROOT_DIR/packages/cli/src"/* "$pkg/usr/lib/vestara/cli/src/"
    cp "$ROOT_DIR/packages/cli/package.json" "$pkg/usr/lib/vestara/cli/"
    
    # Create wrapper script
    cat > "$pkg/usr/bin/vestara" << 'EOF'
#!/bin/bash
exec node /usr/lib/vestara/cli/src/index.js "$@"
EOF
    chmod 755 "$pkg/usr/bin/vestara"
    
    # Documentation
    cat > "$pkg/usr/share/doc/vestara-cli/README.md" << 'EOF'
# vestara-cli

Command-line interface for Vestara AI OS.

## Commands

- vestara status — Show service status
- vestara start — Start services
- vestara stop — Stop services
- vestara chat — Interactive AI chat
- vestara models — List models
- vestara config — Manage configuration
EOF
    
    echo -e "0.1.0" > "$pkg/usr/share/doc/vestara-cli/changelog.Debian"
    gzip -9 "$pkg/usr/share/doc/vestara-cli/changelog.Debian"
    
    # Build
    fakeroot dpkg-deb --build "$pkg" "$BUILD_DIR/"
    log "Built vestara-cli"
}

# ── Build vestara-systemd ────────────────────

build_systemd() {
    local pkg="$BUILD_DIR/vestara-systemd"
    log "Building vestara-systemd..."
    
    rm -rf "$pkg"
    mkdir -p "$pkg/DEBIAN"
    mkdir -p "$pkg/etc/systemd/system"
    mkdir -p "$pkg/usr/share/doc/vestara-systemd"
    
    # Control file
    cat > "$pkg/DEBIAN/control" << EOF
Package: vestara-systemd
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Depends: systemd
Maintainer: Vestara <support@vestara.ai>
Description: Vestara AI OS - Systemd Services
 systemd service files for Vestara AI OS including
 auto-login and Plymouth boot theme.
EOF
    
    # Copy service files
    if [ -d "$ROOT_DIR/systemd" ]; then
        cp "$ROOT_DIR/systemd"/*.service "$pkg/etc/systemd/system/" 2>/dev/null || true
        cp "$ROOT_DIR/systemd"/*.target "$pkg/etc/systemd/system/" 2>/dev/null || true
    fi
    
    # Auto-login config
    mkdir -p "$pkg/etc/systemd/system/getty@tty1.service.d"
    cat > "$pkg/etc/systemd/system/getty@tty1.service.d/autologin.conf" << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ai --noclear %I $TERM
EOF
    
    # Post-install script
    cat > "$pkg/DEBIAN/postinst" << 'EOF'
#!/bin/bash
systemctl daemon-reload
systemctl enable vestara.target
systemctl set-default graphical.target
EOF
    chmod 755 "$pkg/DEBIAN/postinst"
    
    # Documentation
    cat > "$pkg/usr/share/doc/vestara-systemd/README.md" << 'EOF'
# vestara-systemd

systemd service files for Vestara AI OS.

## Services

- vestara.target — Main target
- vestara-api.service — API server
- vestara-dashboard.service — Dashboard
EOF
    
    echo -e "0.1.0" > "$pkg/usr/share/doc/vestara-systemd/changelog.Debian"
    gzip -9 "$pkg/usr/share/doc/vestara-systemd/changelog.Debian"
    
    # Build
    fakeroot dpkg-deb --build "$pkg" "$BUILD_DIR/"
    log "Built vestara-systemd"
}

# ── Build all packages ───────────────────────

build_all() {
    mkdir -p "$BUILD_DIR"
    
    build_core
    build_api
    build_dashboard
    build_cli
    build_systemd
    
    echo
    log "═══════════════════════════════════════"
    log "  All packages built!"
    log "  Output: $BUILD_DIR/"
    log "═══════════════════════════════════════"
    ls -lh "$BUILD_DIR"/*.deb
}

# ── Main ─────────────────────────────────────

main() {
    check_deps
    build_all
}

main "$@"

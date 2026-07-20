#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — ISO Builder
# Creates a custom bootable ISO image
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ISO_DIR="$ROOT_DIR/packages/iso"
BUILD_DIR="$ROOT_DIR/dist/iso"
VERSION="${VERSION:-0.1.0}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[ISO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ────────────────────────

check_deps() {
    local deps=("debootstrap" "xorriso" "mksquashfs" "grub-mkrescue")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &>/dev/null; then
            error "Missing dependency: $dep"
        fi
    done
    log "All dependencies found"
}

# ── Create live filesystem ───────────────────

create_live_fs() {
    log "Creating live filesystem..."

    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"/{chroot,image/{live,isolinux},workspace}

    # Bootstrap Debian minimal
    debootstrap --arch=amd64 --variant=minbase \
        --include=systemd,systemd-sysv,dbus,locales,sudo,curl,wget,ca-certificates \
        trixie "$BUILD_DIR/chroot" http://deb.debian.org/debian

    log "Live filesystem created"
}

# ── Configure live system ────────────────────

configure_live() {
    log "Configuring live system..."

    chroot "$BUILD_DIR/chroot" bash -c '
        # Hostname
        echo "vestara" > /etc/hostname

        # Locale
        echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
        locale-gen

        # Timezone
        ln -sf /usr/share/zoneinfo/UTC /etc/localtime

        # Auto-login
        mkdir -p /etc/systemd/system/getty@tty1.service.d
        cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ai --noclear %I \$TERM
EOF

        # Create live user
        useradd -m -s /bin/bash -G sudo ai
        echo "ai:vestara" | chpasswd
        echo "ai ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/ai
    '

    log "Live system configured"
}

# ── Install Vestara packages ─────────────────

install_vestara() {
    log "Installing Vestara packages..."

    # Install Node.js
    chroot "$BUILD_DIR/chroot" bash -c '
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    '

    # Install Docker
    chroot "$BUILD_DIR/chroot" bash -c '
        curl -fsSL https://get.docker.com | sh
    '

    # Install Ollama
    chroot "$BUILD_DIR/chroot" bash -c '
        curl -fsSL https://ollama.com/install.sh | sh
    '

    # Install Chromium
    chroot "$BUILD_DIR/chroot" bash -c '
        apt-get install -y chromium
    '

    # Copy and install Vestara
    mkdir -p "$BUILD_DIR/chroot/usr/lib/vestara"
    rsync -a --exclude='node_modules' --exclude='.git' --exclude='dist' \
        "$ROOT_DIR/" "$BUILD_DIR/chroot/usr/lib/vestara/"

    # Install dependencies and build
    chroot "$BUILD_DIR/chroot" bash -c '
        cd /usr/lib/vestara
        npm install -g pnpm
        pnpm install --frozen-lockfile
        pnpm build
        chown -R ai:ai /usr/lib/vestara
    '

    log "Vestara installed"
}

# ── Create squashfs ──────────────────────────

create_squashfs() {
    log "Creating squashfs filesystem..."

    # Clean up
    chroot "$BUILD_DIR/chroot" bash -c '
        apt-get clean
        rm -rf /var/cache/apt/archives/*
        rm -rf /tmp/*
        rm -rf /var/tmp/*
    '

    # Create squashfs
    mksquashfs "$BUILD_DIR/chroot" "$BUILD_DIR/image/live/filesystem.squashfs" \
        -comp gzip -Xb 1

    # Copy vmlinuz and initrd
    cp "$BUILD_DIR/chroot/boot/vmlinuz-"* "$BUILD_DIR/image/live/vmlinuz"
    cp "$BUILD_DIR/chroot/boot/initrd.img-"* "$BUILD_DIR/image/live/initrd"

    log "Squashfs created"
}

# ── Create isolinux config ───────────────────

create_isolinux() {
    log "Creating isolinux configuration..."

    cat > "$BUILD_DIR/image/isolinux/isolinux.cfg" << 'EOF'
DEFAULT vesamenu.c32
TIMEOUT 50
MENU TITLE Vestara AI OS Installer

LABEL vestara
    MENU LABEL Vestara AI OS
    LINUX /live/vmlinuz
    INITRD /live/initrd
    APPEND boot=live components quiet

LABEL vestara-safe
    MENU LABEL Vestara AI OS (Safe Mode)
    LINUX /live/vmlinuz
    INITRD /live/initrd
    APPEND boot=live components quiet nomodeset

LABEL vestara-recovery
    MENU LABEL Recovery Mode
    LINUX /live/vmlinuz
    INITRD /live/initrd
    APPEND boot=live components quiet recovery
EOF

    # Copy isolinux files
    cp /usr/lib/ISOLINUX/isolinux.bin "$BUILD_DIR/image/isolinux/" 2>/dev/null || true
    cp /usr/lib/syslinux/modules/bios/vesamenu.c32 "$BUILD_DIR/image/isolinux/" 2>/dev/null || true

    log "Isolinux configured"
}

# ── Create GRUB config ──────────────────────

create_grub() {
    log "Creating GRUB configuration..."

    mkdir -p "$BUILD_DIR/image/boot/grub"

    cat > "$BUILD_DIR/image/boot/grub/grub.cfg" << 'EOF'
set timeout=5
set default=0

menuentry "Vestara AI OS" {
    linux /live/vmlinuz boot=live components quiet
    initrd /live/initrd
}

menuentry "Vestara AI OS (Safe Mode)" {
    linux /live/vmlinuz boot=live components quiet nomodeset
    initrd /live/initrd
}

menuentry "Recovery Mode" {
    linux /live/vmlinuz boot=live components quiet recovery
    initrd /live/initrd
}
EOF

    log "GRUB configured"
}

# ── Create ISO ───────────────────────────────

create_iso() {
    log "Creating ISO image..."

    xorriso -as mkisofs \
        -iso-level 3 \
        -full-iso9660-filenames \
        -volid "VESTARA" \
        -output "$BUILD_DIR/vestara-ai-os-$VERSION.iso" \
        -eltorito-boot isolinux/isolinux.bin \
            -no-emul-boot \
            -boot-load-size 4 \
            -boot-info-table \
            -eltorito-catalog isolinux/boot.cat \
        "$BUILD_DIR/image"

    log "ISO created: dist/iso/vestara-ai-os-$VERSION.iso"
}

# ── Main ─────────────────────────────────────

main() {
    log "═══════════════════════════════════════"
    log "  Vestara AI OS — ISO Builder"
    log "═══════════════════════════════════════"
    echo

    check_deps
    create_live_fs
    configure_live
    install_vestara
    create_squashfs
    create_isolinux
    create_grub
    create_iso

    echo
    log "═══════════════════════════════════════"
    log "  ISO build complete!"
    log "  Image: dist/iso/vestara-ai-os-$VERSION.iso"
    log "═══════════════════════════════════════"
}

main "$@"

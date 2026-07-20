#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Build Script
# Creates a bootable portable SSD image
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="vestara-ai-os.img"
IMAGE_SIZE="20G"
MOUNT_POINT="/tmp/vestara-build"
CHROOT_POINT="/tmp/vestara-chroot"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[VESTARA]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ────────────────────────

check_deps() {
    local deps=("debootstrap" "parted" "mkfs.ext4" "mkfs.vfat" "chroot" "rsync")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &>/dev/null; then
            error "Missing dependency: $dep"
        fi
    done
    log "All dependencies found"
}

# ── Create disk image ────────────────────────

create_image() {
    local img="$ROOT_DIR/dist/$IMAGE_NAME"
    mkdir -p "$ROOT_DIR/dist"

    log "Creating ${IMAGE_SIZE} disk image..."
    fallocate -l "$IMAGE_SIZE" "$img"

    log "Partitioning disk image..."
    parted -s "$img" \
        mklabel gpt \
        mkpart primary fat32 1MiB 513MiB \
        mkpart primary ext4 513MiB 2565MiB \
        mkpart primary ext4 2565MiB 100% \
        set 1 esp on

    # Setup loop device
    local loopdev
    loopdev=$(losetup --find --show --partscan "$img")

    sleep 1

    log "Formatting partitions..."
    mkfs.vfat -F32 -n "EFI" "${loopdev}p1"
    mkfs.ext4 -L "boot" "${loopdev}p2"
    mkfs.ext4 -L "vestara" "${loopdev}p3"

    echo "$loopdev"
}

# ── Install Debian ───────────────────────────

install_debian() {
    local loopdev="$1"

    log "Mounting partitions..."
    mkdir -p "$MOUNT_POINT"
    mount "${loopdev}p3" "$MOUNT_POINT"
    mkdir -p "$MOUNT_POINT/boot"
    mount "${loopdev}p2" "$MOUNT_POINT/boot"
    mkdir -p "$MOUNT_POINT/boot/efi"
    mount "${loopdev}p1" "$MOUNT_POINT/boot/efi"

    log "Installing Debian 13 (Trixie) minimal..."
    debootstrap --arch=amd64 --variant=minbase \
        --include=systemd,systemd-sysv,dbus,locales,sudo,curl,wget,ca-certificates,gnupg \
        trixie "$MOUNT_POINT" http://deb.debian.org/debian

    log "Debian installed"
}

# ── Configure base system ────────────────────

configure_system() {
    log "Configuring base system..."

    # Fstab
    cat > "$MOUNT_POINT/etc/fstab" << 'FSTAB'
# <file system>  <mount point>  <type>  <options>           <dump>  <pass>
UUID=EFI          /boot/efi      vfat    umask=0077          0       1
UUID=BOOT         /boot          ext4    errors=remount-ro   0       2
UUID=VESTARA      /              ext4    errors=remount-ro   0       1
FSTAB

    # Hostname
    echo "vestara" > "$MOUNT_POINT/etc/hostname"

    # Timezone
    chroot "$MOUNT_POINT" ln -sf /usr/share/zoneinfo/UTC /etc/localtime

    # Locale
    echo "en_US.UTF-8 UTF-8" > "$MOUNT_POINT/etc/locale.gen"
    chroot "$MOUNT_POINT" locale-gen

    # Network
    cat > "$MOUNT_POINT/etc/systemd/network/20-wired.network" << 'NETWORK'
[Match]
Name=en* eth*

[Network]
DHCP=yes
NETWORK

    log "Base system configured"
}

# ── Create ai user ───────────────────────────

create_user() {
    log "Creating ai user..."

    chroot "$MOUNT_POINT" useradd \
        --create-home \
        --shell /bin/bash \
        --groups sudo \
        --password '' \
        ai

    # Passwordless sudo
    echo "ai ALL=(ALL) NOPASSWD:ALL" > "$MOUNT_POINT/etc/sudoers.d/ai"

    # Auto-login
    mkdir -p "$MOUNT_POINT/etc/systemd/system/getty@tty1.service.d"
    cat > "$MOUNT_POINT/etc/systemd/system/getty@tty1.service.d/autologin.conf" << 'AUTOLOGIN'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ai --noclear %I $TERM
AUTOLOGIN

    log "User 'ai' created with auto-login"
}

# ── Install Node.js ─────────────────────────

install_nodejs() {
    log "Installing Node.js 22..."

    chroot "$MOUNT_POINT" bash -c '
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    '

    log "Node.js installed: $(chroot "$MOUNT_POINT" node --version)"
}

# ── Install Docker ───────────────────────────

install_docker() {
    log "Installing Docker..."

    chroot "$MOUNT_POINT" bash -c '
        curl -fsSL https://get.docker.com | sh
        usermod -aG docker ai
    '

    log "Docker installed"
}

# ── Install Ollama ───────────────────────────

install_ollama() {
    log "Installing Ollama..."

    chroot "$MOUNT_POINT" bash -c '
        curl -fsSL https://ollama.com/install.sh | sh
    '

    log "Ollama installed"
}

# ── Install OpenCode ─────────────────────────

install_opencode() {
    log "Installing OpenCode..."

    chroot "$MOUNT_POINT" bash -c '
        npm install -g opencode-ai
    '

    log "OpenCode installed"
}

# ── Install Chromium ─────────────────────────

install_chromium() {
    log "Installing Chromium..."

    chroot "$MOUNT_POINT" bash -c '
        apt-get install -y chromium
    '

    log "Chromium installed"
}

# ── Deploy Vestara ───────────────────────────

deploy_vestara() {
    log "Deploying Vestara AI OS..."

    mkdir -p "$MOUNT_POINT/home/ai/vestara"

    # Copy monorepo
    rsync -a --exclude='node_modules' --exclude='.git' --exclude='dist' \
        "$ROOT_DIR/" "$MOUNT_POINT/home/ai/vestara/"

    # Install dependencies and build
    chroot "$MOUNT_POINT" bash -c '
        cd /home/ai/vestara
        npm install -g pnpm
        pnpm install --frozen-lockfile
        pnpm build
        chown -R ai:ai /home/ai/vestara
    '

    log "Vestara deployed"
}

# ── Install systemd services ─────────────────

install_services() {
    log "Installing systemd services..."

    rsync -a "$ROOT_DIR/systemd/" "$MOUNT_POINT/etc/systemd/system/"

    chroot "$MOUNT_POINT" systemctl daemon-reload

    log "Services installed"
}

# ── Install Plymouth theme ───────────────────

install_plymouth() {
    log "Installing Plymouth theme..."

    if [ -d "$ROOT_DIR/branding/plymouth" ]; then
        mkdir -p "$MOUNT_POINT/usr/share/plymouth/themes/vestara"
        rsync -a "$ROOT_DIR/branding/plymouth/" \
            "$MOUNT_POINT/usr/share/plymouth/themes/vestara/"

        # Configure Plymouth
        cat > "$MOUNT_POINT/etc/plymouth/plymouthd.conf" << 'PLYMOUTH'
[Daemon]
Theme=vestara
DeviceTimeout=8
ShowDelay=0
PLYMOUTH

        chroot "$MOUNT_POINT" update-alternatives --set plymouth.plymouthd \
            /usr/share/plymouth/themes/vestara/vestara.plymouth || true
    fi

    log "Plymouth theme installed"
}

# ── Cleanup ──────────────────────────────────

cleanup() {
    log "Cleaning up..."

    umount "$MOUNT_POINT/boot/efi" 2>/dev/null || true
    umount "$MOUNT_POINT/boot" 2>/dev/null || true
    umount "$MOUNT_POINT" 2>/dev/null || true

    if [ -n "${loopdev:-}" ]; then
        losetup -d "$loopdev" 2>/dev/null || true
    fi

    rmdir "$MOUNT_POINT" 2>/dev/null || true
}

# ── Main ─────────────────────────────────────

main() {
    log "═══════════════════════════════════════"
    log "  Vestara AI OS — Build Script"
    log "═══════════════════════════════════════"
    echo

    check_deps

    local loopdev
    loopdev=$(create_image)
    install_debian "$loopdev"
    configure_system
    create_user
    install_nodejs
    install_docker
    install_ollama
    install_opencode
    install_chromium
    deploy_vestara
    install_services
    install_plymouth
    cleanup

    echo
    log "═══════════════════════════════════════"
    log "  Build complete!"
    log "  Image: dist/$IMAGE_NAME"
    log "  Flash to SSD: sudo dd if=dist/$IMAGE_NAME of=/dev/sdX bs=4M status=progress"
    log "═══════════════════════════════════════"
}

trap cleanup EXIT
main "$@"

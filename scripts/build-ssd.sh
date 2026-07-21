#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Build Script
# Creates a bootable portable SSD image or
# installs directly to a portable hard drive
# ──────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="vestara-ai-os.img"
IMAGE_SIZE="20G"
MOUNT_POINT="/tmp/vestara-build"
CHROOT_POINT="/tmp/vestara-chroot"
TARGET_DEVICE=""
TARGET_DEV=""         # resolved device (loop or real)
UPDATE_MODE=false
DRY_RUN=false
DEBIAN_MIRROR="http://deb.debian.org/debian"
BUILD_LOG=""          # set to a file path to tee all output

# Partition layout (all sizes in MiB)
PART_EFI_SIZE=512
PART_BOOT_SIZE=2048
PART_START_ALIGN=1
LABEL_EFI="EFI"
LABEL_BOOT="boot"
LABEL_ROOT="vestara"

# ── Config file support ─────────────────────
# Load vestara-build.conf from script dir or project root.
# Override any of the defaults above.
for conf in "$SCRIPT_DIR/vestara-build.conf" "$ROOT_DIR/vestara-build.conf"; do
    if [ -f "$conf" ]; then
        # shellcheck source=/dev/null
        . "$conf"
        log "Loaded config from $conf"
    fi
done

# ── Colors ──────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[VESTARA]${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# ── Retry wrapper ───────────────────────────
retry() {
    local attempts=3 delay=5
    for i in $(seq 1 "$attempts"); do
        if "$@"; then return 0; fi
        warn "Command failed (attempt $i/$attempts). Retrying in ${delay}s..."
        sleep "$delay"
        delay=$((delay * 2))
    done
    error "Command failed after $attempts attempts: $*"
}

# ── Progress spinner for long operations ────
spinner() {
    local msg="$1" pid=$2
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    while kill -0 "$pid" 2>/dev/null; do
        printf "\r${GREEN}[VESTARA]${NC} %s  %s" "${spin:i++%${#spin}:1}" "$msg" >&2
        sleep 0.15
    done
    printf "\r${GREEN}[VESTARA]${NC} ✓ %s\n" "$msg" >&2
}

# Run a command with a spinner while it executes.
run_with_spinner() {
    local msg="$1"
    shift
    if [ "$DRY_RUN" = true ]; then
        log "[DRY-RUN] $*"
        return 0
    fi
    "$@" &
    local pid=$!
    spinner "$msg" "$pid"
    wait "$pid" || return $?
}

# ── Root check ──────────────────────────────
check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        error "This script must be run as root (sudo). Partitioning, mounting, and chroot require it."
    fi
}

# ── Network connectivity test ───────────────
check_network() {
    local host
    host=$(echo "$DEBIAN_MIRROR" | sed 's|http[s]*://||;s|/.*||')
    if ! ping -c 1 -W 3 "$host" &>/dev/null; then
        warn "Cannot reach $host (Debian mirror). Check your internet connection."
        warn "The build may fail during debootstrap."
    else
        log "Network reachable ($host)"
    fi
}

# ── Chroot safety guard ─────────────────────
chroot_safe() {
    local path="$1"
    if [ -z "$path" ] || [ "$path" = "/" ]; then
        error "Refusing to chroot into '$path' — this would modify the host system"
    fi
    if [ ! -d "$path" ]; then
        error "Chroot target '$path' does not exist"
    fi
}

# Safe chroot wrapper — validates path before entering.
safe_chroot() {
    chroot_safe "$1"
    chroot "$@"
}

# ── Parted version detection ────────────────
# parted ≥ 3.2 supports --align; older versions need different handling.
check_parted_version() {
    local version
    version=$(parted --version 2>/dev/null | head -1 | sed 's/.* \([0-9]*\.[0-9]*\).*/\1/')
    if [ -z "$version" ]; then
        warn "Could not detect parted version"
        return 0
    fi
    if awk "BEGIN { exit !($version < 3.2) }" 2>/dev/null; then
        warn "parted $version detected — very old version. Partition alignment may fail."
    fi
}

# ── Disk space check ─────────────────────────
# Verifies enough free space before image creation or debootstrap.
check_disk_space() {
    local path="$1" needed="$2" label="$3"
    local available
    available=$(df -BM --output=avail "$path" 2>/dev/null | tail -1 | tr -d 'M ')
    local needed_m
    needed_m=$(echo "$needed" | sed 's/[^0-9]//g')
    local unit
    unit=$(echo "$needed" | sed 's/[0-9]//g')
    case "$unit" in
        G|g) needed_m=$((needed_m * 1024)) ;;
    esac
    if [ "$available" -lt "$needed_m" ]; then
        error "Insufficient disk space on $path: need $needed, have $((available / 1024))G available"
    fi
    log "$label: $needed disk space confirmed on $path"
}

# ── Post-build verification ──────────────────
# Runs fsck on the new partitions and validates the layout.
verify_build() {
    local dev="$1"
    local sfx
    sfx=$(partition_suffix "$dev")

    log "Verifying filesystems..."
    local ok=true

    for part_num in 1 2 3; do
        local part="${dev}${sfx}${part_num}"
        if [ ! -b "$part" ]; then
            warn "Partition $part does not exist"
            ok=false
            continue
        fi
        local fstype
        fstype=$(lsblk -lno FSTYPE "$part" 2>/dev/null || echo "")
        case "$part_num" in
            1) local expected="vfat" ;;
            2|3) local expected="ext4" ;;
        esac
        if [ "$fstype" != "$expected" ]; then
            warn "$part: expected $expected, got ${fstype:-none}"
            ok=false
        fi

        # Run fsck (non-destructive read-only check)
        if [ "$fstype" = "ext4" ]; then
            fsck.ext4 -fn "$part" >/dev/null 2>&1 || {
                warn "$part: filesystem has errors (run fsck manually)"
                ok=false
            }
        elif [ "$fstype" = "vfat" ]; then
            fsck.vfat -n "$part" >/dev/null 2>&1 || {
                warn "$part: filesystem has errors"
                ok=false
            }
        fi
    done

    # Verify partition count
    local count
    count=$(lsblk -lno NAME "$dev" 2>/dev/null | tail -n +2 | wc -l)
    if [ "$count" -ne 3 ]; then
        warn "Expected 3 partitions, found $count on $dev"
        ok=false
    fi

    if [ "$ok" = true ]; then
        log "Filesystems verified — all 3 partitions healthy"
    else
        warn "Some checks failed — review warnings above"
    fi
}

# ── Pre-flight checks ────────────────────────

check_deps() {
    local deps=("debootstrap" "parted" "mkfs.ext4" "mkfs.vfat" "chroot" "rsync" "partprobe")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &>/dev/null; then
            error "Missing dependency: $dep"
        fi
    done
    check_parted_version
    log "All dependencies found"
}

# ── Partition suffix helper ─────────────────
# Real devices use different partition naming:
#   /dev/sda   → sda1, sda2, sda3
#   /dev/nvme0n1 → nvme0n1p1, nvme0n1p2
#   loop devs  → loop0p1, loop0p2, loop0p3
partition_suffix() {
    local dev="$1"
    if [[ "$dev" =~ [0-9]$ ]]; then
        echo "p"
    fi
}

# ── Boot-disk guard ─────────────────────────
# Abort if the target device is the system disk.
check_not_system_disk() {
    local dev="$1"
    local root_dev
    root_dev=$(lsblk -lno PKNAME "$(findmnt -n -o SOURCE /)" 2>/dev/null || true)
    local boot_dev
    boot_dev=$(lsblk -lno PKNAME "$(findmnt -n -o SOURCE /boot 2>/dev/null)" 2>/dev/null || true)

    for check_dev in "$root_dev" "$boot_dev"; do
        if [ -n "$check_dev" ] && [ "/dev/$check_dev" = "$dev" ]; then
            error "Refusing to operate on $dev — this is your system disk"
        fi
    done
}

# ── Device size check ───────────────────────
check_device_size() {
    local dev="$1"
    local min_bytes=$(( (PART_START_ALIGN + PART_EFI_SIZE + PART_BOOT_SIZE + 1024) * 1024 * 1024 ))
    local dev_bytes
    dev_bytes=$(lsblk -bndo SIZE "$dev" 2>/dev/null || echo 0)
    if [ "$dev_bytes" -lt "$min_bytes" ]; then
        local dev_size
        dev_size=$(lsblk -ndo SIZE "$dev" 2>/dev/null || echo "unknown")
        error "Device $dev is too small ($dev_size). Need at least 3.5 GiB for the Vestara partitions."
    fi
}

# ── Verify existing Vestara install ─────────
check_existing_install() {
    if [ ! -f "$MOUNT_POINT/home/ai/vestara/package.json" ]; then
        error "No Vestara installation found on $TARGET_DEVICE (missing package.json). Run a full build first."
    fi
    log "Existing Vestara install detected"
}

# ── Mount existing installation (for updates) ─
# Skips partitioning and formatting; mounts existing Vestara partitions.
mount_existing() {
    local dev="$TARGET_DEVICE"

    if [ ! -b "$dev" ]; then
        error "Device $dev does not exist or is not a block device"
    fi

    check_not_system_disk "$dev"

    # Unmount anything already mounted from this device
    for part in $(lsblk -lno NAME "$dev" 2>/dev/null | tail -n +2); do
        umount -l "/dev/$part" 2>/dev/null || true
        swapoff "/dev/$part" 2>/dev/null || true
    done

    mount_partitions "$dev"
    check_existing_install
    echo "$dev"
}

# ── Prepare target device ───────────────────
# If TARGET_DEVICE is set, partition a real drive.
# Otherwise create a disk image + loop device.
prepare_device() {
    if [ -n "$TARGET_DEVICE" ]; then
        local dev="$TARGET_DEVICE"

        if [ ! -b "$dev" ]; then
            error "Device $dev does not exist or is not a block device"
        fi

        check_not_system_disk "$dev"
        check_device_size "$dev"

        log "WARNING: This will ERASE ALL DATA on $dev"
        log "         $(lsblk -ndo SIZE,MODEL "$dev" 2>/dev/null || echo "unknown device")"
        echo -n "Continue? [y/N] " >&2
        read -r confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            error "Aborted by user"
        fi

        log "Unmounting any mounted partitions on $dev..."
        for part in $(lsblk -lno NAME "$dev" | tail -n +2); do
            umount "/dev/$part" 2>/dev/null || true
            swapoff "/dev/$part" 2>/dev/null || true
        done

        log "Releasing any processes using $dev..."
        for part in $(lsblk -lno NAME "$dev" | tail -n +2); do
            fuser -km "/dev/$part" &>/dev/null || true
        done
        fuser -km "$dev" &>/dev/null || true
        udevadm settle 2>/dev/null || true

        log "Wiping old partition signatures..."
        for part in $(lsblk -lno NAME "$dev" | tail -n +2); do
            dd if=/dev/zero of="/dev/$part" bs=1M count=1 conv=notrunc status=none 2>/dev/null || true
        done

        log "Zapping partition table..."
        if command -v sgdisk &>/dev/null; then
            sgdisk -Z "$dev" >/dev/null 2>&1 || true
        else
            dd if=/dev/zero of="$dev" bs=1M count=1 conv=notrunc status=none 2>/dev/null
        fi
        udevadm settle 2>/dev/null || true
        sleep 1

        log "Partitioning $dev..."
        local efi_end=$((PART_START_ALIGN + PART_EFI_SIZE))
        local boot_end=$((efi_end + PART_BOOT_SIZE))
        parted -s "$dev" \
            mklabel gpt \
            mkpart primary fat32 "${PART_START_ALIGN}MiB" "${efi_end}MiB" \
            mkpart primary ext4 "${efi_end}MiB" "${boot_end}MiB" \
            mkpart primary ext4 "${boot_end}MiB" 100% \
            set 1 esp on >&2 || {
                warn "parted reported an issue — the table was likely written anyway"
                warn "If the device is claimed by udisks2, try: sudo systemctl stop udisks2"
                warn "Then re-run the script."
            }

        partprobe "$dev" 2>/dev/null || true
        udevadm settle 2>/dev/null || true
        sleep 2

        local sfx
        sfx=$(partition_suffix "$dev")

        log "Formatting partitions..."
        mkfs.vfat -F32 -n "$LABEL_EFI" "${dev}${sfx}1" >&2
        mkfs.ext4 -F -L "$LABEL_BOOT" "${dev}${sfx}2" >&2
        mkfs.ext4 -F -L "$LABEL_ROOT" "${dev}${sfx}3" >&2

        echo "$dev"
    else
        local img="$ROOT_DIR/dist/$IMAGE_NAME"
        mkdir -p "$ROOT_DIR/dist"

        log "Creating ${IMAGE_SIZE} disk image..."
        check_disk_space "$ROOT_DIR/dist" "$IMAGE_SIZE" "Image"
        fallocate -l "$IMAGE_SIZE" "$img"

        log "Partitioning disk image..."
        local efi_end=$((PART_START_ALIGN + PART_EFI_SIZE))
        local boot_end=$((efi_end + PART_BOOT_SIZE))
        parted -s "$img" \
            mklabel gpt \
            mkpart primary fat32 "${PART_START_ALIGN}MiB" "${efi_end}MiB" \
            mkpart primary ext4 "${efi_end}MiB" "${boot_end}MiB" \
            mkpart primary ext4 "${boot_end}MiB" 100% \
            set 1 esp on >&2

        local loopdev
        loopdev=$(losetup --find --show --partscan "$img")

        sleep 2

        log "Formatting partitions..."
        mkfs.vfat -F32 -n "$LABEL_EFI" "${loopdev}p1" >&2
        mkfs.ext4 -F -L "$LABEL_BOOT" "${loopdev}p2" >&2
        mkfs.ext4 -F -L "$LABEL_ROOT" "${loopdev}p3" >&2

        echo "$loopdev"
    fi
}

# ── Mount partitions (shared, does not format) ─

mount_partitions() {
    local dev="$1"
    local sfx
    sfx=$(partition_suffix "$dev")

    log "Mounting partitions..."
    mkdir -p "$MOUNT_POINT"
    mount -t ext4 "${dev}${sfx}3" "$MOUNT_POINT"
    mkdir -p "$MOUNT_POINT/boot"
    mount -t ext4 "${dev}${sfx}2" "$MOUNT_POINT/boot"
    mkdir -p "$MOUNT_POINT/boot/efi"
    mount -t vfat "${dev}${sfx}1" "$MOUNT_POINT/boot/efi"
}

# ── Install Debian ───────────────────────────

install_debian() {
    local dev="$1"
    mount_partitions "$dev"
    chroot_safe "$MOUNT_POINT"

    log "Installing Debian 13 (Trixie) minimal..."
    check_network
    check_disk_space "$MOUNT_POINT" "2G" "Debian base"
    run_with_spinner "Installing Debian 13 (Trixie)..." \
        retry debootstrap --arch=amd64 --variant=minbase \
            --include=systemd,systemd-sysv,dbus,locales,sudo,curl,wget,ca-certificates,gnupg \
            trixie "$MOUNT_POINT" "$DEBIAN_MIRROR"

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
    safe_chroot "$MOUNT_POINT" ln -sf /usr/share/zoneinfo/UTC /etc/localtime

    # Locale
    echo "en_US.UTF-8 UTF-8" > "$MOUNT_POINT/etc/locale.gen"
    safe_chroot "$MOUNT_POINT" locale-gen

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

    safe_chroot "$MOUNT_POINT" useradd \
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

    retry safe_chroot "$MOUNT_POINT" bash -c '
        set -e
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt-get install -y nodejs
    '

    log "Node.js installed: $(safe_chroot "$MOUNT_POINT" node --version)"
}

# ── Install Docker ───────────────────────────

install_docker() {
    log "Installing Docker..."

    retry safe_chroot "$MOUNT_POINT" bash -c '
        set -e
        curl -fsSL https://get.docker.com | sh
        usermod -aG docker ai
    '

    log "Docker installed"
}

# ── Install Ollama ───────────────────────────

install_ollama() {
    log "Installing Ollama..."

    retry safe_chroot "$MOUNT_POINT" bash -c '
        set -e
        curl -fsSL https://ollama.com/install.sh | sh
    '

    log "Ollama installed"
}

# ── Install OpenCode ─────────────────────────

install_opencode() {
    log "Installing OpenCode..."

    retry safe_chroot "$MOUNT_POINT" bash -c '
        npm install -g opencode-ai
    '

    log "OpenCode installed"
}

# ── Install Chromium ─────────────────────────

install_chromium() {
    log "Installing Chromium and Nginx..."

    retry safe_chroot "$MOUNT_POINT" bash -c '
        apt-get update -qq
        apt-get install -y -qq chromium nginx
    '

    log "Chromium and Nginx installed"
}

# ── Deploy Vestara ───────────────────────────

deploy_vestara() {
    log "Deploying Vestara AI OS..."

    mkdir -p "$MOUNT_POINT/home/ai/vestara"

    local rsync_opts=(-a --exclude='node_modules' --exclude='.git' --exclude='dist')
    if [ "$UPDATE_MODE" = true ]; then
        rsync_opts+=(--delete)
    fi

    rsync "${rsync_opts[@]}" \
        "$ROOT_DIR/" "$MOUNT_POINT/home/ai/vestara/"

    # Install dependencies and build
    if [ "$UPDATE_MODE" = true ]; then
        log "Quick update — skipping pnpm install (deps already installed)"
        safe_chroot "$MOUNT_POINT" bash -c '
            cd /home/ai/vestara
            pnpm build
            chown -R ai:ai /home/ai/vestara
        '
    else
        safe_chroot "$MOUNT_POINT" bash -c '
            cd /home/ai/vestara
            npm install -g pnpm
            pnpm install --frozen-lockfile
            pnpm build
            chown -R ai:ai /home/ai/vestara
        '
    fi

    log "Vestara deployed"
}

# ── Install systemd services ─────────────────

install_services() {
    log "Installing systemd services..."

    rsync -a "$ROOT_DIR/systemd/" "$MOUNT_POINT/etc/systemd/system/"

    safe_chroot "$MOUNT_POINT" systemctl daemon-reload

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

        safe_chroot "$MOUNT_POINT" update-alternatives --set plymouth.plymouthd \
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

    if [ -z "${TARGET_DEVICE:-}" ] && [ -n "${TARGET_DEV:-}" ]; then
        losetup -d "$TARGET_DEV" 2>/dev/null || true
    fi

    rmdir "$MOUNT_POINT" 2>/dev/null || true
}

# ── Print plan (for --dry-run) ──────────────
print_plan() {
    log "═══════════════════════════════════════"
    log "  Plan"
    log "═══════════════════════════════════════"
    if [ -n "$TARGET_DEVICE" ]; then
        local dev_info
        dev_info=$(lsblk -ndo SIZE,MODEL "$TARGET_DEVICE" 2>/dev/null || echo "unknown")
        log "  Target device: $TARGET_DEVICE ($dev_info)"
    else
        log "  Image: dist/$IMAGE_NAME (${IMAGE_SIZE})"
    fi

    if [ "$UPDATE_MODE" = true ]; then
        log "  Mode: Update — preserve OS, update Vestara code only"
        log "  Steps: mount → deploy → services → plymouth"
    else
        log "  Mode: Full build"
        log "  Steps: partition → format → debootstrap → configure →"
        log "         user → packages (parallel) → deploy → services → plymouth"
    fi

    if [ "$DRY_RUN" = true ]; then
        log "  DRY RUN — no changes will be made"
    fi
    echo >&2
}

# ── Main ─────────────────────────────────────

usage() {
    echo "Usage: $0 [--device /dev/sdX] [--update] [--size N] [--mirror URL] [--dry-run]"
    echo
    echo "  --device /dev/sdX   Install directly to a portable hard drive"
    echo "                      (default: create a disk image in dist/)"
    echo "  --update            Update Vestara code only — skips debootstrap,"
    echo "                      system config, and package installation."
    echo "                      Requires --device with a prior Vestara install."
    echo "  --size N            Image size (default: 20G, e.g. --size 40G)"
    echo "                      Only applies to image mode (no --device)."
    echo "  --mirror URL        Debian mirror for debootstrap"
    echo "                      (default: http://deb.debian.org/debian)"
    echo "  --dry-run           Print the plan without making changes"
    exit 0
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --device)
                if [[ -z "${2:-}" ]]; then error "--device requires a device path"; fi
                TARGET_DEVICE="$2"
                shift 2
                ;;
            --update) UPDATE_MODE=true; shift ;;
            --size)
                if [[ -z "${2:-}" ]]; then error "--size requires a value (e.g. 40G)"; fi
                IMAGE_SIZE="$2"
                shift 2
                ;;
            --mirror)
                if [[ -z "${2:-}" ]]; then error "--mirror requires a URL"; fi
                DEBIAN_MIRROR="$2"
                shift 2
                ;;
            --dry-run) DRY_RUN=true; shift ;;
            -h|--help) usage ;;
            *) error "Unknown option: $1 (use --help for usage)" ;;
        esac
    done

    if [ "$UPDATE_MODE" = true ] && [ -z "$TARGET_DEVICE" ]; then
        error "--update requires --device /dev/sdX"
    fi

    if [ -n "$TARGET_DEVICE" ] && [ "$IMAGE_SIZE" != "20G" ]; then
        warn "--size is ignored when installing directly to a device"
    fi

    # Root required for actual operations; dry-run skips it
    if [ "$DRY_RUN" != true ]; then
        check_root
    fi

    # Optionally log to file
    if [ -n "$BUILD_LOG" ]; then
        mkdir -p "$(dirname "$BUILD_LOG")" 2>/dev/null || true
        exec > >(tee -a "$BUILD_LOG") 2>&1
        log "Build log: $BUILD_LOG"
    fi

    print_plan
    if [ "$DRY_RUN" = true ]; then
        log "Dry run — no changes made"
        exit 0
    fi

    log "═══════════════════════════════════════"
    if [ "$UPDATE_MODE" = true ]; then
        log "  Vestara AI OS — Update Mode"
    else
        log "  Vestara AI OS — Build Script"
    fi
    log "═══════════════════════════════════════"
    echo

    check_deps

    if [ "$UPDATE_MODE" = true ]; then
        log "Updating Vestara code on $TARGET_DEVICE..."
        TARGET_DEV=$(mount_existing)
        deploy_vestara
        install_services
        install_plymouth
    else
        TARGET_DEV=$(prepare_device)
        install_debian "$TARGET_DEV"
        configure_system
        create_user

        # Parallel package installs (independent of each other)
        check_network
        local pids=()
        install_nodejs   & pids+=($!)
        install_docker   & pids+=($!)
        install_ollama   & pids+=($!)
        install_opencode & pids+=($!)
        for pid in "${pids[@]}"; do
            wait "$pid" || error "Package installation failed (pid $pid)"
        done

        install_chromium
        deploy_vestara
        install_services
        install_plymouth
        verify_build "$TARGET_DEV"
    fi

    cleanup

    echo
    log "═══════════════════════════════════════"
    log "  Build complete!"
    if [ "$UPDATE_MODE" = true ]; then
        log "  Mode: Update — OS packages preserved"
        log "  Target: $TARGET_DEVICE"
        log "  Next: boot from this drive or rsync as needed"
    elif [ -n "$TARGET_DEVICE" ]; then
        log "  Target: $TARGET_DEVICE"
        echo >&2
        log "  ── Next steps ──"
        log "  1. Safely eject:  sudo udisksctl power-off -b $TARGET_DEVICE"
        log "  2. Connect to target computer and boot from this drive"
        log "  3. Login as 'ai' (auto-login, no password)"
        log "  4. Dashboard: http://localhost:3000"
        log "  5. Quick update: sudo ./scripts/build-ssd.sh --device $TARGET_DEVICE --update"
    else
        log "  Image: $(realpath "$ROOT_DIR/dist/$IMAGE_NAME" 2>/dev/null || echo "dist/$IMAGE_NAME")"
        echo >&2
        log "  ── Next steps ──"
        log "  1. Flash to SSD:"
        log "     sudo dd if=dist/$IMAGE_NAME of=/dev/sdX bs=4M status=progress"
        log "  2. Or write to USB:"
        log "     sudo dd if=dist/$IMAGE_NAME of=/dev/sdX bs=4M status=progress"
        log "  3. Boot from the drive on target hardware"
    fi
    log "═══════════════════════════════════════"
}

trap cleanup EXIT
main "$@"

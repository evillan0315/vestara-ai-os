#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Installer Script
# Runs during live boot to install Vestara
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

VESTARA_USER="ai"
VESTARA_HOME="/home/$VESTARA_USER"

# ── Banner ────────────────────────────────────

show_banner() {
    clear
    echo -e "${CYAN}"
    cat << 'EOF'

    __      __  _____   __  __
    \ \    / / |  ___| |  \/  |
     \ \  / /  | |_    | \  / |
      \ \/ /   |  _|   | |\/| |
       \  /    | |     | |  | |
        \/     |_|     |_|  |_|

    AI Operating System Installer
    ─────────────────────────────
EOF
    echo -e "${NC}"
}

# ── Select disk ──────────────────────────────

select_disk() {
    echo -e "${BLUE}Available disks:${NC}"
    echo

    local disks=()
    local i=1

    for disk in /dev/sd? /dev/nvme?n?; do
        if [ -b "$disk" ]; then
            local size=$(lsblk -d -o SIZE "$disk" 2>/dev/null | tail -1 | xargs)
            local name=$(lsblk -d -o MODEL "$disk" 2>/dev/null | tail -1 | xargs)
            echo -e "  ${GREEN}$i)${NC} $disk — $size ${name:+($name)}"
            disks+=("$disk")
            i=$((i + 1))
        fi
    done

    echo
    read -p "Select disk (1-${#disks[@]}): " choice

    if [ "$choice" -lt 1 ] || [ "$choice" -gt "${#disks[@]}" ]; then
        echo -e "${RED}Invalid selection${NC}"
        select_disk
        return
    fi

    SELECTED_DISK="${disks[$((choice - 1))]}"
    echo -e "\nSelected: ${GREEN}$SELECTED_DISK${NC}"
}

# ── Confirm installation ─────────────────────

confirm_install() {
    echo
    echo -e "${YELLOW}WARNING: This will erase all data on $SELECTED_DISK${NC}"
    echo
    read -p "Type 'INSTALL' to confirm: " confirm

    if [ "$confirm" != "INSTALL" ]; then
        echo -e "${RED}Installation cancelled${NC}"
        exit 1
    fi
}

# ── Partition disk ───────────────────────────

partition_disk() {
    echo -e "${BLUE}Partitioning $SELECTED_DISK...${NC}"

    # Create GPT partition table
    parted -s "$SELECTED_DISK" mklabel gpt

    # Create partitions
    parted -s "$SELECTED_DISK" \
        mkpart primary fat32 1MiB 513MiB \
        mkpart primary ext4 513MiB 2565MiB \
        mkpart primary ext4 2565MiB 100% \
        set 1 esp on

    # Wait for partitions
    partprobe "$SELECTED_DISK"
    sleep 2

    # Determine partition names
    if [[ "$SELECTED_DISK" == *"nvme"* ]]; then
        PART1="${SELECTED_DISK}p1"
        PART2="${SELECTED_DISK}p2"
        PART3="${SELECTED_DISK}p3"
    else
        PART1="${SELECTED_DISK}1"
        PART2="${SELECTED_DISK}2"
        PART3="${SELECTED_DISK}3"
    fi

    echo -e "${GREEN}Partitions created${NC}"
}

# ── Format partitions ────────────────────────

format_partitions() {
    echo -e "${BLUE}Formatting partitions...${NC}"

    mkfs.vfat -F32 -n "EFI" "$PART1"
    mkfs.ext4 -L "boot" "$PART2"
    mkfs.ext4 -L "vestara" "$PART3"

    echo -e "${GREEN}Partitions formatted${NC}"
}

# ── Install system ───────────────────────────

install_system() {
    echo -e "${BLUE}Installing Vestara AI OS...${NC}"

    # Mount partitions
    mkdir -p /mnt/vestara
    mount "$PART3" /mnt/vestara
    mkdir -p /mnt/vestara/boot
    mount "$PART2" /mnt/vestara/boot
    mkdir -p /mnt/vestara/boot/efi
    mount "$PART1" /mnt/vestara/boot/efi

    # Install Debian minimal
    debootstrap --arch=amd64 --variant=minbase \
        --include=systemd,systemd-sysv,dbus,locales,sudo,curl,wget,ca-certificates,gnupg \
        trixie /mnt/vestara http://deb.debian.org/debian

    # Copy live system
    cp -a /usr/lib/vestara /mnt/vestara/usr/lib/vestara

    # Configure fstab
    local efi_uuid=$(blkid -s UUID -o value "$PART1")
    local boot_uuid=$(blkid -s UUID -o value "$PART2")
    local root_uuid=$(blkid -s UUID -o value "$PART3")

    cat > /mnt/vestara/etc/fstab << EOF
UUID=$efi    /boot/efi  vfat  umask=0077  0  1
UUID=$boot   /boot      ext4  errors=remount-ro  0  2
UUID=$root   /          ext4  errors=remount-ro  0  1
EOF

    echo -e "${GREEN}System installed${NC}"
}

# ── Configure system ─────────────────────────

configure_system() {
    echo -e "${BLUE}Configuring system...${NC}"

    chroot /mnt/vestara bash -c '
        # Hostname
        echo "vestara" > /etc/hostname

        # Locale
        echo "en_US.UTF-8 UTF-8" > /etc/locale.gen
        locale-gen

        # Timezone
        ln -sf /usr/share/zoneinfo/UTC /etc/localtime

        # Create user
        useradd -m -s /bin/bash -G sudo ai
        echo "ai:vestara" | chpasswd
        echo "ai ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/ai

        # Auto-login
        mkdir -p /etc/systemd/system/getty@tty1.service.d
        cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ai --noclear %I \$TERM
EOF

        # Enable services
        systemctl enable vestara.target
        systemctl enable vestara-api.service
        systemctl enable vestara-dashboard.service

        # Install GRUB
        apt-get update
        apt-get install -y grub-efi-amd64
        grub-install --efi-directory=/boot/efi --bootloader-id=vestara
        update-grub
    '

    echo -e "${GREEN}System configured${NC}"
}

# ── Cleanup ──────────────────────────────────

cleanup() {
    echo -e "${BLUE}Cleaning up...${NC}"

    umount /mnt/vestara/boot/efi 2>/dev/null || true
    umount /mnt/vestara/boot 2>/dev/null || true
    umount /mnt/vestara 2>/dev/null || true
}

# ── Complete ─────────────────────────────────

show_complete() {
    echo
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Installation complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "  ${YELLOW}Next steps:${NC}"
    echo -e "    1. Remove the installation media"
    echo -e "    2. Reboot the system"
    echo -e "    3. Login with: ai / vestara"
    echo
    echo -e "  ${CYAN}Dashboard:${NC} http://localhost:5173"
    echo -e "  ${CYAN}CLI:${NC} vestara status"
    echo
    read -p "Press Enter to reboot..."
    reboot
}

# ── Main ─────────────────────────────────────

main() {
    show_banner
    select_disk
    confirm_install
    partition_disk
    format_partitions
    install_system
    configure_system
    cleanup
    show_complete
}

trap cleanup EXIT
main "$@"

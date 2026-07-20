#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Recovery Tools
# Boot repair, factory reset, backup/restore
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

VESTARA_HOME="/home/ai/vestara"

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

    Recovery Tools
    ──────────────
EOF
    echo -e "${NC}"
}

# ── Menu ──────────────────────────────────────

show_menu() {
    echo -e "${BLUE}Recovery Options:${NC}"
    echo
    echo -e "  ${GREEN}1)${NC} Boot Repair"
    echo -e "  ${GREEN}2)${NC} Factory Reset"
    echo -e "  ${GREEN}3)${NC} Backup Data"
    echo -e "  ${GREEN}4)${NC} Restore Data"
    echo -e "  ${GREEN}5)${NC} Reset Password"
    echo -e "  ${GREEN}6)${NC} Check Filesystem"
    echo -e "  ${GREEN}7)${NC} View Logs"
    echo -e "  ${GREEN}0)${NC} Reboot"
    echo
    read -p "Select option: " choice
}

# ── Boot Repair ──────────────────────────────

repair_boot() {
    echo -e "${BLUE}Repairing boot...${NC}"

    # Find root partition
    local root_dev=$(findmnt -n -o SOURCE /)
    local boot_dev=$(findmnt -n -o SOURCE /boot)
    local efi_dev=$(findmnt -n -o SOURCE /boot/efi)

    # Reinstall GRUB
    if [ -n "$efi_dev" ]; then
        echo -e "Reinstalling GRUB to $efi_dev..."
        grub-install --efi-directory=/boot/efi --bootloader-id=vestara
    fi

    # Update GRUB config
    echo -e "Updating GRUB configuration..."
    update-grub

    # Rebuild initramfs
    echo -e "Rebuilding initramfs..."
    update-initramfs -u

    echo -e "${GREEN}Boot repair complete${NC}"
    read -p "Press Enter to continue..."
}

# ── Factory Reset ────────────────────────────

factory_reset() {
    echo -e "${YELLOW}WARNING: This will reset all data to factory defaults${NC}"
    echo -e "${YELLOW}All your data, settings, and memories will be lost${NC}"
    echo
    read -p "Type 'RESET' to confirm: " confirm

    if [ "$confirm" != "RESET" ]; then
        echo -e "${RED}Reset cancelled${NC}"
        return
    fi

    echo -e "${BLUE}Performing factory reset...${NC}"

    # Stop services
    systemctl stop vestara-api.service 2>/dev/null || true
    systemctl stop vestara-dashboard.service 2>/dev/null || true

    # Remove user data
    rm -rf "$VESTARA_HOME/data"
    rm -rf "$VESTARA_HOME/config"
    rm -rf "$VESTARA_HOME/knowledge"
    rm -rf "$VESTARA_HOME/memory"
    rm -rf "$VESTARA_HOME/projects"

    # Recreate directories
    mkdir -p "$VESTARA_HOME"/{data,config,knowledge,memory,projects}
    chown -R ai:ai "$VESTARA_HOME"

    # Reset database
    if [ -f "/usr/lib/vestara/services/core/schema.sql" ]; then
        sqlite3 "$VESTARA_HOME/data/vestara.db" < /usr/lib/vestara/services/core/schema.sql
        chown ai:ai "$VESTARA_HOME/data/vestara.db"
    fi

    # Restart services
    systemctl start vestara-api.service
    systemctl start vestara-dashboard.service

    echo -e "${GREEN}Factory reset complete${NC}"
    read -p "Press Enter to continue..."
}

# ── Backup Data ──────────────────────────────

backup_data() {
    echo -e "${BLUE}Backing up data...${NC}"

    local backup_dir="/home/ai/vestara-backups"
    local backup_name="vestara-backup-$(date +%Y%m%d-%H%M%S)"

    mkdir -p "$backup_dir"

    # Backup database
    if [ -f "$VESTARA_HOME/data/vestara.db" ]; then
        cp "$VESTARA_HOME/data/vestara.db" "$backup_dir/$backup_name.db"
        echo -e "  Database backed up"
    fi

    # Backup config
    if [ -d "$VESTARA_HOME/config" ]; then
        tar -czf "$backup_dir/$backup_name-config.tar.gz" -C "$VESTARA_HOME" config
        echo -e "  Config backed up"
    fi

    # Backup knowledge
    if [ -d "$VESTARA_HOME/knowledge" ]; then
        tar -czf "$backup_dir/$backup_name-knowledge.tar.gz" -C "$VESTARA_HOME" knowledge
        echo -e "  Knowledge backed up"
    fi

    # Backup memory
    if [ -d "$VESTARA_HOME/memory" ]; then
        tar -czf "$backup_dir/$backup_name-memory.tar.gz" -C "$VESTARA_HOME" memory
        echo -e "  Memory backed up"
    fi

    echo -e "${GREEN}Backup complete: $backup_dir/$backup_name*${NC}"
    read -p "Press Enter to continue..."
}

# ── Restore Data ─────────────────────────────

restore_data() {
    local backup_dir="/home/ai/vestara-backups"

    echo -e "${BLUE}Available backups:${NC}"
    ls -lh "$backup_dir"/vestara-backup-*.db 2>/dev/null | awk '{print NR") "$NF}'
    echo

    read -p "Select backup number: " num
    local backup_file=$(ls "$backup_dir"/vestara-backup-*.db 2>/dev/null | sed -n "${num}p")

    if [ -z "$backup_file" ]; then
        echo -e "${RED}Invalid selection${NC}"
        return
    fi

    local backup_name=$(basename "$backup_file" .db)
    echo -e "${BLUE}Restoring from $backup_name...${NC}"

    # Stop services
    systemctl stop vestara-api.service 2>/dev/null || true
    systemctl stop vestara-dashboard.service 2>/dev/null || true

    # Restore database
    cp "$backup_file" "$VESTARA_HOME/data/vestara.db"
    echo -e "  Database restored"

    # Restore config
    if [ -f "$backup_dir/$backup_name-config.tar.gz" ]; then
        tar -xzf "$backup_dir/$backup_name-config.tar.gz" -C "$VESTARA_HOME"
        echo -e "  Config restored"
    fi

    # Restore knowledge
    if [ -f "$backup_dir/$backup_name-knowledge.tar.gz" ]; then
        tar -xzf "$backup_dir/$backup_name-knowledge.tar.gz" -C "$VESTARA_HOME"
        echo -e "  Knowledge restored"
    fi

    # Restore memory
    if [ -f "$backup_dir/$backup_name-memory.tar.gz" ]; then
        tar -xzf "$backup_dir/$backup_name-memory.tar.gz" -C "$VESTARA_HOME"
        echo -e "  Memory restored"
    fi

    chown -R ai:ai "$VESTARA_HOME"

    # Restart services
    systemctl start vestara-api.service
    systemctl start vestara-dashboard.service

    echo -e "${GREEN}Restore complete${NC}"
    read -p "Press Enter to continue..."
}

# ── Reset Password ───────────────────────────

reset_password() {
    echo -e "${BLUE}Resetting password for ai user...${NC}"
    passwd ai
    echo -e "${GREEN}Password reset complete${NC}"
    read -p "Press Enter to continue..."
}

# ── Check Filesystem ─────────────────────────

check_filesystem() {
    echo -e "${BLUE}Checking filesystem...${NC}"

    # Check root partition
    echo -e "Checking / ..."
    fsck -y / 2>/dev/null || true

    # Check boot partition
    if [ -d /boot ]; then
        echo -e "Checking /boot ..."
        fsck -y /boot 2>/dev/null || true
    fi

    echo -e "${GREEN}Filesystem check complete${NC}"
    read -p "Press Enter to continue..."
}

# ── View Logs ────────────────────────────────

view_logs() {
    echo -e "${BLUE}Select log to view:${NC}"
    echo "  1) vestara-api"
    echo "  2) vestara-dashboard"
    echo "  3) System journal"
    echo
    read -p "Select: " log_choice

    case $log_choice in
        1) journalctl -u vestara-api -n 50 ;;
        2) journalctl -u vestara-dashboard -n 50 ;;
        3) journalctl -n 50 ;;
    esac

    read -p "Press Enter to continue..."
}

# ── Main ─────────────────────────────────────

main() {
    while true; do
        show_banner
        show_menu

        case $choice in
            1) repair_boot ;;
            2) factory_reset ;;
            3) backup_data ;;
            4) restore_data ;;
            5) reset_password ;;
            6) check_filesystem ;;
            7) view_logs ;;
            0) reboot ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac
    done
}

main "$@"

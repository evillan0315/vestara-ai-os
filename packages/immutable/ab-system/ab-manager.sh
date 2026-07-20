#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — A/B Partition Manager
# Manages A/B system partitions for atomic updates
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[AB]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────

STATE_FILE="/var/lib/vestara/ab-state.json"
BOOT_PART="/dev/disk/by-label/BOOT"
ROOT_A="/dev/disk/by-label/VESTARA_A"
ROOT_B="/dev/disk/by-label/VESTARA_B"

# ── Get current slot ─────────────────────────

get_current_slot() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE" | grep -o '"current_slot":"[^"]*"' | cut -d'"' -f4
    else
        # Detect from mounted root
        local root_dev=$(findmnt -n -o SOURCE /)
        if [[ "$root_dev" == *"VESTARA_A"* ]]; then
            echo "a"
        else
            echo "b"
        fi
    fi
}

# ── Get opposite slot ────────────────────────

get_next_slot() {
    local current=$(get_current_slot)
    if [ "$current" = "a" ]; then
        echo "b"
    else
        echo "a"
    fi
}

# ── Get partition for slot ───────────────────

get_slot_partition() {
    local slot="$1"
    if [ "$slot" = "a" ]; then
        echo "$ROOT_A"
    else
        echo "$ROOT_B"
    fi
}

# ── Initialize state ─────────────────────────

init_state() {
    mkdir -p "$(dirname "$STATE_FILE")"

    local current_slot=$(get_current_slot)

    cat > "$STATE_FILE" << EOF
{
    "current_slot": "$current_slot",
    "next_slot": "$(get_next_slot)",
    "boot_count": 0,
    "max_boot_count": 3,
    "last_update": null,
    "rollback_available": false
}
EOF

    log "State initialized: slot $current_slot"
}

# ── Read state ────────────────────────────────

read_state() {
    if [ ! -f "$STATE_FILE" ]; then
        init_state
    fi
    cat "$STATE_FILE"
}

# ── Update state ─────────────────────────────

update_state() {
    local key="$1"
    local value="$2"

    local state=$(read_state)
    echo "$state" | sed "s/\"$key\":\"[^\"]*\"/\"$key\":\"$value\"/" > "$STATE_FILE"
}

# ── Mark boot attempt ────────────────────────

mark_boot_attempt() {
    local state=$(read_state)
    local boot_count=$(echo "$state" | grep -o '"boot_count":[0-9]*' | cut -d':' -f2)
    local max_boot=$(echo "$state" | grep -o '"max_boot_count":[0-9]*' | cut -d':' -f2)

    boot_count=$((boot_count + 1))

    if [ "$boot_count" -ge "$max_boot" ]; then
        warn "Max boot attempts reached, triggering rollback"
        rollback
        return
    fi

    update_state "boot_count" "$boot_count"
    log "Boot attempt $boot_count/$max_boot"
}

# ── Mark boot successful ────────────────────

mark_boot_success() {
    update_state "boot_count" "0"
    log "Boot successful"
}

# ── Prepare update ───────────────────────────

prepare_update() {
    local next_slot=$(get_next_slot)
    local next_part=$(get_slot_partition "$next_slot")

    log "Preparing update for slot $next_slot..."

    # Mount next partition
    local mount_point="/tmp/vestara-update"
    mkdir -p "$mount_point"
    mount "$next_part" "$mount_point"

    echo "$mount_point"
}

# ── Commit update ────────────────────────────

commit_update() {
    local mount_point="$1"
    local next_slot=$(get_next_slot)

    log "Committing update to slot $next_slot..."

    # Unmount
    umount "$mount_point"
    rmdir "$mount_point"

    # Update state
    update_state "next_slot" "$next_slot"
    update_state "rollback_available" "true"
    update_state "last_update" "$(date -Iseconds)"

    log "Update committed. Reboot to activate."
}

# ── Switch slot ──────────────────────────────

switch_slot() {
    local current=$(get_current_slot)
    local next=$(get_next_slot)

    log "Switching from slot $current to slot $next..."

    # Update boot configuration
    local next_part=$(get_slot_partition "$next")

    # Update GRUB
    grub-set-default 0 2>/dev/null || true

    # Update state
    update_state "current_slot" "$next"
    update_state "next_slot" "$current"
    update_state "boot_count" "0"

    log "Slot switched to $next"
}

# ── Rollback ─────────────────────────────────

rollback() {
    local state=$(read_state)
    local rollback_available=$(echo "$state" | grep -o '"rollback_available":true' || true)

    if [ -z "$rollback_available" ]; then
        error "No rollback available"
    fi

    local current=$(get_current_slot)
    local previous=$(get_next_slot)

    log "Rolling back from slot $current to slot $previous..."

    switch_slot

    log "Rollback complete. Rebooting..."
    reboot
}

# ── Show status ──────────────────────────────

show_status() {
    local state=$(read_state)
    local current=$(get_current_slot)
    local next=$(get_next_slot)
    local boot_count=$(echo "$state" | grep -o '"boot_count":[0-9]*' | cut -d':' -f2)
    local max_boot=$(echo "$state" | grep -o '"max_boot_count":[0-9]*' | cut -d':' -f2)
    local last_update=$(echo "$state" | grep -o '"last_update":"[^"]*"' | cut -d'"' -f4)

    echo
    echo -e "${BLUE}A/B System Status${NC}"
    echo
    echo -e "  Current slot:    ${GREEN}$current${NC}"
    echo -e "  Next slot:       ${YELLOW}$next${NC}"
    echo -e "  Boot attempts:   $boot_count / $max_boot"
    echo -e "  Last update:     ${last_update:-Never}"
    echo -e "  Rollback ready:  $(echo "$state" | grep -q '"rollback_available":true' && echo -e "${GREEN}Yes${NC}" || echo -e "${RED}No${NC}")"
    echo
}

# ── Main ─────────────────────────────────────

usage() {
    echo "Usage: $0 {status|init|prepare|commit|switch|rollback|mark-boot|mark-success}"
    exit 1
}

main() {
    local cmd="${1:-}"

    case "$cmd" in
        status)
            show_status
            ;;
        init)
            init_state
            ;;
        prepare)
            prepare_update
            ;;
        commit)
            commit_update "${2:-}"
            ;;
        switch)
            switch_slot
            ;;
        rollback)
            rollback
            ;;
        mark-boot)
            mark_boot_attempt
            ;;
        mark-success)
            mark_boot_success
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"

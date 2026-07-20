#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Rollback Manager
# Handles automatic and manual rollback
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[ROLLBACK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────

STATE_FILE="/var/lib/vestara/ab-state.json"
ROLLBACK_LOG="/var/log/vestara/rollback.log"

# ── Check if rollback is needed ──────────────

check_rollback_needed() {
    if [ ! -f "$STATE_FILE" ]; then
        return 1
    fi

    local boot_count=$(cat "$STATE_FILE" | grep -o '"boot_count":[0-9]*' | cut -d':' -f2)
    local max_boot=$(cat "$STATE_FILE" | grep -o '"max_boot_count":[0-9]*' | cut -d':' -f2)

    if [ "${boot_count:-0}" -ge "${max_boot:-3}" ]; then
        return 0
    fi

    return 1
}

# ── Perform rollback ─────────────────────────

perform_rollback() {
    log "Performing automatic rollback..."

    # Log rollback
    mkdir -p "$(dirname "$ROLLBACK_LOG")"
    echo "$(date -Iseconds) — Automatic rollback triggered" >> "$ROLLBACK_LOG"

    # Get current and previous slots
    local current_slot=$(cat "$STATE_FILE" | grep -o '"current_slot":"[^"]*"' | cut -d'"' -f4)
    local previous_slot="a"
    if [ "$current_slot" = "a" ]; then
        previous_slot="b"
    fi

    log "Rolling back from slot $current_slot to slot $previous_slot..."

    # Update GRUB to boot from previous slot
    if [ -f /boot/grub/grub.cfg ]; then
        # Update default boot entry
        sed -i "s/set default=.*/set default=$([ "$previous_slot" = "a" ] && echo 0 || echo 1)/" \
            /boot/grub/grub.cfg
    fi

    # Update state file
    cat > "$STATE_FILE" << EOF
{
    "current_slot": "$previous_slot",
    "next_slot": "$current_slot",
    "boot_count": 0,
    "max_boot_count": 3,
    "last_update": "$(date -Iseconds)",
    "rollback_available": false,
    "last_rollback": "$(date -Iseconds)"
}
EOF

    log "Rollback complete. Rebooting..."
    reboot
}

# ── Manual rollback ──────────────────────────

manual_rollback() {
    log "Performing manual rollback..."

    # Check if rollback is available
    if ! [ -f "$STATE_FILE" ]; then
        error "No state file found. Cannot rollback."
    fi

    local rollback_available=$(cat "$STATE_FILE" | grep -o '"rollback_available":true' || true)
    if [ -z "$rollback_available" ]; then
        error "No rollback available. System is at initial state."
    fi

    # Log rollback
    mkdir -p "$(dirname "$ROLLBACK_LOG")"
    echo "$(date -Iseconds) — Manual rollback requested" >> "$ROLLBACK_LOG"

    # Get current slot
    local current_slot=$(cat "$STATE_FILE" | grep -o '"current_slot":"[^"]*"' | cut -d'"' -f4)
    local previous_slot="a"
    if [ "$current_slot" = "a" ]; then
        previous_slot="b"
    fi

    echo -e "${YELLOW}Current slot: $current_slot${NC}"
    echo -e "${YELLOW}Rollback to:  $previous_slot${NC}"
    echo
    read -p "Confirm rollback? (y/N): " confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "Rollback cancelled"
        return
    fi

    # Update GRUB
    if [ -f /boot/grub/grub.cfg ]; then
        sed -i "s/set default=.*/set default=$([ "$previous_slot" = "a" ] && echo 0 || echo 1)/" \
            /boot/grub/grub.cfg
    fi

    # Update state
    cat > "$STATE_FILE" << EOF
{
    "current_slot": "$previous_slot",
    "next_slot": "$current_slot",
    "boot_count": 0,
    "max_boot_count": 3,
    "last_update": "$(date -Iseconds)",
    "rollback_available": false,
    "last_rollback": "$(date -Iseconds)"
}
EOF

    log "Rollback complete. Reboot to activate."
}

# ── Show rollback status ─────────────────────

show_status() {
    if [ ! -f "$STATE_FILE" ]; then
        echo -e "${YELLOW}No state file found${NC}"
        return
    fi

    local current_slot=$(cat "$STATE_FILE" | grep -o '"current_slot":"[^"]*"' | cut -d'"' -f4)
    local boot_count=$(cat "$STATE_FILE" | grep -o '"boot_count":[0-9]*' | cut -d':' -f2)
    local max_boot=$(cat "$STATE_FILE" | grep -o '"max_boot_count":[0-9]*' | cut -d':' -f2)
    local rollback_available=$(cat "$STATE_FILE" | grep -o '"rollback_available":true' || true)
    local last_rollback=$(cat "$STATE_FILE" | grep -o '"last_rollback":"[^"]*"' | cut -d'"' -f4)

    echo
    echo -e "${BLUE}Rollback Status${NC}"
    echo
    echo -e "  Current slot:      ${GREEN}$current_slot${NC}"
    echo -e "  Boot attempts:     ${boot_count:-0} / ${max_boot:-3}"
    echo -e "  Rollback ready:    $([ -n "$rollback_available" ] && echo -e "${GREEN}Yes${NC}" || echo -e "${RED}No${NC}")"
    echo -e "  Last rollback:     ${last_rollback:-Never}"
    echo

    # Show rollback log if exists
    if [ -f "$ROLLBACK_LOG" ]; then
        echo -e "${BLUE}Recent Rollbacks:${NC}"
        tail -5 "$ROLLBACK_LOG"
        echo
    fi
}

# ── Reset rollback state ─────────────────────

reset_state() {
    log "Resetting rollback state..."

    cat > "$STATE_FILE" << EOF
{
    "current_slot": "a",
    "next_slot": "b",
    "boot_count": 0,
    "max_boot_count": 3,
    "last_update": null,
    "rollback_available": false
}
EOF

    log "State reset"
}

# ── Main ─────────────────────────────────────

usage() {
    echo "Usage: $0 {status|rollback|auto-check|reset}"
    exit 1
}

main() {
    local cmd="${1:-}"

    case "$cmd" in
        status)
            show_status
            ;;
        rollback)
            manual_rollback
            ;;
        auto-check)
            if check_rollback_needed; then
                perform_rollback
            fi
            ;;
        reset)
            reset_state
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"

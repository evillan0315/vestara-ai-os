#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — Secure Boot Manager
# Handles Secure Boot signing and verification
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[SECURE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────

KEY_DIR="/var/lib/vestara/secureboot"
BOOT_KEY="$KEY_DIR/MOK.key"
BOOT_CERT="$KEY_DIR/MOK.pem"
BOOT_DER="$KEY_DIR/MOK.der"

# ── Check Secure Boot status ─────────────────

check_status() {
    log "Checking Secure Boot status..."

    if [ -d /sys/firmware/efi ]; then
        local sb_state=$(mokutil --sb-state 2>/dev/null || echo "Unknown")
        echo -e "  Secure Boot: ${BLUE}$sb_state${NC}"
    else
        echo -e "  ${YELLOW}Legacy BIOS mode (Secure Boot not available)${NC}"
    fi

    # Check if MOK is enrolled
    if mokutil --list-keys 2>/dev/null | grep -q "Vestara"; then
        echo -e "  MOK Key:     ${GREEN}Enrolled${NC}"
    else
        echo -e "  MOK Key:     ${RED}Not enrolled${NC}"
    fi
}

# ── Generate signing key ─────────────────────

generate_key() {
    log "Generating Secure Boot signing key..."

    mkdir -p "$KEY_DIR"

    # Generate private key
    openssl req -new -x509 \
        -newkey rsa:2048 \
        -keyout "$BOOT_KEY" \
        -out "$BOOT_CERT" \
        -days 3650 \
        -nodes \
        -subj "/CN=Vestara AI OS Secure Boot Key"

    # Convert to DER format
    openssl x509 -in "$BOOT_CERT" -out "$BOOT_DER" -outform DER

    chmod 600 "$BOOT_KEY"
    chmod 644 "$BOOT_CERT" "$BOOT_DER"

    log "Signing key generated"
    echo -e "  Key:  $BOOT_KEY"
    echo -e "  Cert: $BOOT_CERT"
}

# ── Enroll MOK ───────────────────────────────

enroll_mok() {
    log "Enrolling MOK key..."

    if ! [ -f "$BOOT_DER" ]; then
        generate_key
    fi

    # Import key
    mokutil --import "$BOOT_DER"

    echo
    echo -e "${YELLOW}A one-time password will be required on next boot.${NC}"
    echo -e "${YELLOW}Follow the MOK Manager prompts to complete enrollment.${NC}"
    echo
}

# ── Sign boot files ──────────────────────────

sign_boot_files() {
    log "Signing boot files..."

    if ! [ -f "$BOOT_KEY" ] || ! [ -f "$BOOT_CERT" ]; then
        error "Signing key not found. Run: $0 generate"
    fi

    # Sign kernel
    local kernel="/boot/vmlinuz-$(uname -r)"
    if [ -f "$kernel" ]; then
        sbsign --key "$BOOT_KEY" --cert "$BOOT_CERT" \
            --output "${kernel}.signed" "$kernel"
        mv "${kernel}.signed" "$kernel"
        log "Kernel signed"
    fi

    # Sign GRUB
    local grub="/boot/efi/EFI/vestara/grubx64.efi"
    if [ -f "$grub" ]; then
        sbsign --key "$BOOT_KEY" --cert "$BOOT_CERT" \
            --output "${grub}.signed" "$grub"
        mv "${grub}.signed" "$grub"
        log "GRUB signed"
    fi

    log "All boot files signed"
}

# ── Verify signatures ───────────────────────

verify_signatures() {
    log "Verifying boot file signatures..."

    local errors=0

    # Verify kernel
    local kernel="/boot/vmlinuz-$(uname -r)"
    if [ -f "$kernel" ]; then
        if sbverify --cert "$BOOT_CERT" "$kernel" 2>/dev/null; then
            echo -e "  Kernel: ${GREEN}Valid${NC}"
        else
            echo -e "  Kernel: ${RED}Invalid${NC}"
            errors=$((errors + 1))
        fi
    fi

    # Verify GRUB
    local grub="/boot/efi/EFI/vestara/grubx64.efi"
    if [ -f "$grub" ]; then
        if sbverify --cert "$BOOT_CERT" "$grub" 2>/dev/null; then
            echo -e "  GRUB:   ${GREEN}Valid${NC}"
        else
            echo -e "  GRUB:   ${RED}Invalid${NC}"
            errors=$((errors + 1))
        fi
    fi

    if [ $errors -gt 0 ]; then
        warn "$errors signature verification failures"
        return 1
    fi

    log "All signatures valid"
    return 0
}

# ── Main ─────────────────────────────────────

usage() {
    echo "Usage: $0 {status|generate|enroll|sign|verify}"
    exit 1
}

main() {
    local cmd="${1:-}"

    case "$cmd" in
        status)
            check_status
            ;;
        generate)
            generate_key
            ;;
        enroll)
            enroll_mok
            ;;
        sign)
            sign_boot_files
            ;;
        verify)
            verify_signatures
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"

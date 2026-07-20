#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Vestara AI OS — One-Command Installer
# Installs Vestara on any Debian 13 system
# Usage: curl -sSL https://get.vestara.ai | bash
# ──────────────────────────────────────────────
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[VESTARA]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────

VESTARA_USER="${VESTARA_USER:-ai}"
VESTARA_HOME="/home/$VESTARA_USER"
VESTARA_DIR="$VESTARA_HOME/vestara"
API_PORT="${API_PORT:-3000}"
DASHBOARD_PORT="${DASHBOARD_PORT:-5173}"

# ── Banner ────────────────────────────────────

show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
    __      __  _____   __  __
    \ \    / / |  ___| |  \/  |
     \ \  / /  | |_    | \  / |
      \ \/ /   |  _|   | |\/| |
       \  /    | |     | |  | |
        \/     |_|     |_|  |_|

    AI Operating System Installer
    v0.1.0
EOF
    echo -e "${NC}"
}

# ── Pre-flight checks ────────────────────────

check_system() {
    log "Checking system requirements..."

    # Check if root
    if [ "$EUID" -eq 0 ]; then
        error "Do not run this installer as root"
    fi

    # Check Debian/Ubuntu
    if ! grep -qE "(Debian|Ubuntu)" /etc/os-release 2>/dev/null; then
        warn "This installer is designed for Debian/Ubuntu"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Check architecture
    if [ "$(uname -m)" != "x86_64" ]; then
        error "Vestara requires x86-64 architecture"
    fi

    # Check memory
    local mem_gb=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$mem_gb" -lt 8 ]; then
        warn "Vestara recommends 8GB+ RAM (you have ${mem_gb}GB)"
    fi

    log "System check passed"
}

# ── Install dependencies ─────────────────────

install_deps() {
    log "Installing dependencies..."

    sudo apt-get update
    sudo apt-get install -y \
        curl \
        wget \
        gnupg \
        ca-certificates \
        lsb-release \
        nginx \
        git

    log "Dependencies installed"
}

# ── Install Node.js ──────────────────────────

install_nodejs() {
    log "Installing Node.js 22..."

    if command -v node &>/dev/null; then
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 22 ]; then
            log "Node.js $(node --version) already installed"
            return
        fi
    fi

    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs

    log "Node.js $(node --version) installed"
}

# ── Install Docker ───────────────────────────

install_docker() {
    log "Installing Docker..."

    if command -v docker &>/dev/null; then
        log "Docker already installed"
        return
    fi

    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$VESTARA_USER"

    log "Docker installed"
}

# ── Install Ollama ───────────────────────────

install_ollama() {
    log "Installing Ollama..."

    if command -v ollama &>/dev/null; then
        log "Ollama already installed"
        return
    fi

    curl -fsSL https://ollama.com/install.sh | sudo sh

    log "Ollama installed (starts on-demand)"
}

# ── Install Vestara ──────────────────────────

install_vestara() {
    log "Installing Vestara AI OS..."

    # Add Vestara GPG key
    curl -fsSL https://repo.vestara.ai/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/vestara.gpg

    # Add Vestara repository
    echo "deb [signed-by=/usr/share/keyrings/vestara.gpg] https://repo.vestara.ai stable main" | \
        sudo tee /etc/apt/sources.list.d/vestara.list

    # Update and install
    sudo apt-get update
    sudo apt-get install -y vestara-core vestara-api vestara-dashboard vestara-cli vestara-systemd

    log "Vestara AI OS installed"
}

# ── Configure system ─────────────────────────

configure_system() {
    log "Configuring system..."

    # Create ai user if not exists
    if ! id "$VESTARA_USER" &>/dev/null; then
        sudo useradd -m -s /bin/bash -G sudo "$VESTARA_USER"
        echo "$VESTARA_USER ALL=(ALL) NOPASSWD:ALL" | sudo tee "/etc/sudoers.d/$VESTARA_USER"
    fi

    # Setup Vestara directory
    sudo -u "$VESTARA_USER" mkdir -p "$VESTARA_DIR"/{data,config,knowledge,memory,projects}

    # Enable services
    sudo systemctl enable vestara.target
    sudo systemctl enable vestara-api.service
    sudo systemctl enable nginx

    # Start services
    sudo systemctl start vestara-api.service
    sudo systemctl start nginx

    log "System configured"
}

# ── Post-install ─────────────────────────────

post_install() {
    echo
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Vestara AI OS installed successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "  Dashboard:  ${CYAN}http://localhost${NC}"
    echo -e "  API:        ${CYAN}http://localhost:${API_PORT}${NC}"
    echo -e "  CLI:        ${CYAN}vestara status${NC}"
    echo
    echo -e "  ${YELLOW}Dashboard Pages (13):${NC}"
    echo -e "    Dashboard, AI Chat, OpenCode, Agents, Models"
    echo -e "    Memory, Knowledge, Terminal, Files, Monitor"
    echo -e "    Scripts, Users, Settings"
    echo
    echo -e "  ${YELLOW}Quick start:${NC}"
    echo -e "    vestara status     # Check services"
    echo -e "    vestara chat       # Start AI chat"
    echo -e "    vestara models     # List available models"
    echo
    echo -e "  ${YELLOW}Default AI models (OpenCode free):${NC}"
    echo -e "    opencode/deepseek-v4-flash-free"
    echo -e "    opencode/mimo-v2.5-free"
    echo -e "    opencode/nemotron-3-ultra-free"
    echo -e "    opencode/north-mini-code-free"
    echo -e "    opencode/big-pickle"
    echo
}

# ── Main ─────────────────────────────────────

main() {
    show_banner
    check_system
    install_deps
    install_nodejs
    install_docker
    install_ollama
    install_vestara
    configure_system
    post_install
}

main "$@"

# Vestara AI OS — Boot Experience

> From power-on to desktop. Fast, branded, automatic.

---

## Boot Sequence

```
Power On
    ▼
Portable SSD
    ▼
Tiny Linux (Debian 13 Minimal)
    ▼
Auto Login (ai user)
    ▼
systemd starts vestara.target
    ▼
Vestara API starts
    ▼
Dashboard opens in browser (kiosk mode)
    ▼
AI Platform ready (14 pages)
```

---

## Phase 1: Firmware → Bootloader

**What the user sees:** Nothing branded yet.

- BIOS/UEFI POST
- Boot menu (press F12 / Del)
- Select USB SSD

**Technical:**
- GRUB2 or systemd-boot
- Minimal boot configuration

---

## Phase 2: Kernel → Init

**What the user sees:** Fast text scroll, then auto-login.

- Linux kernel loads
- Init system starts (systemd)
- Minimal services initialize
- Auto-login as `ai` user

**Technical:**
```
# Auto-login configuration
# /etc/systemd/system/getty@tty1.service.d/autologin.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ai --noclear %I $TERM
```

---

## Phase 3: Vestara Services Start

**What the user sees:** Brief splash, then dashboard.

systemd starts `vestara.target`:

```
1. vestara-api.service         (Fastify API server on port 3000)
2. vestara-dashboard.service   (Opens browser in kiosk mode)
```

**Ollama does NOT start automatically.** It launches only when the user selects a local model.

---

## Phase 4: Dashboard Loads

**What the user sees:** Vestara AI OS dashboard with 14 pages.

```
┌──────────────────────────────────────────────────────┐
│ Vestara AI OS          🟢 All Systems Ready          │
├─────────────┬────────────────────────────────────────┤
│             │                                        │
│ Dashboard   │    Welcome Back, Eddie                 │
│             │                                        │
│ AI Chat     │  ┌──────────┐ ┌──────────┐            │
│ OpenCode    │  │ CPU 12%  │ │ RAM 1.2GB│            │
│ Agents      │  └──────────┘ └──────────┘            │
│ Models      │                                        │
│             │  ┌──────────┐ ┌──────────┐            │
│ Memory      │  │ Disk 45% │ │ GPU 0%   │            │
│ Knowledge   │  └──────────┘ └──────────┘            │
│             │                                        │
│ Terminal    │  Quick Actions                         │
│ Files       │  ┌─────┐ ┌─────┐ ┌─────┐              │
│ Monitor     │  │Chat │ │Term │ │Files│              │
│             │  └─────┘ └─────┘ └─────┘              │
│ Scripts     │                                        │
│ Users       │  CPU/Memory Area Charts (recharts)     │
│ Settings    │  ┌─────────────────────────────┐       │
│             │  │  ~~~~ CPU ~~~~  ~~~~ RAM ~~~ │       │
│             │  └─────────────────────────────┘       │
└─────────────┴────────────────────────────────────────┘
```

---

## Startup Program Order

```ini
# /etc/systemd/system/vestara.target
[Unit]
Description=Vestara AI Platform
After=multi-user.target docker.service

[Install]
WantedBy=graphical.target

# Services
Wants=vestara-api.service
Wants=vestara-dashboard.service
```

### Service Definitions

```ini
# vestara-api.service
[Unit]
Description=Vestara API Server
After=network.target

[Service]
Type=simple
User=ai
Group=ai
WorkingDirectory=/home/ai/vestara
ExecStart=/usr/bin/node services/api/dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=vestara.target
```

```ini
# vestara-dashboard.service
[Unit]
Description=Vestara Dashboard
After=vestara-api.service

[Service]
Type=simple
User=ai
ExecStart=/usr/bin/chromium --kiosk --noerrdialogs --disable-infobars http://localhost:3000
Restart=on-failure

[Install]
WantedBy=vestara.target
```

---

## Ollama Management

Ollama is installed but NOT auto-started.

```bash
# Start Ollama (when user selects local model)
systemctl start vestara-ollama

# Stop Ollama (when switching to cloud API)
systemctl stop vestara-ollama
```

**Resource-aware startup:**
- If < 4GB RAM available: Show warning, suggest cloud API
- If 4-6GB RAM: Start with small models only (Phi-4, Qwen3)
- If 6GB+ RAM: Start with any model

---

## Boot Time Targets

| Phase | Target |
|---|---|
| Kernel load | < 5s |
| Init → auto-login | < 3s |
| Services start | < 5s |
| Dashboard load | < 3s |
| **Total power-on to ready** | **< 16s** |

---

## Authentication Flow

```
Boot → Auto Login (ai user)
    ↓
Dashboard loads → GET /api/auth/os-user
    ↓
User not authenticated → Redirect to /login
    ↓
Login page → POST /api/auth/os-login (username + password)
    ↓
Or → POST /api/auth/os-auto-login (no password)
    ↓
JWT token stored in localStorage
    ↓
All API requests include Authorization: Bearer <token>
```

---

## Implementation Priority

| Phase | Priority | Effort |
|---|---|---|
| Auto-login configuration | P0 | 1 hour |
| systemd service files | P0 | 1 day |
| Plymouth boot splash | P1 | 1-2 days |
| Kiosk mode browser | P0 | 1 day |
| Service health checks | P1 | 1 day |
| Boot time optimization | P2 | 2-3 days |

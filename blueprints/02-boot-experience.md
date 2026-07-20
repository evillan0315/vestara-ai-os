# Vestara AI OS — Boot Experience

> From power-on to desktop. Fast, branded, automatic.

---

## Boot Sequence

```
Power On
    ▼
Portable SSD
    ▼
Tiny Linux (Debian Minimal)
    ▼
Auto Login (ai user)
    ▼
systemd starts vestara.target
    ▼
Vestara API starts
    ▼
Dashboard opens in browser (kiosk mode)
    ▼
AI Platform ready
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
1. vestara-core.service        (Config, events, logging)
2. vestara-api.service         (Fastify API server)
3. vestara-memory.service      (Context management)
4. vestara-agents.service      (Agent lifecycle)
5. vestara-notifications.service
6. vestara-dashboard.service   (Opens browser in kiosk mode)
```

**Ollama does NOT start automatically.** It launches only when the user selects a local model.

---

## Phase 4: Dashboard Loads

**What the user sees:** Vestara AI OS dashboard.

```
┌──────────────────────────────────────────────┐
│                                              │
│              VESTARA AI OS                    │
│         Loading Workspace...                 │
│         [━━━━━━━━━━━━━━░░░░░]                │
│                                              │
└──────────────────────────────────────────────┘
```

Then the full dashboard appears:

```
┌──────────────────────────────────────────────┐
│ Vestara AI OS          🟢 All Systems Ready  │
├─────────────┬────────────────────────────────┤
│ Dashboard   │                                │
│ Chat        │       Welcome Back, Eddie       │
│ Agents      │                                │
│ Projects    │  ┌──────┐ ┌──────┐ ┌──────┐   │
│ Knowledge   │  │ AI   │ │ RAM  │ │ CPU  │   │
│ Models      │  │ Ready│ │ 1.2GB│ │ 12%  │   │
│ Files       │  └──────┘ └──────┘ └──────┘   │
│ Docker      │                                │
│ Git         │  Quick Actions                 │
│ Terminal    │  ┌─────────┐ ┌─────────┐       │
│ Marketplace │  │New Chat │ │Open Term│       │
│ Settings    │  └─────────┘ └─────────┘       │
└─────────────┴────────────────────────────────┘
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
Wants=vestara-core.service
Wants=vestara-api.service
Wants=vestara-memory.service
Wants=vestara-agents.service
Wants=vestara-notifications.service
Wants=vestara-dashboard.service
```

### Service Definitions

```ini
# vestara-core.service
[Unit]
Description=Vestara Core
After=docker.service

[Service]
Type=simple
User=ai
WorkingDirectory=/home/ai/vestara
ExecStart=/usr/bin/node services/core/dist/index.js
Restart=on-failure

[Install]
WantedBy=vestara.target
```

```ini
# vestara-api.service
[Unit]
Description=Vestara API
After=vestara-core.service

[Service]
Type=simple
User=ai
WorkingDirectory=/home/ai/vestara
ExecStart=/usr/bin/node services/api/dist/index.js
Restart=on-failure
Environment=PORT=3000
Environment=DATABASE=/home/ai/vestara/data/vestara.db

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

## Implementation Priority

| Phase | Priority | Effort |
|---|---|---|
| Auto-login configuration | P0 | 1 hour |
| systemd service files | P0 | 1 day |
| Plymouth boot splash | P1 | 1-2 days |
| Kiosk mode browser | P0 | 1 day |
| Service health checks | P1 | 1 day |
| Boot time optimization | P2 | 2-3 days |

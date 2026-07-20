# Vestara AI OS — Boot Experience

> From power-on to desktop. Every frame is branded.

---

## Boot Sequence

```
┌─────────────────────────────────────────┐
│                                         │
│              VESTARA                     │
│         AI Operating System             │
│            Version 1.0                  │
│                                         │
│         Initializing Core...            │
│         Loading AI Services...          │
│         Loading Knowledge...            │
│         Starting Workspace...           │
│                                         │
│         [━━━━━━━━━━━━━━░░░░░] 75%       │
│                                         │
└─────────────────────────────────────────┘
```

---

## Phase 1: Firmware → Bootloader

**What the user sees:** Nothing branded yet.

- BIOS/UEFI POST
- Boot menu (press F12 / Del)
- Select USB SSD

**Technical:**
- GRUB2 (standard Debian bootloader, Stage 1)
- Future: Replace with systemd-boot or rEFInd for cleaner branding

---

## Phase 2: Bootloader → Kernel

**What the user sees:** Nothing branded yet.

- GRUB loads Linux kernel
- Initial ramdisk loads

**Technical:**
- `vmlinuz` + `initrd.img`
- Kernel parameters: `quiet splash`

---

## Phase 3: Plymouth Splash

**This is where branding begins.**

### Plymouth Theme: `vestara-boot`

```
┌─────────────────────────────────────────┐
│                                         │
│              VESTARA                     │
│         AI Operating System             │
│                                         │
│         Initializing Core...            │
│         [━━━━━━━━━━━━━━░░░░░]           │
│                                         │
└─────────────────────────────────────────┘
```

**Design Requirements:**
- Dark background (#0A0A0F or similar deep navy)
- Vestara logo (centered, crisp rendering)
- Progress bar with smooth animation
- Status text cycling through boot phases
- 1920x1080 and 3840x2160 support
- No Debian branding visible

**Boot Phase Messages:**
```
Initializing Core...
Loading AI Services...
Loading Knowledge...
Preparing Workspace...
Starting Vestara...
```

### Implementation

```
/usr/share/plymouth/themes/vestara-boot/
├── vestara-boot.plymouth     # Theme definition
├── vestara-boot.script       # Plymouth script
├── vestara-logo.png          # Logo image (SVG where supported)
├── progress-bar.png          # Progress bar asset
├── progress-fill.png         # Progress bar fill
└── background.png            # Background image
```

** Plymouth Configuration:**

```ini
# /etc/plymouth/plymouthd.conf
[Daemon]
Theme=vestara-boot
DeviceTimeout=8
ShowDelay=0

# /usr/share/plymouth/themes/vestara-boot/vestara-boot.plymouth
[Plymouth Theme]
Name=Vestara AI OS
Description=Vestara AI Operating System
ModuleName=script

[script]
ImageDir=/usr/share/plymouth/themes/vestara-boot
ScriptFile=/usr/share/plymouth/themes/vestara-boot/vestara-boot.script
```

---

## Phase 4: Disk Encryption Unlock

**What the user sees:**

```
┌─────────────────────────────────────────┐
│                                         │
│              VESTARA                     │
│         Encrypted Disk                  │
│                                         │
│         Passphrase: __________           │
│                                         │
│         [ Unlock ]                      │
│                                         │
└─────────────────────────────────────────┘
```

**Technical:**
- Plymouth prompts for LUKS2 passphrase
- Custom Plymouth script renders the unlock screen
- Uses same Vestara branding and color scheme
- No visible `/dev/sdX` device names — just "Vestara Encrypted Disk"

---

## Phase 5: GDM Login Screen

**Replace default GDM branding with Vestara theming.**

```
┌─────────────────────────────────────────┐
│                                         │
│              VESTARA AI OS               │
│            Welcome Back                 │
│                                         │
│         ┌───────────────────┐           │
│         │  [Avatar]         │           │
│         │  Eddie Villanueva │           │
│         │  Password: •••••• │           │
│         │                   │           │
│         │     Sign In       │           │
│         └───────────────────┘           │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  AI Status                              │
│  ✓ Memory Ready                         │
│  ✓ Knowledge Ready                      │
│  ✓ Models Available                     │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [ Power ] [ Settings ] [ Network ]     │
│                                         │
└─────────────────────────────────────────┘
```

**Design Requirements:**
- Dark theme (matches boot experience)
- Vestara logo at top
- User avatar (local, not network-dependent)
- AI service status indicators
- Time and date display
- Power/settings controls

### Implementation

- GDM with custom theme (CSS override)
- Alternatively: SDDM with custom QML theme (more flexible)
- Future: Custom display manager (minimal Wayland compositor + auth)

### GDM Theming

```
/usr/share/gnome-shell/extensions/vestara-login/
├── extension.js
├── stylesheet.css
└── metadata.json

/etc/dconf/profile/gdm:
user-db:user
system-db:vestara

/etc/dconf/db/gdm.d/vestara:
[org/gnome/desktop/interface]
cursor-theme='vestara'
icon-theme='vestara'
font-name='Plus Jakarta Sans 11'
```

---

## Phase 6: Desktop Loading

**What the user sees:**

```
┌─────────────────────────────────────────┐
│                                         │
│              VESTARA                     │
│         Loading Workspace...            │
│         [━━━━━━━━━━━━━━░░░░░]           │
│                                         │
└─────────────────────────────────────────┘
```

This is a brief transitional screen while the Vestara Workspace loads.

**Technical:**
- Custom splash shown by the desktop environment during initialization
- Vestara Core services start in parallel
- Desktop shell loads and takes over

---

## Startup Program Order

```
systemd target: vestara-workspace.target

1. vestara-core.service           (Identity, config, events)
2. vestara-database.service       (PostgreSQL + Redis)
3. vestara-memory.service         (Context management)
4. vestara-knowledge.service      (RAG, indexing)
5. vestara-ai-gateway.service     (AI provider connections)
6. vestara-model-router.service   (Model selection)
7. vestara-agents.service         (Agent lifecycle)
8. vestara-workflow.service       (Automation engine)
9. vestara-notifications.service  (Notification center)
10. vestara-sync.service          (Cross-device sync)
11. vestara-desktop.service       (Workspace shell)
```

Each service has `After=` dependencies to enforce ordering. Services 3-10 can start in parallel after service 2 completes.

---

## Implementation Priority

| Phase | Priority | Effort |
|---|---|---|
| Plymouth boot splash | P0 | 1-2 days |
| GDM theming | P0 | 2-3 days |
| Boot animation assets | P0 | 1 day |
| Disk unlock screen | P1 | 1 day |
| Desktop loading screen | P1 | 1 day |
| systemd-boot bootloader | P2 | 2-3 days |
| Custom display manager | P3 | 2-4 weeks |

# Vestara AI OS — Desktop

> The Vestara Workspace.
> Not GNOME. Not KDE. A purpose-built AI workstation environment.

---

## Design Philosophy

The Vestara Workspace combines the best elements of:

- **VS Code** — Developer-focused workspace
- **Raycast** — Quick access and command palette
- **ChatGPT** — AI conversation interface
- **Cursor** — AI-native code editing
- **Docker Desktop** — Service management
- **Mission Control** — System overview

All unified under the Vestara brand identity.

---

## Desktop Layout

```
┌──────────────────────────────────────────────────────────┐
│ ┌────┐  Vestara Workspace                    ┌─────────┐ │
│ │ AI │                                        │  Right  │ │
│ │    │                                        │  Side   │ │
│ ├────┤  ┌──────────────────────────────────┐  │  bar    │ │
│ │Proj│  │                                  │  │         │ │
│ │ects│  │       Main Content Area          │  │ Running │ │
│ │    │  │                                  │  │ Models  │ │
│ ├────┤  │  (Chat, Code, Documents, etc.)   │  │         │ │
│ │Know│  │                                  │  │ GPU     │ │
│ │ledg│  │                                  │  │ Usage   │ │
│ │e   │  │                                  │  │         │ │
│ ├────┤  │                                  │  │ Memory  │ │
│ │File│  │                                  │  │         │ │
│ │s   │  │                                  │  │ Notif.  │ │
│ ├────┤  │                                  │  │         │ │
│ │Agen│  │                                  │  │ Tasks   │ │
│ │ts  │  │                                  │  │         │ │
│ ├────┤  │                                  │  │ Agents  │ │
│ │Mark│  │                                  │  │         │ │
│ │et  │  └──────────────────────────────────┘  │         │ │
│ ├────┤                                        │         │ │
│ │Term│                                        │         │ │
│ │    │                                        │         │ │
│ ├────┤                                        │         │ │
│ │Sett│                                        │         │ │
│ │ings│                                        │         │ │
│ └────┘                                        └─────────┘ │
│                                                          │
│  [Status Bar: Time | Network | GPU | Battery | Vestara]  │
└──────────────────────────────────────────────────────────┘
```

---

## Left Dock

Vertical dock with application launchers.

```
┌────┐
│ AI │  ← AI Assistant (primary interface)
├────┤
│Proj│  ← Projects (Kanban, tasks, roadmaps)
├────┤
│Know│  ← Knowledge (search, documents, RAG)
├────┤
│File│  ← Files (file manager, project browser)
├────┤
│Agen│  ← Agents (configure, monitor, deploy)
├────┤
│Mark│  ← Marketplace (plugins, agents, templates)
├────┤
│Term│  ← Terminal (AI-powered)
├────┤
│Sett│  ← Settings (system, AI, account)
└────┘
```

**Dock Behaviors:**
- Hover to expand (show labels)
- Click to open/switch
- Active indicator (colored dot)
- Drag to reorder
- Right-click for context menu
- Can be collapsed to icon-only mode

---

## Right Sidebar

Information and monitoring panel.

```
┌─────────────────┐
│ Running Models   │
│                  │
│ ● Phi-4 (2.4GB) │
│   ████████░░ 78% │
│                  │
│ ● Claude Opus    │
│   Remote         │
│                  │
├─────────────────┤
│ GPU Usage        │
│                  │
│ NVIDIA RTX 4090  │
│ ██████░░░░ 62%   │
│ VRAM: 12/24 GB   │
│                  │
├─────────────────┤
│ Memory           │
│                  │
│ Working: 2.1 GB  │
│ Short-term: 850MB│
│ Long-term: 3.2GB │
│                  │
├─────────────────┤
│ Notifications    │
│                  │
│ ● Agent done     │
│ ● Sync complete  │
│ ● Update avail.  │
│                  │
├─────────────────┤
│ Active Tasks     │
│                  │
│ ● Research: done │
│ ● Code review    │
│ ● Documentation  │
│                  │
├─────────────────┤
│ Agents           │
│                  │
│ ● Assistant: on  │
│ ● Coder: idle    │
│ ● Researcher: on │
└─────────────────┘
```

---

## Status Bar

Bottom bar with system information.

```
┌──────────────────────────────────────────────────────────┐
│ 🕐 10:42 AM  │ 📡 Connected │ 🖥️ GPU 62% │ 🔋 87% │ ⚙️ Vestara │
└──────────────────────────────────────────────────────────┘
```

**Status Bar Items:**
- Time and date
- Network status (online/offline, VPN)
- GPU utilization
- Battery level (laptops)
- Vestara service status indicator
- Quick settings access

---

## Command Palette

`Cmd+K` / `Ctrl+K` opens the command palette (inspired by Raycast/VS Code).

```
┌──────────────────────────────────────────────┐
│ 🔍 Type a command or search...               │
├──────────────────────────────────────────────┤
│                                              │
│ Recent                                       │
│ ├── Open AI Assistant                        │
│ ├── Search Knowledge Base                    │
│ └── Run Workflow: Daily Summary              │
│                                              │
│ AI Commands                                  │
│ ├── Ask AI...                                │
│ ├── Generate Code...                         │
│ ├── Summarize Document...                    │
│ └── Create Agent...                          │
│                                              │
│ System                                       │
│ ├── Toggle Dark Mode                         │
│ ├── Open Terminal                            │
│ ├── Manage Models                            │
│ └── Settings                                 │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Notification Center

Slide-out panel from the right.

```
┌─────────────────────────────────┐
│ Notifications           [Clear] │
├─────────────────────────────────┤
│                                 │
│ NOW                             │
│ ● Agent completed: Research     │
│   "AI market analysis 2026"     │
│   2 min ago                     │
│                                 │
│ EARLIER TODAY                   │
│ ● Sync completed                │
│   3 devices synchronized        │
│   1 hour ago                    │
│                                 │
│ ● Model downloaded              │
│   Phi-4 (2.4GB) ready          │
│   3 hours ago                   │
│                                 │
│ YESTERDAY                       │
│ ● System update available       │
│   Vestara 1.1.0                 │
│                                 │
└─────────────────────────────────┘
```

---

## Desktop Backgrounds

### Default: "Vestara Dark"

- Deep navy/dark blue gradient
- Subtle geometric pattern (AI/neural network inspired)
- Vestara logo watermark (subtle, bottom-right)
- 4K resolution (3840x2160)
- Variants: Light, OLED Black, Gradient

### Collection

1. **Vestara Dark** — Default dark theme
2. **Vestara Light** — Clean light theme
3. **Vestara OLED** — Pure black for OLED displays
4. **Vestara Gradient** — Colorful gradient options
5. **Vestara Minimal** — Solid dark with logo

---

## Window Management

### Tiling

Default tiling window manager behavior:

```
┌─────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐       │
│ │ Window 1 │ │ Window 2 │       │
│ │          │ │          │       │
│ └──────────┘ └──────────┘       │
│ ┌──────────────────────────┐    │
│ │ Window 3                 │    │
│ │                          │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

### Floating

Hold `Alt` + drag for floating windows.

### Split View

Drag window to edge for split-screen.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Command Palette |
| `Cmd/Ctrl + Space` | AI Quick Ask |
| `Cmd/Ctrl + T` | New Terminal |
| `Cmd/Ctrl + N` | New Conversation |
| `Cmd/Ctrl + B` | Toggle Sidebar |
| `Cmd/Ctrl + .` | Toggle Right Panel |
| `Cmd/Ctrl + ,` | Settings |
| `Cmd/Ctrl + Q` | Quit Application |
| `Alt + Tab` | Switch Applications |
| `Alt + 1-9` | Switch to Dock Item |
| `Ctrl + Alt + T` | Open Terminal Anywhere |

---

## Implementation Stack

### Option A: Electron (Recommended for Speed)

```
vestara-desktop/
├── electron/               # Electron main process
│   ├── main.ts
│   ├── window.ts
│   ├── tray.ts
│   └── ipc.ts
├── src/                    # React app (same stack as vestara-admin)
│   ├── App.tsx
│   ├── components/
│   │   ├── Dock/
│   │   ├── Sidebar/
│   │   ├── StatusBar/
│   │   ├── CommandPalette/
│   │   └── Notifications/
│   ├── pages/
│   │   ├── Assistant/
│   │   ├── Projects/
│   │   ├── Knowledge/
│   │   ├── Files/
│   │   ├── Agents/
│   │   ├── Marketplace/
│   │   ├── Terminal/
│   │   └── Settings/
│   └── hooks/
├── package.json
└── electron-builder.yml
```

**Pros:** Fast development, rich APIs, same React/Vite stack as existing Vestara projects.

### Option B: Tauri (Lighter Weight)

Rust backend + React frontend. Smaller binary, lower memory.

**Pros:** Native performance, smaller footprint, better for embedded.

### Option C: GTK4/libadwaita (Native Linux)

True native Linux desktop. Deepest system integration.

**Pros:** Native look, best performance, smallest footprint.
**Cons:** Longer development time, GTK ecosystem learning curve.

### Recommendation

**Start with Electron.** It matches the existing Vestara TypeScript stack and enables rapid iteration. Migrate to Tauri or GTK4 later if performance becomes critical.

---

## Design System

### Colors

```css
:root {
  /* Primary */
  --vestara-bg: #0A0A0F;
  --vestara-surface: #12121A;
  --vestara-surface-2: #1A1A25;
  --vestara-border: #2A2A3A;
  
  /* Accent */
  --vestara-primary: #6366F1;    /* Indigo */
  --vestara-primary-hover: #818CF8;
  --vestara-secondary: #22D3EE;  /* Cyan */
  --vestara-accent: #A78BFA;     /* Purple */
  
  /* Text */
  --vestara-text: #F1F5F9;
  --vestara-text-muted: #94A3B8;
  --vestara-text-dim: #64748B;
  
  /* Status */
  --vestara-success: #22C55E;
  --vestara-warning: #F59E0B;
  --vestara-error: #EF4444;
  --vestara-info: #3B82F6;
}
```

### Typography

```css
:root {
  --vestara-font: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --vestara-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Spacing

```css
:root {
  --vestara-space-xs: 4px;
  --vestara-space-sm: 8px;
  --vestara-space-md: 16px;
  --vestara-space-lg: 24px;
  --vestara-space-xl: 32px;
  --vestara-space-2xl: 48px;
}
```

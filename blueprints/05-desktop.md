# Vestara AI OS — Desktop

> The "VS Code of AI Operating Systems."
> Dark glassmorphism. Metallic gold accents. Neon blue/purple highlights.
> Every screen has a purpose. Lightweight enough for modest hardware.

---

## Design Language

- **Dark glassmorphism** — Frosted glass panels, layered depth
- **Metallic gold accents** — Premium feel, key actions
- **Neon blue/purple highlights** — AI activity, status indicators
- **Material Design** — Consistent spacing, elevation, typography
- **Tailwind CSS v4** — Utility-first styling
- **Desktop first** — Responsive, optimized for 1080p+

---

## Color System

```css
:root {
  /* Backgrounds */
  --vestara-bg: #06060C;
  --vestara-surface: rgba(15, 15, 25, 0.8);
  --vestara-glass: rgba(255, 255, 255, 0.03);
  --vestara-glass-border: rgba(255, 255, 255, 0.06);

  /* Gold accents */
  --vestara-gold: #C9A84C;
  --vestara-gold-light: #E4C76B;
  --vestara-gold-dim: #8B7333;

  /* AI indicators */
  --vestara-blue: #4F8CFF;
  --vestara-purple: #9B6DFF;
  --vestara-cyan: #22D3EE;

  /* Text */
  --vestara-text: #E8ECF1;
  --vestara-text-muted: #8892A4;
  --vestara-text-dim: #505A6E;

  /* Status */
  --vestara-success: #22C55E;
  --vestara-warning: #F59E0B;
  --vestara-error: #EF4444;
  --vestara-info: #3B82F6;
}
```

---

## Typography

```css
:root {
  --vestara-font: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --vestara-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

---

## Navigation

Sidebar organized into categories:

```
┌───────────────────────────────────────────────────────┐
│ Vestara AI OS                    🟢 All Systems Ready │
├─────────────┬─────────────────────────────────────────┤
│             │                                         │
│ Main        │                                         │
│   Dashboard │           Workspace Area                │
│             │                                         │
│ AI          │     (Content changes per screen)        │
│   Chat      │                                         │
│   OpenCode  │                                         │
│   Agents    │                                         │
│   Models    │                                         │
│             │                                         │
│ Data        │                                         │
│   Memory    │                                         │
│   Knowledge │                                         │
│             │                                         │
│ System      │                                         │
│   Terminal  │                                         │
│   Files     │                                         │
│   Monitor   │                                         │
│             │                                         │
│ Admin       │                                         │
│   Scripts   │                                         │
│   Users     │                                         │
│   Settings  │                                         │
│             │                                         │
├─────────────┴─────────────────────────────────────────┤
│ 👤 Eddie (admin)                    [Sign Out]        │
└──────────────────────────────────────────────────────┘
```

---

# Screen 1 — Dashboard

The home screen after boot.

```
┌──────────────────────────────────────────────────────┐
│ Welcome Back, Eddie                    Quick Actions  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ AI Status│ │ Provider │ │ RAM Usage│ │ CPU      │ │
│ │ 🟢 Ready │ │ OpenAI   │ │ 1.2 GB   │ │ 12%      │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ CPU Usage (area chart)  │  Memory Usage (area chart) │
│ ┌─────────────────────┐ │ ┌─────────────────────────┐│
│ │  ~~~~/\~~~~/\~~~~   │ │ │  ~~~~/\~~~~/\~~~~       ││
│ │ /    \/    \/   \   │ │ │ /    \/    \/   \       ││
│ └─────────────────────┘ │ └─────────────────────────┘│
│                                                      │
│ Memory Breakdown (radial) │ Disk Usage (pie chart)   │
│ ┌─────────────────────┐ │ ┌─────────────────────────┐│
│ │    ┌─────┐          │ │ │    ████░░░░             ││
│ │   │ 62%  │          │ │ │    ████░░░░  45%        ││
│ │    └─────┘          │ │ │                         ││
│ └─────────────────────┘ │ └─────────────────────────┘│
│                                                      │
│ Quick Actions                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ New Chat │ │ Terminal │ │  Files   │ │ Monitor  │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────────────────────────────────┘
```

---

# Screen 2 — AI Chat

Streaming chat with multi-model support.

```
┌──────────────────────────────────────────────────────┐
│ AI Chat                              [+ New Chat]    │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│Conversa- │  ┌─────────────────────────────────────┐  │
│tions     │  │ 🤖 Assistant                       │  │
│          │  │ I can help you with code, research, │  │
│ Today    │  │ documentation, and more.            │  │
│ • Auth   │  │                                     │  │
│   module │  │ What are you working on?            │  │
│ • AI     │  │                                     │  │
│   trends │  └─────────────────────────────────────┘  │
│          │                                           │
│ Yesterday│  ┌─────────────────────────────────────┐  │
│ • Email  │  │ 👤 Eddie                            │  │
│          │  │ Help me refactor the auth module    │  │
│          │  └─────────────────────────────────────┘  │
│          │                                           │
│          │  Model: GPT-4o │ Tokens: 1,234 │ $0.02   │
├──────────┴───────────────────────────────────────────┤
│ [Send]                    Model: gpt-4o    [Voice]   │
└──────────────────────────────────────────────────────┘
```

---

# Screen 3 — OpenCode

OpenCode CLI integration with chat history persistence.

```
┌──────────────────────────────────────────────────────┐
│ OpenCode                            [New Chat] [cwd] │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ History  │  ┌─────────────────────────────────────┐  │
│          │  │ 🤖 OpenCode                         │  │
│ Today    │  │                                     │  │
│ • hello  │  │ Hello! I can help you with coding,  │  │
│ • debug  │  │ debugging, and development tasks.   │  │
│          │  │                                     │  │
│ Yesterday│  │ What would you like to work on?     │  │
│ • test   │  │                                     │  │
│          │  └─────────────────────────────────────┘  │
│          │                                           │
│          │  Model: deepseek-v4-flash-free            │
│          │  CWD: /home/eddie/projects               │
├──────────┴───────────────────────────────────────────┤
│ [Send]                    Model selector      [+]    │
└──────────────────────────────────────────────────────┘
```

---

# Screen 4 — Agents

Agent management and execution.

```
┌──────────────────────────────────────────────────────┐
│ Agent Manager                      [+ Create Agent]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 📋       │ │ 💻       │ │ 🔧       │ │ ☁️       │ │
│ │ Planner  │ │ Developer│ │ DevOps   │ │ Cloud    │ │
│ │ 🟢 Ready │ │ 🟢 Ready │ │ 🟡 Idle  │ │ 🟢 Ready │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 🔍       │ │ 📝       │ │ 🛡️       │ │ 🔒       │ │
│ │ Research │ │ Docs     │ │ QA       │ │ Security │ │
│ │ 🟢 Ready │ │ 🟡 Idle  │ │ 🟢 Ready │ │ 🟡 Idle  │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────────────────────────────────┘
```

---

# Screen 5 — Models

Provider and model selection with recharts visualizations.

```
┌──────────────────────────────────────────────────────┐
│ Model Manager                                        │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ Providers    │  Available Models                     │
│              │                                       │
│ ● OpenAI     │  ┌─────────────────────────────────┐ │
│ ○ Anthropic  │  │ GPT-4o                          │ │
│ ○ Google     │  │ Context: 128K │ Speed: Fast     │ │
│ ○ Ollama     │  │ [Select] [Details]              │ │
│              │  └─────────────────────────────────┘ │
│ Connected:   │                                       │
│ 2/4          │  ┌─────────────────────────────────┐ │
│              │  │ Claude Sonnet                   │ │
│              │  │ Context: 200K │ Speed: Fast     │ │
│              │  │ [Select] [Details]              │ │
│              │  └─────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────┘
```

---

# Screen 6 — Memory

Memory store with search and auto-consolidation.

```
┌──────────────────────────────────────────────────────┐
│ Memory                              [Search...]      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Types: All │ Facts │ Preferences │ Context           │
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │ User prefers dark mode                          │  │
│ │ Type: preference │ Importance: high │ Today      │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Vestara uses TypeScript strict mode             │  │
│ │ Type: fact │ Importance: medium │ Yesterday      │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ [+ Add Memory]                                       │
└──────────────────────────────────────────────────────┘
```

---

# Screen 7 — Knowledge

Knowledge base with RAG search.

```
┌──────────────────────────────────────────────────────┐
│ Knowledge Base                     [+ Upload] [🔍]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Search: "How does the model router work?"     [🔍]  │
│                                                      │
│ Results:                                             │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Model Router Architecture (98% match)           │  │
│ │ "The model router uses priority-based..."       │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ Documents (47)     Collections (5)                   │
│                                                      │
│ Upload: PDF, DOCX, Markdown, HTML, Code files       │
└──────────────────────────────────────────────────────┘
```

---

# Screen 8 — Terminal

Full-width terminal with Vestara CLI integration.

```
┌──────────────────────────────────────────────────────┐
│ Terminal                               [⚡] [+] [⚙️] │
├──────────────────────────────────────────────────────┤
│                                                      │
│ $ vestara status                                     │
│                                                      │
│ Service            Status    Uptime    Memory        │
│ ─────────────────────────────────────────────────    │
│ vestara-api        ● running  2d 4h    50 MB         │
│ ollama             ○ stopped  —         —             │
│                                                      │
│ $ vestara models list                                │
│                                                      │
│ Available models:                                    │
│ • opencode/deepseek-v4-flash-free                    │
│ • opencode/mimo-v2.5-free                            │
│ • opencode/nemotron-3-ultra-free                     │
│                                                      │
│ $ _                                                  │
└──────────────────────────────────────────────────────┘
```

### Features

- Full HTTP-based command execution (30s timeout)
- Vestara CLI integration with ⚡ quick menu
- Command history (up/down arrows)
- cd support with working directory tracking
- Mobile responsive with hamburger menu

---

# Screen 9 — Files

File manager with tree view, editor, and operations.

```
┌──────────────────────────────────────────────────────┐
│ Files                             [Search...]        │
├────────────┬─────────────────────────────────────────┤
│ Explorer   │ ~/projects/vestara-ai-os                │
│            │                                         │
│ [+File]    │ blueprints/  8.2 KB      dir   Today   │
│ [+Folder]  │ packages/    4.1 KB      dir   Today   │
│            │ services/    12 KB       dir   Today   │
│ 🏠 ~       │ README.md    2.1 KB      .md   Today   │
│ 📁 Desktop │ package.json 1.4 KB      .json Today   │
│ 📁 docs    │                                         │
│ 📁 projects│ Preview: package.json                   │
│ 📁 scripts │ ┌─────────────────────────────────────┐ │
│ 📁 vestara │ │ {                                   │ │
│            │ │   "name": "vestara-ai-os",           │ │
│            │ │   "version": "0.1.0"                 │ │
│            │ │ }                                   │ │
│            │ └─────────────────────────────────────┘ │
│            │                                         │
│            │ [Edit] [Save] [Download] [Delete]       │
└────────────┴─────────────────────────────────────────┘
```

### Features

- Collapsible directory tree
- File list with icons, sizes, dates
- Breadcrumb navigation
- Inline text editor with save
- Right-click context menu (open, rename, delete)
- Create file/folder modals
- Search across directories
- Path traversal protection

---

# Screen 10 — Monitor

Real-time system monitoring with recharts.

```
┌──────────────────────────────────────────────────────┐
│ System Monitor                                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│ CPU Usage (area chart)    │  Memory Usage (area)     │
│ ┌───────────────────────┐ │ ┌───────────────────────┐│
│ │   ~~~~/\~~~~/\~~~~    │ │ │   ~~~~/\~~~~/\~~~~    ││
│ │  /    \/    \/   \    │ │ │  /    \/    \/   \    ││
│ └───────────────────────┘ │ └───────────────────────┘│
│                                                      │
│ CPU: 12% │ RAM: 1.2GB/8GB │ Cores: 4 │ Uptime: 2d   │
│                                                      │
│ Network I/O (area chart)   │  Disk Usage (pie)       │
│ ┌───────────────────────┐ │ ┌───────────────────────┐│
│ │   ~~~~/\~~~~/\~~~~    │ │ │   ██████░░░░          ││
│ └───────────────────────┘ │ └───────────────────────┘│
│                                                      │
│ Top Processes                                      │
│ ┌──────┬──────┬────────┬──────────┐                 │
│ │ PID  │ CPU% │ MEM%   │ Command  │                 │
│ ├──────┼──────┼────────┼──────────┤                 │
│ │ 1234 │ 2.1  │ 1.3    │ node     │                 │
│ │ 5678 │ 0.5  │ 0.8    │ chromium │                 │
│ └──────┴──────┴────────┴──────────┘                 │
└──────────────────────────────────────────────────────┘
```

---

# Screen 11 — Scripts

Script runner with categorized list and documentation.

```
┌──────────────────────────────────────────────────────┐
│ Scripts                                              │
├────────────┬─────────────────────────────────────────┤
│ Available  │ build-ssd.sh                            │
│ Scripts    │ Build                                     │
│            │                                         │
│ build-ssd  │ Creates a 20GB GPT disk image with      │
│ build-deb  │ three partitions (EFI, boot, root).     │
│ build-repo │ Installs Debian 13 minimal via          │
│ build-iso  │ debootstrap, then layers on Node.js     │
│ install    │ 22, Docker, Ollama, OpenCode...         │
│ deploy     │                                         │
│ upgrade    │ Prerequisites:                          │
│ backup     │ debootstrap, parted, mkfs.ext4...       │
│            │                                         │
│            │ Usage: ./scripts/build-ssd.sh            │
│            │                                         │
│            │ [Run]                                   │
│            │                                         │
│            │ Source Code                              │
│            │ ┌─────────────────────────────────────┐ │
│            │ │ #!/usr/bin/env bash                 │ │
│            │ │ set -euo pipefail                   │ │
│            │ │ ...                                 │ │
│            │ └─────────────────────────────────────┘ │
│            │                                         │
│            │ Output                                  │
│            │ ┌─────────────────────────────────────┐ │
│            │ │ [VESTARA] Creating disk image...    │ │
│            │ └─────────────────────────────────────┘ │
└────────────┴─────────────────────────────────────────┘
```

---

# Screen 12 — Users

User management (admin only).

```
┌──────────────────────────────────────────────────────┐
│ Users                              [+ Add User]      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────┬────────┬──────────────────┬──────┬────────┐ │
│ │ Name │ Email  │ Role             │ Last │ Action │ │
│ ├──────┼────────┼──────────────────┼──────┼────────┤ │
│ │ Eddie│ ed@..  │ admin            │ Now  │ Edit   │ │
│ │ ai   │ —      │ user             │ 2d   │ Edit   │ │
│ └──────┴────────┴──────────────────┴──────┴────────┘ │
│                                                      │
│ System Users: eddie, ai, root                        │
│ [Sync OS Users]                                      │
└──────────────────────────────────────────────────────┘
```

---

# Screen 13 — Settings

System configuration.

```
┌──────────────────────────────────────────────────────┐
│ Settings                                             │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ Appearance   │  AI Providers                        │
│ AI Providers │                                       │
│ Security     │  Provider         Status    Action    │
│ Startup      │  ─────────────────────────────────── │
│ Updates      │  OpenCode         🟢 Active  [Test]  │
│              │  OpenAI           🔴 Not set  [Set]  │
│              │  Anthropic        🔴 Not set  [Set]  │
│              │  Ollama           ○ Stopped  [Start]  │
│              │                                       │
└──────────────┴───────────────────────────────────────┘
```

---

## MVP Screens (Phase 1) — ✅ COMPLETE

1. **Dashboard** — System overview, recharts visualizations
2. **AI Chat** — Streaming chat with multi-model support
3. **OpenCode** — OpenCode CLI integration with chat history
4. **Agents** — Agent management and execution
5. **Models** — Provider and model selection
6. **Memory** — Memory store with search
7. **Knowledge** — Knowledge base with RAG
8. **Terminal** — Full-width terminal with Vestara CLI
9. **Files** — File manager with tree, editor, operations
10. **Monitor** — Real-time system monitoring with recharts
11. **Scripts** — Script runner with documentation
12. **Users** — User management (admin only)
13. **Settings** — System configuration

---

## Future Screens

- AI Workflow Builder (visual LangGraph editor)
- Prompt Library
- AI Analytics
- Memory Inspector
- Multi-Agent Collaboration
- Kubernetes Dashboard
- Cloud Manager (AWS, Azure, GCP)
- ComfyUI Studio
- Voice Assistant
- Mobile Companion

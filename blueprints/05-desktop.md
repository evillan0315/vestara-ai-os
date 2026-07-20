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

```
┌───────────────────────────────────────────────────────┐
│ Vestara AI OS                    🟢 All Systems Ready │
├─────────────┬─────────────────────────────────────────┤
│             │                                         │
│ Dashboard   │                                         │
│ Chat        │           Workspace Area                │
│ Agents      │                                         │
│ Projects    │     (Content changes per screen)        │
│ Knowledge   │                                         │
│ Models      │                                         │
│ Files       │                                         │
│ Docker      │                                         │
│ Git         │                                         │
│ Terminal    │                                         │
│ Marketplace │                                         │
│ Settings    │                                         │
│             │                                         │
├─────────────┴─────────────────────────────────────────┤
│ CPU 12% │ RAM 1.2GB │ GPU 0% │ Disk 45% │ 🕐 10:42 │
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
│ │ All sys. │ │ GPT-4o   │ │ of 8 GB  │ │ 4 cores  │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ GPU      │ │ SSD Space│ │ Running  │ │ Agents   │ │
│ │ N/A      │ │ 245 GB   │ │ Agents   │ │ 3 Active │ │
│ │ No GPU   │ │ of 500GB │ │ 0        │ │ 2 Idle   │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ Quick Actions                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ New Chat │ │ Terminal │ │ Projects │ │ Settings │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ Recent                                               │
│ ┌─────────────────────────────────────────────────┐  │
│ │ • "Refactor auth module" — 2 hours ago         │  │
│ │ • "Research AI trends" — Yesterday             │  │
│ │ • Vestara AI OS — Active project               │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Screen 2 — AI Chat

Inspired by VS Code and OpenCode.

```
┌──────────────────────────────────────────────────────┐
│ AI Chat                              [+ New Chat]    │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│Conversa- │  ┌─────────────────────────────────────┐  │
│tions     │  │ 🤖 Assistant                       │  │
│          │  │                                     │  │
│ Today    │  │ I can help you with code, research, │  │
│ • Auth   │  │ documentation, and more.            │  │
│   module │  │                                     │  │
│ • AI     │  │ What are you working on?            │  │
│   trends │  │                                     │  │
│          │  └─────────────────────────────────────┘  │
│ Yesterday│                                           │
│ • Email  │  ┌─────────────────────────────────────┐  │
│          │  │ 👤 Eddie                            │  │
│ Last Week│  │                                     │  │
│ • Arch   │  │ Help me refactor the auth module    │  │
│   review │  │ to use JWT refresh tokens.          │  │
│          │  │                                     │  │
│          │  └─────────────────────────────────────┘  │
│          │                                           │
│          │  ┌─────────────────────────────────────┐  │
│          │  │ 🤖 Assistant                       │  │
│          │  │                                     │  │
│          │  │ Here's the refactored auth module:  │  │
│          │  │                                     │  │
│          │  │ ```typescript                       │  │
│          │  │ import jwt from 'jsonwebtoken';     │  │
│          │  │ // ...                              │  │
│          │  │ ```                                 │  │
│          │  │                                     │  │
│          │  │ [Apply to File] [Copy] [Explain]    │  │
│          │  └─────────────────────────────────────┘  │
│          │                                           │
│          │  ┌──────────────────────────────────┐     │
│          │  │ Type a message...          [Send]│     │
│          │  └──────────────────────────────────┘     │
│          │                                           │
│          │  Model: GPT-4o │ Tokens: 1,234 │ $0.02   │
├──────────┴───────────────────────────────────────────┤
│ [Code] [Files] [Artifacts] [Reasoning] [Usage]       │
└──────────────────────────────────────────────────────┘
```

### Features

- Multi-model support (switch mid-conversation)
- Streaming responses
- Code blocks with syntax highlighting
- File attachments (drag & drop)
- Image support
- Action buttons (Apply to File, Copy, Explain)
- Token usage and cost tracking
- Voice input (future)

---

# Screen 3 — Agent Manager

The heart of the platform.

```
┌──────────────────────────────────────────────────────┐
│ Agent Manager                      [+ Create Agent]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 📋       │ │ 💻       │ │ 🔧       │ │ ☁️       │ │
│ │ Planner  │ │ Developer│ │ DevOps   │ │ Cloud    │ │
│ │ 🟢 Ready │ │ 🟢 Ready │ │ 🟡 Idle  │ │ 🟢 Ready │ │
│ │ Claude   │ │ GPT-4o   │ │ Gemini   │ │ Claude   │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 🔍       │ │ 📝       │ │ 🛡️       │ │ 🔒       │ │
│ │ Research │ │ Docs     │ │ QA       │ │ Security │ │
│ │ 🟢 Ready │ │ 🟡 Idle  │ │ 🟢 Ready │ │ 🟡 Idle  │ │
│ │ Gemini   │ │ GPT-4o   │ │ Claude   │ │ Claude   │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ ┌──────────┐ ┌──────────┐                            │
│ │ ⚙️       │ │ 📦       │                            │
│ │ Custom 1 │ │ Custom 2 │                            │
│ │ 🟢 Running│ │ 🔴 Off   │                            │
│ │ Ollama   │ │ GPT-4o   │                            │
│ └──────────┘ └──────────┘                            │
│                                                      │
│ Agent Details                                         │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Software Developer                              │  │
│ │                                                 │  │
│ │ Provider: OpenAI  │  Model: GPT-4o             │  │
│ │ Memory: 2.4 MB    │  Tools: Read, Write, Exec  │  │
│ │ Cost today: $0.42 │  Runs today: 12            │  │
│ │                                                 │  │
│ │ [Configure] [Start] [View History]              │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Agent Types

| Agent | Purpose | Default Model |
|---|---|---|
| Planner | Task decomposition, roadmaps | Claude Opus |
| Software Developer | Code generation, refactoring | GPT-4o |
| DevOps | Infrastructure, Docker, CI/CD | Gemini 2.5 |
| Cloud Engineer | AWS, Azure, GCP management | Claude Sonnet |
| Research | Web search, analysis, reports | Gemini 2.5 |
| Documentation | Docs generation, README | GPT-4o |
| QA | Testing, bug detection | Claude Opus |
| Security | Vulnerability scanning | Claude Opus |

---

# Screen 4 — Model Manager

```
┌──────────────────────────────────────────────────────┐
│ Model Manager                                        │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ Providers    │  OpenAI Models                        │
│              │                                       │
│ ● OpenAI     │  ┌─────────────────────────────────┐ │
│ ○ Claude     │  │ GPT-4o                          │ │
│ ○ Gemini     │  │ Context: 128K │ Speed: Fast     │ │
│ ○ OpenRouter │  │ [Use] [Details]                 │ │
│ ○ Ollama     │  └─────────────────────────────────┘ │
│ ○ LM Studio  │                                       │
│              │  ┌─────────────────────────────────┐ │
│ Connected:   │  │ GPT-4.1                         │ │
│ 2/6          │  │ Context: 1M   │ Speed: Medium  │ │
│              │  │ [Use] [Details]                 │ │
│              │  └─────────────────────────────────┘ │
│              │                                       │
│              │  ┌─────────────────────────────────┐ │
│              │  │ o3-mini                         │ │
│              │  │ Context: 200K │ Speed: Fast     │ │
│              │  │ [Use] [Details]                 │ │
│              │  └─────────────────────────────────┘ │
│              │                                       │
│              │  Active Model: GPT-4o                │
│              │  Status: Connected                   │
│              │  Cost today: $2.40                   │
│              │  Tokens today: 125K                  │
│              │                                       │
└──────────────┴───────────────────────────────────────┘
```

### Supported Providers

| Provider | Models | Auth |
|---|---|---|
| OpenAI | GPT-4o, GPT-4.1, o3-mini | API Key |
| Anthropic | Claude Opus, Sonnet, Haiku | API Key |
| Google | Gemini 2.5 Pro, Flash | API Key |
| OpenRouter | Multiple providers | API Key |
| Ollama | Local models | None (local) |
| LM Studio | Local models | None (local) |

---

# Screen 5 — Projects

```
┌──────────────────────────────────────────────────────┐
│ Projects                          [+ New Project]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Vestara AI OS                                   │  │
│ │ Status: Active │ Updated: 2 hours ago          │  │
│ │ ████████████████████░░░░░░░░░░ 65%             │  │
│ │ [Open] [AI Assist] [Git]                       │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Portfolio Site                                  │  │
│ │ Status: Active │ Updated: Yesterday            │  │
│ │ ████████████████████████████████ 100%           │  │
│ │ [Open] [AI Assist] [Git]                       │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │ API Backend                                     │  │
│ │ Status: Paused │ Updated: 3 days ago           │  │
│ │ ████████████░░░░░░░░░░░░░░░░░░ 40%             │  │
│ │ [Open] [AI Assist] [Git]                       │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Screen 6 — Knowledge Base

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
│ │ Source: blueprints/03-services.md:45            │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ Documents (47)     Collections (5)                   │
│ ├── Blueprints (12) ├── Vestara Docs                │
│ ├── Code (23)       ├── Research                    │
│ └── Notes (12)      └── Personal                    │
│                                                      │
│ Upload: PDF, DOCX, Markdown, HTML, Code files       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Screen 7 — Files

```
┌──────────────────────────────────────────────────────┐
│ Files                                                 │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ 📁 workspace │  /home/ai/workspace/vestara-ai-os     │
│ 📁 projects  │                                       │
│ 📁 knowledge │  ┌─────┬──────────┬──────┬────────┐  │
│ 📁 memory    │  │Name │ Size     │ Type │ Modified│  │
│ 📁 models    │  ├─────┼──────────┼──────┼────────┤  │
│ 📁 agents    │  │blue…│ 8.2 KB   │ dir  │ Today  │  │
│ 📁 plugins   │  │pack…│ 4.1 KB   │ dir  │ Today  │  │
│              │  │serv…│ 12 KB    │ dir  │ Today  │  │
│              │  │README│ 2.1 KB  │ .md  │ Today  │  │
│              │  │pack…│ 1.4 KB   │ .json│ Today  │  │
│              │  │turbo…│ 0.5 KB  │ .json│ Today  │  │
│              │  └─────┴──────────┴──────┴────────┘  │
│              │                                       │
│              │  Preview: turbo.json                  │
│              │  ┌─────────────────────────────────┐  │
│              │  │ {                               │  │
│              │  │   "$schema": "...",             │  │
│              │  │   "tasks": { ... }              │  │
│              │  │ }                               │  │
│              │  └─────────────────────────────────┘  │
│              │                                       │
└──────────────┴───────────────────────────────────────┘
```

### Preview Support

- Markdown (rendered)
- JSON (syntax highlighted)
- YAML
- TypeScript/JavaScript
- Images
- PDF

---

# Screen 8 — Docker Manager

```
┌──────────────────────────────────────────────────────┐
│ Docker Manager                      [+ New Container]│
├──────────────────────────────────────────────────────┤
│                                                      │
│ Containers (3)    Images (5)    Networks (2)         │
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │ postgres:17         🟢 Running   port: 5432    │  │
│ │ redis:8             🟢 Running   port: 6379    │  │
│ │ ollama/ollama       🔴 Stopped                  │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ Actions: [Start] [Stop] [Restart] [Logs] [Shell]    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Screen 9 — Git Manager

```
┌──────────────────────────────────────────────────────┐
│ Git Manager                                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Repository: vestara-ai-os                            │
│ Branch: main │ Status: Clean │ 3 ahead              │
│                                                      │
│ Changes:                                             │
│ ┌─────────────────────────────────────────────────┐  │
│ │ M  blueprints/01-architecture.md               │  │
│ │ M  blueprints/03-services.md                   │  │
│ │ A  blueprints/08-desktop.md                    │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ Diff: blueprints/01-architecture.md                  │
│ ┌─────────────────────────────────────────────────┐  │
│ │ - Express 5                                     │  │
│ │ + Fastify 5                                     │  │
│ │                                                 │  │
│ │ - PostgreSQL 17                                 │  │
│ │ + SQLite                                        │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ Commit message: [_________________]  [Commit]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Screen 10 — Terminal

```
┌──────────────────────────────────────────────────────┐
│ Terminal                           [+] [Split] [⚙️]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ $ vestara status                                     │
│                                                      │
│ Service            Status    Uptime    Memory        │
│ ─────────────────────────────────────────────────    │
│ vestara-core       ● running  2d 4h    10 MB         │
│ vestara-api        ● running  2d 4h    50 MB         │
│ vestara-memory     ● running  2d 4h    30 MB         │
│ vestara-agents     ● running  2d 4h    40 MB         │
│ ollama             ○ stopped  —         —             │
│                                                      │
│ $ _                                                   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ 💡 Try `vestara models list` to see models    │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Features

- Multiple tabs
- Split panes
- AI command suggestions
- Command explanations
- Session history

---

# Screen 11 — Marketplace

```
┌──────────────────────────────────────────────────────┐
│ Marketplace                       [Search plugins]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Featured                                             │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ 🤖 GitHub  │ │ 📊 Analytics│ │ 🔐 Security│        │
│ │ Integration│ │ Dashboard  │ │ Scanner    │        │
│ │ ★ 4.8      │ │ ★ 4.6      │ │ ★ 4.9      │        │
│ └────────────┘ └────────────┘ └────────────┘        │
│                                                      │
│ Categories: Agents │ MCP Servers │ Themes │ Plugins  │
│             Workflows │ Templates │ Prompts          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# Screen 12 — Settings

```
┌──────────────────────────────────────────────────────┐
│ Settings                                             │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│ Appearance   │  AI Providers                        │
│ AI Providers │                                       │
│ Local Models │  Provider         Status    Action    │
│ API Keys     │  ─────────────────────────────────── │
│ Storage      │  OpenAI           🟢 Connected [Test]│
│ Memory       │  Anthropic        🟢 Connected [Test]│
│ Security     │  Google Gemini    🔴 Not set  [Set]  │
│ Startup      │  OpenRouter       🔴 Not set  [Set]  │
│ Updates      │  Ollama           ○ Stopped  [Start] │
│ Backup       │  LM Studio        ○ Not found [—]    │
│              │                                       │
│              │  [Add Custom Provider]                │
│              │                                       │
└──────────────┴───────────────────────────────────────┘
```

---

## MVP Screens (Phase 1)

1. **Welcome / Boot Screen** — Vestara branding during startup
2. **Dashboard** — System overview, quick actions
3. **AI Chat** — Primary AI interface
4. **Agent Manager** — Configure and run agents
5. **Model Manager** — Provider and model selection
6. **Settings** — System configuration

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

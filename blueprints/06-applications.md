# Vestara AI OS — Applications

> Built-in applications that make the AI workstation complete.
> All 16 screens are implemented and working.

---

## Application Overview

### Implemented (Phase 1) ✅

| # | App | Route | Purpose | Status |
|---|-----|-------|---------|--------|
| 1 | Dashboard | `/dashboard` | System overview, recharts visualizations | ✅ |
| 2 | Login | `/login` | OS-based authentication | ✅ |
| 3 | AI Chat | `/chat` | Streaming chat with multi-model support | ✅ |
| 4 | OpenCode | `/opencode` | OpenCode CLI integration with chat history | ✅ |
| 5 | Agent Manager | `/agents` | Agent configuration and execution | ✅ |
| 6 | Model Manager | `/models` | Provider and model selection | ✅ |
| 7 | Memory | `/memory` | Memory store with auto-consolidation | ✅ |
| 8 | Projects | `/projects` | Project and task management (Kanban, sub-tasks) | ✅ |
| 9 | Knowledge Base | `/knowledge` | RAG, document indexing, search | ✅ |
| 10 | Terminal | `/terminal` | Full-width terminal with Vestara CLI | ✅ |
| 11 | File Manager | `/files` | Tree view, editor, file operations | ✅ |
| 12 | System Monitor | `/monitor` | Real-time monitoring with recharts | ✅ |
| 13 | Scripts | `/scripts` | Script runner with documentation | ✅ |
| 14 | Logs | `/logs` | Real-time log viewer with ring buffer | ✅ |
| 15 | Users | `/users` | User management (admin only) | ✅ |
| 16 | Settings | `/settings` | System configuration, theme picker | ✅ |

### Future

| App | Purpose |
|---|---|
| AI Workflow Builder | Visual LangGraph editor |
| Prompt Library | Organize and version prompts |
| AI Analytics | Token usage, cost tracking |
| Memory Inspector | View and manage memories |
| Multi-Agent Dashboard | Agent collaboration view |
| Kubernetes Dashboard | K8s management |
| Cloud Manager | AWS, Azure, GCP |
| ComfyUI Studio | Image generation |
| Voice Assistant | Voice interaction |

---

## Dashboard

The home screen after boot. Uses Recharts for data visualization.

### Components

```
Dashboard/
├── AreaChart (CPU usage over time)
├── AreaChart (Memory usage over time)
├── RadialGauge (Memory percentage)
├── PieChart (Disk usage breakdown)
├── QuickActionCards (Chat, Terminal, Files, Monitor)
└── SystemInfoCards (AI Status, Provider, RAM, CPU)
```

### Data Sources

```typescript
GET /api/system/stats         → CPU, RAM, disk
GET /api/system/health        → Service health
GET /api/providers            → Provider status
```

---

## AI Chat

Streaming chat with multi-model support.

### Features

- **Multi-model** — Switch between providers mid-conversation
- **Streaming** — Real-time response rendering (SSE)
- **Code blocks** — Syntax highlighting
- **Model selector** — Choose model per conversation
- **Token tracking** — Real-time token count
- **Markdown** — Full markdown rendering

### API Endpoints

```typescript
POST /api/chat                 → Send message (SSE streaming)
GET  /api/conversations        → List conversations
GET  /api/conversations/:id    → Get conversation with messages
DELETE /api/conversations/:id  → Delete conversation
```

---

## OpenCode

Embedded OpenCode web UI with project directory selection and Vestara theme.

### Features

- **Embedded web UI** — OpenCode server runs on port 4096, embedded via iframe
- **Project directory** — Select a project to start OpenCode in that directory
- **Vestara theme** — CSS variable injection matches dark/light dashboard theme
- **Server controls** — Start, stop, reload from the toolbar
- **Auto-start** — Server starts automatically when page loads
- **Project switcher** — Switch projects without leaving the page (restarts server)

### Architecture

```
Dashboard (React)
  └─ OpenCode Page
       ├─ Toolbar (status, project selector, controls)
       └─ iframe → http://localhost:4096
            └─ OpenCode Web UI (Hono + WebSocket)
                 └─ Reads Vestara theme from injected <style> tag
```

### Theme Injection

OpenCode reads its theme from localStorage and CSS variables. Vestara injects a custom theme via:

1. `seedVestaraThemeInIframe()` — Sets localStorage keys before iframe renders
2. `injectVestaraTheme()` — Injects `<style id="vestara-opencode-theme">` with mapped CSS variables

Color mapping: Vestara palette → OpenCode `--v2-*` variables (background, text, accent, agent badges).

### Default Models

```
opencode/deepseek-v4-flash-free
opencode/mimo-v2.5-free
opencode/nemotron-3-ultra-free
opencode/north-mini-code-free
opencode/big-pickle
ollama/deepseek-coder (local, requires Ollama)
```

### API Endpoints

```typescript
GET  /api/providers/opencode/status    → Status + serverUrl
POST /api/providers/opencode/start     → Start server (accepts { cwd })
POST /api/providers/opencode/stop      → Stop server
GET  /api/providers/opencode/models    → List available models
POST /api/providers/opencode/chat      → Send prompt
GET  /api/providers/opencode/chats     → List chat history
POST /api/providers/opencode/chats     → Create new chat
GET  /api/providers/opencode/chats/:id → Get chat with messages
POST /api/providers/opencode/chats/:id/messages → Add message
DELETE /api/providers/opencode/chats/:id → Delete chat
PATCH /api/providers/opencode/chats/:id → Rename chat
```

---

## Agent Manager

Agent configuration and execution with 8 built-in agents.

### Built-in Agents

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

### Agent Execution Flow

```
User Input
    ↓
Agent Manager
    ↓
Select Agent + Model
    ↓
Agent Runtime (execute loop)
    ├── Think (reasoning)
    ├── Act (tool use)
    ├── Observe (result)
    └── Repeat until done
    ↓
Return Result → Update Memory → Notify User
```

---

## Model Manager

Provider and model selection with connection testing.

### Supported Providers

| Provider | Models | Auth |
|---|---|---|
| OpenCode | Free models (default) | None |
| OpenAI | GPT-4o, GPT-4.1, o3-mini | API Key |
| Anthropic | Claude Opus, Sonnet, Haiku | API Key |
| Google | Gemini 2.5 Pro, Flash | API Key |
| Ollama | Local models | None (local) |

### Ollama Management

```typescript
// Start Ollama (on-demand)
POST /api/ollama/start

// Stop Ollama
POST /api/ollama/stop

// Pull model
POST /api/ollama/pull { model: "phi4" }

// List local models
GET /api/ollama/models
```

---

## Memory

Memory store with auto-consolidation.

### Memory Types

- **Fact** — Verified information
- **Preference** — User preferences
- **Context** — Conversation context
- **Summary** — Consolidated memories

### Features

- Automatic memory consolidation
- Search across all memories
- Importance scoring
- Consolidation tracking

---

## Knowledge Base

RAG engine and document intelligence.

### Supported Formats

- PDF, DOCX, Markdown, HTML
- Plain text, Code files
- JSON/YAML

### Features

- Full-text search
- Semantic search
- Document collections
- Metadata tracking

---

## Terminal

Full-width terminal with Vestara CLI integration.

### Features

- HTTP-based command execution (30s timeout)
- Vestara CLI integration with ⚡ quick menu
- Command history (up/down arrows)
- cd support with working directory tracking
- Mobile responsive with hamburger menu

### Built-in Commands

```bash
vestara status          # Show service status
vestara start           # Start services
vestara stop            # Stop services
vestara chat            # Interactive AI chat
vestara models list     # List available models
vestara config          # Manage configuration
vestara backup          # Backup data
vestara upgrade         # Upgrade Vestara
vestara deploy          # Deploy services
vestara scripts list    # List available scripts
```

---

## File Manager

Tree view, editor, and file operations.

### API Endpoints

```typescript
GET  /api/files/list?path=      → List directory
GET  /api/files/read?path=      → Read file
POST /api/files/write           → Create/overwrite file
POST /api/files/mkdir           → Create directory
POST /api/files/delete          → Delete file/directory
POST /api/files/rename          → Rename/move
GET  /api/files/tree?depth=     → Directory tree
GET  /api/files/search?query=   → Search files
```

### Features

- Collapsible directory tree
- File list with icons, sizes, dates
- Breadcrumb navigation
- Inline text editor
- Right-click context menu
- Path traversal protection

---

## System Monitor

Real-time system monitoring with Recharts.

### Charts

- CPU usage area chart (time series)
- Memory usage area chart (time series)
- Memory breakdown radial gauge
- Disk usage pie chart
- Network I/O area chart
- Process table (top processes)

### Data Sources

```typescript
GET /api/system/stats    → CPU, RAM, disk, network
GET /api/system/health   → Service health
```

---

## Scripts

Script runner with categorized documentation.

### Categories

- **Build** — build-ssd, build-deb, build-repo, build-iso
- **Deploy** — install, deploy
- **Maintain** — upgrade, backup

### Features

- Categorized script list
- Full documentation (prerequisites, options, examples, outputs, notes)
- Source code viewer
- Argument input
- Live output display with exit code
- Safety gates for dangerous scripts

---

## Users

User management with OS-based authentication.

### Features

- User CRUD (admin only)
- Role management (admin, editor, user)
- OS user sync
- System user detection

---

## Settings

System configuration with visual theme picker.

### Categories

- Appearance (dark/light/system theme picker with preview cards, fonts)
- AI Providers (API keys, connection status, Ollama provider config)
- Local Models (Ollama config)
- Security (password, encryption)
- Startup (service management)
- Updates (version checking)

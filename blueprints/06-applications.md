# Vestara AI OS — Applications

> Built-in applications that make the AI workstation complete.
> All 14 screens are implemented and working.

---

## Application Overview

### Implemented (Phase 1) ✅

| App | Screen | Purpose | Status |
|---|---|---|---|
| Dashboard | 1 | System overview, recharts visualizations | ✅ |
| AI Chat | 2 | Streaming chat with multi-model support | ✅ |
| OpenCode | 3 | OpenCode CLI integration with chat history | ✅ |
| Agent Manager | 4 | Agent configuration and execution | ✅ |
| Model Manager | 5 | Provider and model selection | ✅ |
| Memory | 6 | Memory store with auto-consolidation | ✅ |
| Knowledge Base | 7 | RAG, document indexing, search | ✅ |
| Terminal | 8 | Full-width terminal with Vestara CLI | ✅ |
| File Manager | 9 | Tree view, editor, file operations | ✅ |
| System Monitor | 10 | Real-time monitoring with recharts | ✅ |
| Scripts | 11 | Script runner with documentation | ✅ |
| Users | 12 | User management (admin only) | ✅ |
| Settings | 13 | System configuration | ✅ |

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

OpenCode CLI integration with persistent chat history.

### Features

- **CLI integration** — Run OpenCode commands via API
- **Chat history** — Persistent chat storage in SQLite
- **Auto-titles** — First message becomes chat title
- **Working directory** — Configurable CWD per session
- **Model selector** — Choose from OpenCode free models

### Default Models

```
opencode/deepseek-v4-flash-free
opencode/mimo-v2.5-free
opencode/nemotron-3-ultra-free
opencode/north-mini-code-free
opencode/big-pickle
```

### API Endpoints

```typescript
GET  /api/providers/opencode/status
POST /api/providers/opencode/chat
GET  /api/providers/opencode/models
GET  /api/providers/opencode/chats
POST /api/providers/opencode/chats
GET  /api/providers/opencode/chats/:id
POST /api/providers/opencode/chats/:id/messages
DELETE /api/providers/opencode/chats/:id
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

System configuration.

### Categories

- Appearance (theme, fonts)
- AI Providers (API keys, connection status)
- Local Models (Ollama config)
- Security (password, encryption)
- Startup (service management)
- Updates (version checking)

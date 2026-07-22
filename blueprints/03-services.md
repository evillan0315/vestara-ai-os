# Vestara AI OS — Services

> Two core services: API server and Dashboard.
> Ollama loads on-demand. Everything else is always ready.

---

## Service Overview

| Service | Port | Auto-start | Purpose |
|---|---|---|---|
| `vestara-api` | 3000 | Yes | Fastify REST + WebSocket + all services |
| `vestara-dashboard` | — | Yes | Browser kiosk mode (Nginx in production) |
| `opencode` | 4096 | **No** | OpenCode headless server (on-demand, project-scoped) |
| `ollama` | 11434 | **No** | Local model inference (on-demand) |

---

## Service Definitions

### vestara-api

The unified API server. All Vestara services run in-process.

```
Responsibilities:
- REST endpoints for dashboard (14 route modules)
- WebSocket for real-time updates
- AI provider routing (OpenAI, Anthropic, Google, Ollama)
- OpenCode integration (CLI + chat history)
- Memory service with auto-consolidation
- Knowledge service with full-text search
- Agent runtime with tool execution
- OS-based authentication (JWT)
- File management (safe path resolution)
- Script execution (with safety gates)
- System monitoring (CPU, RAM, disk, network)

Dependencies: None (standalone)
Port: 3000
RAM: ~50MB

Route Modules:
├── auth.ts          /api/auth/*          OS-based authentication
├── system.ts        /api/system/*        System stats, health, exec
├── providers.ts     /api/providers/*     AI provider management
├── opencode.ts      /api/providers/opencode/*  OpenCode CLI + chat
├── chat.ts          /api/chat/*          AI chat (SSE streaming)
├── conversations.ts /api/conversations/* Conversation CRUD
├── agent-runtime.ts /api/agents/*        Agent management + runtime
├── memory.ts        /api/memory/*        Memory CRUD + search
├── knowledge.ts     /api/knowledge/*     Knowledge base CRUD + search
├── projects.ts      /api/projects/*      Project CRUD, Kanban, sub-tasks, activity, .vestara sync, clone, archive, bulk ops
├── users.ts         /api/users/*         User CRUD (admin only)
├── scripts.ts       /api/scripts/*       Script management + execution
└── files.ts         /api/files/*         File manager operations
```

### vestara-dashboard

React dashboard served via Nginx (production) or Vite dev server.

```
Responsibilities:
- Serve React SPA (14 pages)
- Proxy API requests to localhost:3000
- Static asset serving
- SPA routing (try_files)

Dependencies: vestara-api
Port: 80 (Nginx) or 5173 (dev)
RAM: ~50MB (Nginx) or ~150MB (Chromium kiosk)
```

### ollama (On-Demand)

Local model inference. NOT auto-started.

```
Responsibilities:
- Run local AI models
- Model management (pull, list, delete)
- GPU detection and allocation
- Memory management

Dependencies: None (standalone)
Port: 11434
RAM: ~2GB base + model size

Start condition: User selects local model in Model Manager
Stop condition: User switches to cloud API or after 5min idle
```

### opencode (On-Demand)

OpenCode headless server. Started on-demand with optional project directory.

```
Responsibilities:
- Serve OpenCode web UI (embedded via iframe in dashboard)
- AI coding agent with 75+ LLM provider support
- Project-scoped working directory
- Vestara theme injection (dark/light)

Dependencies: None (standalone)
Port: 4096
RAM: ~100MB

Start condition: User opens OpenCode page or clicks Start
Stop condition: User clicks Stop or switches project directory
Configuration: ~/.config/opencode/opencode.json

Providers configured:
- opencode (free models, default)
- nvidia
- vercel
- ollama (deepseek-coder, llama2)
```

---

## Resource Budget

### Cloud API Mode (Default)

```
Tiny Linux:           500 MB
vestara-api:           50 MB
vestara-dashboard:     50 MB (Nginx)
─────────────────────────────
Total:                ~600 MB
Available for work:  ~7.4 GB
```

### Local Model Mode

```
Tiny Linux:           500 MB
vestara-api:           50 MB
vestara-dashboard:     50 MB (Nginx)
Ollama base:        2000 MB
Phi-4 model:        2400 MB
─────────────────────────────
Total:              ~5.0 GB
Available for work: ~3.0 GB
```

---

## API Endpoints Reference

### Authentication (Public)

```
GET  /api/auth/os-user          Detect current OS user
POST /api/auth/os-login         Login with OS credentials
POST /api/auth/os-auto-login    Auto-login (no password)
GET  /api/auth/me               Get current user
```

### System (Public)

```
GET  /api/system/stats          CPU, RAM, disk usage
GET  /api/system/health         Service health check
GET  /api/system/info           Detailed system info
POST /api/system/exec           Execute shell command
```

### OpenCode (Public)

```
GET  /api/providers/opencode/status    OpenCode status (includes serverUrl)
POST /api/providers/opencode/start     Start server (accepts { cwd } for project dir)
POST /api/providers/opencode/stop      Stop server
POST /api/providers/opencode/chat      Send chat message
GET  /api/providers/opencode/models    List available models
GET  /api/providers/opencode/chats     List chat history
POST /api/providers/opencode/chats     Create new chat
GET  /api/providers/opencode/chats/:id Get chat with messages
POST /api/providers/opencode/chats/:id/messages  Add message
DELETE /api/providers/opencode/chats/:id  Delete chat
PATCH /api/providers/opencode/chats/:id  Rename chat
```

### AI Chat (Protected)

```
POST /api/chat                  Send message (SSE streaming)
GET  /api/conversations         List conversations
GET  /api/conversations/:id     Get conversation with messages
DELETE /api/conversations/:id   Delete conversation
```

### Agents (Protected)

```
GET  /api/agents                List agents
POST /api/agents                Create agent
POST /api/agents/:id/run        Execute agent task
```

### Memory (Protected)

```
GET  /api/memory                List memories
POST /api/memory                Create memory
GET  /api/memory/search?q=      Search memories
```

### Knowledge (Protected)

```
GET  /api/knowledge             List knowledge entries
POST /api/knowledge             Create knowledge entry
GET  /api/knowledge/search?q=   Search knowledge base
```

### Users (Admin Only)

```
GET  /api/users                 List all users
POST /api/users                 Create user
PUT  /api/users/:id             Update user
DELETE /api/users/:id           Delete user
GET  /api/users/system-users    List OS users
POST /api/users/sync-os         Sync OS users to database
```

### Scripts (Protected)

```
GET  /api/scripts               List all scripts
GET  /api/scripts/:name         Get script details + docs + source
POST /api/scripts/:name/run     Execute script with args
POST /api/scripts/:name/stream  Execute with combined output
```

### Files (Protected)

```
GET  /api/files/list?path=      List directory contents
GET  /api/files/read?path=      Read file content
POST /api/files/write           Create or overwrite file
POST /api/files/mkdir           Create directory
POST /api/files/delete          Delete file or directory
POST /api/files/rename          Rename or move
GET  /api/files/tree?depth=     Directory tree for sidebar
GET  /api/files/search?path=&query=  Search files by name
```

---

## Inter-Service Communication

### HTTP (Primary)

Dashboard communicates with API via HTTP.

```
Dashboard → API (localhost:3000)
```

### WebSocket (Real-time)

Dashboard receives real-time updates.

```
ws://localhost:3000/ws

Events:
notification:new
agent:status
chat:stream
model:loaded
model:unloaded
system:stats
log:entry
```

### EventEmitter (In-Process)

Services communicate via Node.js EventEmitter for fast, local events.

```
Events:
config:changed
provider:connected
provider:disconnected
model:loaded
model:unloaded
agent:started
agent:completed
memory:updated
```

---

## Health Checks

The API exposes a health endpoint:

```
GET /api/health → {
  status: "ok",
  uptime: 12345,
  version: "0.1.0",
  timestamp: "2026-07-20T00:00:00.000Z",
  providers: {
    openai: true,
    anthropic: false,
    ollama: false
  }
}
```

---

## Development vs Production

| Aspect | Development | Production |
|---|---|---|
| Process Manager | tsx watch / pnpm dev | systemd |
| Logging | pino-pretty (console) | File + journald |
| Database | SQLite (local file) | SQLite (encrypted partition) |
| Dashboard | Vite dev server (5173) | Chromium kiosk mode |
| TLS | None (localhost) | Self-signed or None (local) |
| Hot Reload | Yes | No (compiled JS) |

# Vestara AI OS — Services

> Lightweight services that start automatically.
> Ollama loads on-demand. Everything else is always ready.

---

## Service Overview

| Service | Port | Auto-start | Purpose |
|---|---|---|---|
| `vestara-core` | — | Yes | Config, events, logging |
| `vestara-api` | 3000 | Yes | Fastify REST + WebSocket |
| `vestara-memory` | 3001 | Yes | Context management |
| `vestara-agents` | 3002 | Yes | Agent lifecycle |
| `vestara-notifications` | 3003 | Yes | System notifications |
| `vestara-dashboard` | — | Yes | Browser kiosk mode |
| `ollama` | 11434 | **No** | Local model inference |

---

## Service Definitions

### vestara-core

The foundation. Configuration, event bus, logging.

```
Responsibilities:
- Load system configuration
- User session management
- Internal event bus (Node.js EventEmitter)
- Structured logging (Pino → file + stdout)
- Encryption utilities

Dependencies: None
Port: None (in-process library)
RAM: ~10MB
```

### vestara-api

Unified API for the dashboard and all services.

```
Responsibilities:
- REST endpoints for dashboard
- WebSocket for real-time updates
- AI provider routing (OpenAI, Anthropic, Gemini, Ollama)
- Request/response logging
- Rate limiting
- CORS configuration

Dependencies: vestara-core
Port: 3000
RAM: ~50MB

Endpoints:
GET  /api/health              → System health
GET  /api/status              → Service status
GET  /api/providers           → List AI providers
POST /api/providers/:id/test  → Test provider connection
GET  /api/models              → List available models
POST /api/chat                → Send chat message (streaming)
GET  /api/conversations       → List conversations
GET  /api/conversations/:id   → Get conversation
POST /api/agents              → Create agent
GET  /api/agents              → List agents
POST /api/agents/:id/run      → Run agent
GET  /api/knowledge           → List knowledge base
POST /api/knowledge/upload    → Upload document
GET  /api/memory              → List memories
GET  /api/projects            → List projects
GET  /api/system/stats        → CPU, RAM, GPU, disk
WebSocket /ws                 → Real-time updates
```

### vestara-memory

Context window management.

```
Responsibilities:
- Working memory (current conversation)
- Short-term memory (recent conversations)
- Long-term memory (persistent facts, preferences)
- Automatic memory consolidation
- Memory retrieval for AI queries

Dependencies: vestara-core
Port: 3001
RAM: ~30MB

Memory Types:
- Working: Current conversation context
- Short-term: Last 24 hours of conversations
- Long-term: User preferences, key facts, project context
```

### vestara-agents

Agent lifecycle management.

```
Responsibilities:
- Register and configure agents
- Execute agent workflows
- Manage agent state (idle, running, paused)
- Tool execution sandboxing
- Agent marketplace integration

Dependencies: vestara-core, vestara-api
Port: 3002
RAM: ~40MB (per active agent)

Built-in Agents:
- Planner (task decomposition)
- Software Developer (code generation)
- DevOps (infrastructure)
- Cloud Engineer (cloud resources)
- Research (web search, analysis)
- Documentation (docs generation)
- QA (testing)
- Security (vulnerability scanning)
```

### vestara-notifications

System and AI notifications.

```
Responsibilities:
- Collect notifications from all services
- Priority-based routing
- Desktop notification delivery (browser Notification API)
- Notification history
- Do Not Disturb mode

Dependencies: vestara-core
Port: 3003
RAM: ~10MB
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

---

## Resource Budget

### Cloud API Mode (Default)

```
Tiny Linux:           500 MB
vestara-core:          10 MB
vestara-api:           50 MB
vestara-memory:        30 MB
vestara-agents:        40 MB
vestara-notifications: 10 MB
vestara-dashboard:    150 MB (Chromium)
─────────────────────────────
Total:                ~790 MB
Available for work:  ~7.2 GB
```

### Local Model Mode

```
Tiny Linux:           500 MB
All Vestara services: 150 MB
vestara-dashboard:    150 MB (Chromium)
Ollama base:        2000 MB
Phi-4 model:        2400 MB
─────────────────────────────
Total:              ~5.2 GB
Available for work: ~2.8 GB
```

---

## Inter-Service Communication

### HTTP (Primary)

Dashboard communicates with API via HTTP.

```
Dashboard → API (localhost:3000)
API → Memory (localhost:3001)
API → Agents (localhost:3002)
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

## systemd Configuration

### Service Template

```ini
# /etc/systemd/system/vestara-api.service
[Unit]
Description=Vestara API Server
After=vestara-core.service
Requires=vestara-core.service

[Service]
Type=simple
User=ai
Group=ai
WorkingDirectory=/home/ai/vestara
ExecStart=/usr/bin/node services/api/dist/index.js
Restart=on-failure
RestartSec=5

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/ai/vestara/data /home/ai/vestara/logs
PrivateTmp=yes

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE=/home/ai/vestara/data/vestara.db

[Install]
WantedBy=vestara.target
```

### Target Definition

```ini
# /etc/systemd/system/vestara.target
[Unit]
Description=Vestara AI Platform
After=multi-user.target docker.service

[Install]
WantedBy=graphical.target

Wants=vestara-core.service
Wants=vestara-api.service
Wants=vestara-memory.service
Wants=vestara-agents.service
Wants=vestara-notifications.service
Wants=vestara-dashboard.service
```

---

## Health Checks

Each service exposes a health endpoint:

```
GET /api/health → {
  status: "ok",
  uptime: 12345,
  version: "1.0.0",
  services: {
    "core": "ok",
    "api": "ok",
    "memory": "ok",
    "agents": "ok",
    "notifications": "ok",
    "ollama": "stopped"
  }
}
```

---

## Development vs Production

| Aspect | Development | Production |
|---|---|---|
| Process Manager | tsx watch / PM2 | systemd |
| Logging | pino-pretty (console) | File + journald |
| Database | SQLite (local file) | SQLite (encrypted partition) |
| Dashboard | Vite dev server | Chromium kiosk mode |
| TLS | None (localhost) | Self-signed or None (local) |
| Hot Reload | Yes | No (compiled JS) |

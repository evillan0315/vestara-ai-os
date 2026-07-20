# Vestara AI OS — Services

> Each AI capability is a systemd service.
> The OS manages them. The desktop consumes them.

---

## Service Overview

| Service | Port | Purpose |
|---|---|---|
| `vestara-core` | — | Identity, config, event bus |
| `vestara-database` | 5432/6379 | PostgreSQL + Redis lifecycle |
| `vestara-ai-gateway` | 3000 | Unified AI provider API |
| `vestara-model-router` | 3001 | Route to local/remote models |
| `vestara-memory` | 3002 | Context window management |
| `vestara-knowledge` | 3003 | RAG, document indexing, semantic search |
| `vestara-agents` | 3004 | Agent lifecycle management |
| `vestara-workflow` | 3005 | Multi-step AI automation |
| `vestara-notifications` | 3006 | System and AI notifications |
| `vestara-sync` | 3007 | Cross-device synchronization |

---

## Service Definitions

### vestara-core.service

The foundation. All other services depend on this.

```
Responsibilities:
- Organization management (create, switch, configure)
- User authentication (JWT, sessions)
- System configuration (read/write config files)
- Internal event bus (Redis Pub/Sub)
- Structured logging (Pino → journald)
- Encryption utilities
- Database migrations

Dependencies:
- postgresql.service
- redis.service

Port: None (internal library, not HTTP)
```

### vestara-database.service

Manages PostgreSQL and Redis lifecycle.

```
Responsibilities:
- Start/stop PostgreSQL 17
- Start/stop Redis 8
- Run database migrations on startup
- Health checks
- Backup scheduling

Dependencies:
- network.target

Ports:
- PostgreSQL: 5432 (localhost only)
- Redis: 6379 (localhost only)
```

### vestara-ai-gateway.service

Unified API for all AI providers.

```
Responsibilities:
- Accept AI requests from desktop/apps
- Route to appropriate provider (OpenAI, Anthropic, Ollama, etc.)
- API key management (encrypted storage)
- Rate limiting per user/org
- Request/response logging
- Cost tracking

Dependencies:
- vestara-core.service

Port: 3000

Providers:
- OpenAI (GPT-4o, GPT-4.1)
- Anthropic (Claude Opus, Sonnet)
- Google (Gemini 2.5)
- Ollama (local models)
- Custom endpoints
```

### vestara-model-router.service

Intelligent model selection.

```
Responsibilities:
- Route requests to local or remote models
- Load balancing across providers
- Fallback logic (local → cloud)
- Latency-based routing
- Cost optimization
- GPU awareness (prefer local when GPU available)

Dependencies:
- vestara-ai-gateway.service

Port: 3001

Routing Logic:
- Simple query → small local model (Phi-4, Qwen3)
- Complex reasoning → cloud model (Claude Opus, GPT-4o)
- Code generation → code-specialized model
- User override → respect explicit model choice
```

### vestara-memory.service

Context window management.

```
Responsibilities:
- Maintain conversation context
- Summarize long conversations
- Extract key facts and preferences
- Store user preferences and habits
- Provide context to AI queries
- Automatic memory consolidation

Dependencies:
- vestara-core.service
- vestara-database.service

Port: 3002

Memory Types:
- Working memory (current conversation)
- Short-term memory (recent conversations)
- Long-term memory (persistent facts, preferences)
- Procedural memory (how to do things)
```

### vestara-knowledge.service

RAG engine and document intelligence.

```
Responsibilities:
- Document ingestion (PDF, MD, TXT, DOCX, HTML)
- Text chunking and embedding
- Vector storage (pgvector)
- Semantic search
- RAG query execution
- Document relationship mapping
- Automatic re-indexing

Dependencies:
- vestara-core.service
- vestara-database.service
- vestara-ai-gateway.service (for embeddings)

Port: 3003

Embedding Models:
- Local: nomic-embed-text (via Ollama)
- Remote: OpenAI text-embedding-3-small
```

### vestara-agents.service

Agent lifecycle management.

```
Responsibilities:
- Register and configure agents
- Execute agent workflows
- Manage agent state (idle, running, paused)
- Agent-to-agent communication
- Tool execution sandboxing
- Agent marketplace integration

Dependencies:
- vestara-core.service
- vestara-ai-gateway.service
- vestara-memory.service

Port: 3004

Agent Types:
- Assistant (conversational)
- Task-specific (coding, writing, research)
- Autonomous (long-running workflows)
- Custom (user-defined via Marketplace)
```

### vestara-workflow.service

Multi-step AI automation.

```
Responsibilities:
- Define workflows (DAG-based)
- Execute workflow steps
- Parallel step execution
- Error handling and retries
- Workflow templates
- Schedule-based triggers
- Event-based triggers

Dependencies:
- vestara-core.service
- vestara-agents.service

Port: 3005

Triggers:
- Manual (user initiates)
- Scheduled (cron-like)
- Event-based (file change, webhook, message)
- Condition-based (threshold, pattern)
```

### vestara-notifications.service

System and AI notifications.

```
Responsibilities:
- Collect notifications from all services
- Priority-based routing
- Desktop notification delivery
- Notification history
- Do Not Disturb mode
- Notification preferences per service

Dependencies:
- vestara-core.service

Port: 3006

Notification Types:
- System (updates, errors, warnings)
- AI (task complete, needs input, suggestions)
- Workflow (step complete, failed, awaiting review)
- Sync (conflict, complete, error)
```

### vestara-sync.service

Cross-device synchronization.

```
Responsibilities:
- Sync user data across devices
- Conflict resolution
- Selective sync (choose what to sync)
- Encryption in transit
- Offline support with queue

Dependencies:
- vestara-core.service
- vestara-database.service

Port: 3007

Sync Data:
- Conversations and memories
- Knowledge base
- Projects and tasks
- Agent configurations
- User preferences
```

---

## Inter-Service Communication

### HTTP (Primary)

Services communicate via HTTP REST APIs on localhost.

```
Desktop → AI Gateway (3000)
Desktop → Model Router (3001)
Desktop → Memory (3002)
Desktop → Knowledge (3003)
Desktop → Agents (3004)
Desktop → Workflow (3005)
Desktop → Notifications (3006)
```

### Redis Pub/Sub (Events)

Cross-service event distribution.

```
Events:
- user.created
- user.login
- conversation.started
- message.created
- document.indexed
- agent.started
- agent.completed
- workflow.step.completed
- notification.created
- sync.completed
```

### WebSocket (Real-time)

Desktop receives real-time updates.

```
Socket.IO namespace: /vestara

Events:
- notification:new
- agent:status
- workflow:progress
- memory:updated
- knowledge:indexed
- sync:progress
```

---

## systemd Configuration

### Service Template

```ini
# /etc/systemd/system/vestara-ai-gateway.service
[Unit]
Description=Vestara AI Gateway
After=vestara-core.service vestara-database.service
Requires=vestara-core.service
Wants=vestara-database.service

[Service]
Type=simple
User=vestara
Group=vestara
WorkingDirectory=/opt/vestara/services/ai-gateway
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/opt/vestara/data /var/log/vestara
PrivateTmp=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes

# Environment
EnvironmentFile=/opt/vestara/.env
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=vestara-workspace.target
```

### Target Definition

```ini
# /etc/systemd/system/vestara-workspace.target
[Unit]
Description=Vestara AI Workspace
After=multi-user.target
Wants=vestara-core.service
Wants=vestara-database.service
Wants=vestara-ai-gateway.service
Wants=vestara-model-router.service
Wants=vestara-memory.service
Wants=vestara-knowledge.service
Wants=vestara-agents.service
Wants=vestara-workflow.service
Wants=vestara-notifications.service
Wants=vestara-sync.service

[Install]
Alias=vestara.target
```

---

## Health Checks

Each service exposes a health endpoint:

```
GET /health → { status: "ok", uptime: 12345, version: "1.0.0" }
```

The `vestara-core` service aggregates health from all dependencies:

```
GET /health/all → {
  status: "ok",
  services: {
    "ai-gateway": "ok",
    "model-router": "ok",
    "memory": "ok",
    "knowledge": "ok",
    "agents": "ok",
    "workflow": "ok",
    "notifications": "ok",
    "sync": "ok"
  }
}
```

---

## Development vs Production

| Aspect | Development | Production |
|---|---|---|
| Process Manager | PM2 (ecosystem.config.cjs) | systemd |
| Logging | pino-pretty (console) | journald + file |
| Database | Docker Compose | System PostgreSQL |
| Redis | Docker Compose | System Redis |
| TLS | None (localhost) | Self-signed or Let's Encrypt |
| Hot Reload | tsx watch | Compiled JS |

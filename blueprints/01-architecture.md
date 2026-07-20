# Vestara AI OS — Architecture

> Layered architecture from kernel to application.
> A minimal Linux foundation with Vestara as the product.

---

## Layer Stack

```
┌─────────────────────────────────────┐
│         Vestara Dashboard           │
│  React · Tailwind · Glassmorphism   │
├─────────────────────────────────────┤
│         Vestara API                 │
│  Fastify · WebSocket · REST         │
├─────────────────────────────────────┤
│         AI Services                 │
│  OpenCode · Agent Runtime ·         │
│  Memory · Provider Manager          │
├─────────────────────────────────────┤
│         Data Layer                  │
│  SQLite · JSON · File Storage       │
├─────────────────────────────────────┤
│         System Layer                │
│  systemd · Auto-login · Branding    │
├─────────────────────────────────────┤
│         Tiny Linux                  │
│  Debian Minimal / Alpine            │
│  Docker · OpenCode · Ollama         │
└─────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript (strict) | Consistent with Vestara ecosystem |
| Runtime | Node.js ≥22 | Same as vestara-admin, vestara-bk |
| Package Manager | pnpm (workspace) | Fast, disk-efficient |
| Build | Turborepo | Monorepo orchestration |
| HTTP | Fastify 5 | 2-3x faster than Express, schema validation |
| Database | SQLite (better-sqlite3) | Zero-config, portable, single-file |
| Realtime | WebSocket (ws) | Lightweight, no Socket.IO overhead |
| Validation | Zod 3 | Same as existing Vestara projects |
| Logging | Pino | Fast, structured, JSON output |
| Frontend | React 19 + Vite 6 | Same as vestara-admin |
| Styling | Tailwind CSS 4 + Glassmorphism | Dark AI command center aesthetic |
| Process Manager | systemd | First-class Linux service management |
| Containerization | Docker | Isolated services, easy deployment |
| Local AI | Ollama | On-demand local model inference |
| AI Gateway | OpenCode | Core AI development environment |

---

## Why This Stack?

### Fastify over Express

- 2-3x faster request handling
- Built-in JSON schema validation
- Better TypeScript support
- Lower memory footprint
- Same mental model as Express

### SQLite over PostgreSQL

- Zero configuration
- Single file, fully portable
- No background daemon consuming RAM
- Excellent performance for single-user workload
- Easy backup (copy one file)
- WAL mode for concurrent reads

### Alpine/Debian Minimal over Full Desktop

- Idle at 500-700MB RAM
- No GNOME/KDE overhead
- Browser-based UI (React dashboard)
- Faster boot times
- Smaller SSD footprint

### WebSocket over Socket.IO

- No Socket.IO library overhead
- Native browser API
- Lower latency
- Smaller bundle size

---

## Vestara Core Library

```
@vestara/core
├── config/            # System and user configuration
│   ├── system.ts
│   ├── user.ts
│   └── schema.ts
├── db/                # SQLite database
│   ├── client.ts
│   ├── migrations/
│   └── queries/
├── ai/                # AI provider abstraction
│   ├── providers/
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── google.ts
│   │   ├── openrouter.ts
│   │   ├── ollama.ts
│   │   └── lmstudio.ts
│   ├── router.ts      # Model selection/routing
│   └── types.ts
├── agents/            # Agent lifecycle
│   ├── registry.ts
│   ├── runtime.ts
│   └── types.ts
├── memory/            # Context management
│   ├── working.ts
│   ├── short-term.ts
│   ├── long-term.ts
│   └── types.ts
├── events/            # Internal event bus
│   ├── bus.ts
│   └── types.ts
├── logging/           # Structured logging
│   └── logger.ts
└── crypto/            # Encryption, hashing
    ├── encryption.ts
    └── keys.ts
```

---

## Service Communication

```
┌─────────────┐     HTTP      ┌──────────────┐
│  Dashboard  │◄─────────────►│  Vestara API │
│  (React)    │    WebSocket  │  (Fastify)   │
└─────────────┘               └──────┬───────┘
                                     │
                          ┌──────────┼──────────┐
                          │          │          │
                   ┌──────┴──┐ ┌────┴────┐ ┌───┴──────┐
                   │ OpenCode│ │ Memory  │ │ Provider │
                   │         │ │ Service │ │ Manager  │
                   └─────────┘ └─────────┘ └──────────┘
```

- **Dashboard ↔ API**: HTTP REST + WebSocket for real-time updates
- **API ↔ Services**: Direct function calls (in-process) or HTTP
- **API ↔ SQLite**: Direct queries (better-sqlite3 is synchronous, fast)
- **Services ↔ Ollama**: HTTP (Ollama runs on localhost:11434)

---

## Security Model

### Disk Encryption

- LUKS2 encryption on data partition
- Unlock at boot via passphrase
- `/home/ai/` encrypted at rest

### Service Isolation

- Docker containers for AI services
- systemd sandboxing for core services
- Network isolation where possible

### Authentication

- Local-only authentication (no remote auth needed)
- Optional password protection
- Future: Passkeys, biometric

---

## Database Schema (SQLite)

```sql
-- Users
users (id, name, email, password_hash, avatar, created_at)

-- Sessions
sessions (id, user_id, token, expires_at, created_at)

-- AI Providers
providers (id, name, type, api_key_encrypted, config, enabled, created_at)

-- Models
models (id, provider_id, name, context_window, ram_required, local, created_at)

-- Conversations
conversations (id, user_id, title, model_id, created_at)

-- Messages
messages (id, conversation_id, role, content, tokens, created_at)

-- Knowledge Base
documents (id, user_id, title, content, embedding, metadata, created_at)

-- Memory
memories (id, user_id, key, value, context, importance, created_at)

-- Projects
projects (id, user_id, name, description, status, path, created_at)

-- Tasks
tasks (id, project_id, title, description, status, assignee_id, created_at)

-- Agent Configurations
agents (id, user_id, name, type, provider_id, model_id, config, status, created_at)

-- Agent Executions
agent_executions (id, agent_id, input, output, tokens, cost, started_at, completed_at)

-- Plugins
plugins (id, name, version, author, config, installed_at)

-- Activity Log
activity_log (id, user_id, action, resource, metadata, created_at)
```

---

## Monorepo Structure

```
vestara-ai-os/
├── apps/
│   └── dashboard/              # React dashboard (Vite + Tailwind)
├── services/
│   ├── core/                   # @vestara/core library
│   ├── api/                    # Fastify API server
│   ├── ai-gateway/             # Unified AI provider gateway
│   ├── memory/                 # Context window management
│   ├── knowledge/              # RAG, indexing, semantic search
│   ├── agents/                 # Agent lifecycle management
│   └── notifications/          # Notification service
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── validation/             # Zod schemas
│   ├── constants/              # Shared constants
│   ├── utils/                  # Shared utilities
│   └── config/                 # Shared configuration
├── os/
│   ├── iso/                    # ISO build scripts
│   ├── branding/               # Plymouth, GDM, wallpapers
│   ├── systemd/                # Service unit files
│   ├── filesystem/             # Filesystem layout
│   └── installer/              # Installation scripts
├── scripts/                    # Build and deployment
├── blueprints/                 # This documentation
└── docs/                       # Additional documentation
```

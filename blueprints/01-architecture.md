# Vestara AI OS — Architecture

> Layered architecture from kernel to application.
> A minimal Linux foundation with Vestara as the product.

---

## Layer Stack

```
┌─────────────────────────────────────┐
│         Vestara Dashboard           │
│  React 19 · Vite 6 · Tailwind 4    │
│  14 Pages · Dark/Light · Glassmorphism│
├─────────────────────────────────────┤
│         Vestara API                 │
│  Fastify 5 · WebSocket · REST      │
│  15 Route Modules · JWT Auth        │
├─────────────────────────────────────┤
│         AI Services                 │
│  OpenCode (iframe) · Agent Runtime  │
│  Memory Service · Knowledge Base    │
├─────────────────────────────────────┤
│         Data Layer                  │
│  SQLite (better-sqlite3)            │
│  16 Tables · WAL Mode              │
├─────────────────────────────────────┤
│         System Layer                │
│  systemd · Auto-login · Branding    │
├─────────────────────────────────────┤
│         Tiny Linux                  │
│  Debian 13 Minimal                 │
│  Docker · OpenCode · Ollama         │
└─────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript (strict mode) | Consistent with Vestara ecosystem |
| Runtime | Node.js ≥22 | Same as vestara-admin, vestara-bk |
| Package Manager | pnpm ≥10 (workspace) | Fast, disk-efficient, strict hoisting |
| Build | Turborepo | Monorepo orchestration with caching |
| HTTP | Fastify 5 | 2-3x faster than Express, schema validation |
| Database | SQLite (better-sqlite3) | Zero-config, portable, single-file, WAL mode |
| Realtime | WebSocket (@fastify/websocket) | Lightweight, native browser API |
| Validation | Zod 3 | Same as existing Vestara projects |
| Logging | Pino | Fast, structured, JSON output |
| Frontend | React 19 + Vite 6 | Same as vestara-admin |
| Styling | Tailwind CSS 4 + Glassmorphism | Dark AI command center aesthetic |
| Charts | Recharts | Dashboard and monitor visualizations |
| Process Manager | systemd | First-class Linux service management |
| Containerization | Docker | Isolated services, easy deployment |
| Local AI | Ollama | On-demand local model inference |
| AI Gateway | OpenCode | Core AI development environment, free models |

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
├── db.ts                  # Database wrapper (better-sqlite3)
├── memory-service.ts      # Memory with auto-consolidation
├── knowledge-service.ts   # Knowledge base with full-text search
├── agent-runtime.ts       # Agent lifecycle and tool execution
├── index.ts               # Exports: Database, MemoryService, KnowledgeService, AgentRuntime
```

---

## Shared Packages

```
packages/
├── types/                 # @vestara/types — Shared TypeScript types
├── validation/            # @vestara/validation — Zod schemas
├── constants/             # @vestara/constants — Constants and defaults
├── utils/                 # @vestara/utils — Utility functions
├── config/                # @vestara/config — Configuration loader
└── cli/                   # @vestara/cli — Command-line interface
```

---

## Service Communication

```
┌─────────────┐     HTTP      ┌──────────────┐
│  Dashboard  │◄─────────────►│  Vestara API │
│  (React)    │    WebSocket  │  (Fastify)   │
└──────┬──────┘               └──────┬───────┘
       │ iframe                      │
       ▼                             │
┌──────────────┐            ┌────────┼────────┐
│  OpenCode    │            │        │        │
│  Web UI      │       ┌────┴──┐ ┌──┴───┐ ┌──┴──────┐
│  (port 4096) │       │Memory │ │ Know │ │ Agent   │
└──────────────┘       │Service│ │ledge │ │ Runtime │
                       └───────┘ └──────┘ └─────────┘
```

- **Dashboard ↔ API**: HTTP REST + WebSocket for real-time updates
- **Dashboard ↔ OpenCode**: Embedded iframe (same-origin sandbox, Vestara theme injected via CSS variables)
- **API ↔ Services**: Direct function calls (in-process)
- **API ↔ SQLite**: Direct queries (better-sqlite3 is synchronous, fast)
- **Services ↔ Ollama**: HTTP (Ollama runs on localhost:11434)

---

## Security Model

### Authentication

- **OS-based authentication** — Login with OS username/password
- **Auto-login** — Skip password by detecting current OS user
- **JWT tokens** — Sessions managed via localStorage
- **Roles** — `admin` (full access), `editor` (limited), `user` (read-only)

### Route Protection

- **Public routes** — `/api/health`, `/api/system/*`, `/api/providers/opencode/*`
- **Protected routes** — All other routes require JWT via `authMiddleware`
- **Admin routes** — User management, dangerous operations

### Path Security

- **File Manager** — Path traversal protection via `safePath()` resolver
- **Script execution** — Dangerous scripts require `--confirm` flag
- **Command blocking** — Dangerous shell commands blocked in terminal

---

## Database Schema (SQLite)

```sql
-- Users (OS-authenticated)
users (id, os_username, name, email, role, last_login, created_at)

-- AI Providers
providers (id, name, type, api_key_encrypted, config, enabled, created_at)

-- Models
models (id, provider_id, name, context_window, ram_required, local, created_at)

-- Conversations
conversations (id, user_id, title, model_id, created_at)

-- Messages
messages (id, conversation_id, role, content, tokens, created_at)

-- OpenCode Chat History
opencode_chats (id, user_id, title, model, created_at)
opencode_messages (id, chat_id, role, content, created_at)

-- Knowledge Base
knowledge (id, title, content, type, metadata, created_at)

-- Memory
memories (id, user_id, type, content, context, importance, consolidated, created_at)

-- Projects
projects (id, user_id, name, description, status, path, created_at)

-- Agent Configurations
agents (id, user_id, name, type, provider_id, model_id, config, status, created_at)

-- Agent Executions
agent_executions (id, agent_id, input, output, tokens, cost, started_at, completed_at)

-- Activity Log
activity_log (id, user_id, action, resource, metadata, created_at)
```

---

## Monorepo Structure

```
vestara-ai-os/
├── apps/
│   └── dashboard/              # React dashboard (14 pages)
├── services/
│   ├── core/                   # @vestara/core (DB, memory, knowledge, agents)
│   └── api/                    # Fastify API server (14 route modules)
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── validation/             # Zod schemas
│   ├── constants/              # Shared constants
│   ├── utils/                  # Shared utilities
│   ├── config/                 # Configuration loader
│   └── cli/                    # Command-line interface
├── scripts/                    # Build, deploy, backup, upgrade
├── branding/                   # Logo, Plymouth theme, icons
├── systemd/                    # Service unit files
├── blueprints/                 # This documentation
└── docs/                       # Additional documentation
```

---

## API Routes (15 Modules)

```
Auth Routes        /api/auth/*          OS-based authentication
System Routes      /api/system/*        System stats, health, exec
Provider Routes    /api/providers/*     AI provider management
OpenCode Routes    /api/providers/opencode/*  OpenCode CLI + chat
Chat Routes        /api/chat/*          AI chat (SSE streaming)
Conversation Routes /api/conversations/* Conversation CRUD
Agent Routes       /api/agents/*        Agent management + runtime
Memory Routes      /api/memory/*        Memory CRUD + search
Knowledge Routes   /api/knowledge/*     Knowledge base CRUD + search
Project Routes     /api/projects/*      Project + task management
User Routes        /api/users/*         User CRUD (admin only)
Script Routes      /api/scripts/*       Script management + execution
File Routes        /api/files/*         File manager operations
```

---

## Dashboard Pages (14)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/dashboard` | System overview, recharts visualizations |
| AI Chat | `/chat` | Streaming chat with multi-model support |
| OpenCode | `/opencode` | Embedded OpenCode web UI with project directory selector |
| Agents | `/agents` | Agent management and execution |
| Models | `/models` | Provider and model selection |
| Memory | `/memory` | Memory store with search |
| Projects | `/projects` | Project and task management |
| Knowledge | `/knowledge` | Knowledge base with RAG |
| Terminal | `/terminal` | Full-width terminal with Vestara CLI |
| Files | `/files` | File manager with tree, editor, operations |
| Monitor | `/monitor` | Real-time system monitoring with recharts |
| Users | `/users` | User management (admin only) |
| Scripts | `/scripts` | Script runner with documentation |
| Settings | `/settings` | System configuration, theme picker |

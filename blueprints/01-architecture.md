# Vestara AI OS — Architecture

> Layered architecture from kernel to application.
> Debian is the foundation. Vestara is the product.

---

## Layer Stack

```
┌─────────────────────────────────────┐
│         Applications                │
│  Assistant · Studio · Projects ·    │
│  Knowledge · Terminal · Developer · │
│  Marketplace                        │
├─────────────────────────────────────┤
│         Vestara Workspace           │
│  Desktop Shell · Dock · Sidebar ·   │
│  Notification Center                │
├─────────────────────────────────────┤
│         Vestara Services            │
│  AI Gateway · Model Router ·        │
│  Memory · Knowledge · Agents ·      │
│  Workflow Engine · Sync             │
├─────────────────────────────────────┤
│         Vestara Core                │
│  Identity · Auth · Config ·         │
│  Event Bus · Logging                │
├─────────────────────────────────────┤
│         Vestara System Layer        │
│  systemd · Plymouth · GDM ·         │
│  Branding · Filesystem Layout       │
├─────────────────────────────────────┤
│         Debian 13 (Trixie)          │
│  Linux Kernel · APT · Libraries     │
└─────────────────────────────────────┘
```

---

## Vestara Core

The foundational library that all Vestara services depend on.

```
@vestara/core
├── identity/          # Organization + user management
│   ├── organization.ts
│   ├── user.ts
│   ├── session.ts
│   └── auth.ts
├── config/            # System and user configuration
│   ├── system.ts
│   ├── user.ts
│   └── schema.ts
├── events/            # Internal event bus
│   ├── bus.ts
│   ├── types.ts
│   └── middleware.ts
├── logging/           # Structured logging (Pino-based)
│   ├── logger.ts
│   └── transport.ts
├── crypto/            # Encryption, hashing, key management
│   ├── encryption.ts
│   ├── keys.ts
│   └── password.ts
└── db/                # Database connection (Prisma)
    ├── client.ts
    └── migrations/
```

### Design Decisions

- **TypeScript throughout** — Consistent with existing Vestara ecosystem (vestara-admin, vestara-bk)
- **ESM modules** — `"type": "module"` across all packages
- **Prisma ORM** — PostgreSQL for structured data, same pattern as backend services
- **Organization-scoped** — Every entity has `organizationId`. Multi-tenant from day one.

---

## Vestara Services

Independent systemd-managed services. Each is a Node.js process with a specific responsibility.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  ai-gateway  │  │ model-router │  │   memory     │
│              │  │              │  │              │
│  Unified API │  │  Route to    │  │  Context     │
│  for AI      │  │  local/remote│  │  window      │
│  providers   │  │  models      │  │  management  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────┬────────┘────────┬────────┘
                │                 │
         ┌──────┴──────┐  ┌──────┴──────┐
         │  workflow   │  │  knowledge  │
         │  engine     │  │  service    │
         │             │  │             │
         │  Automate   │  │  RAG, doc   │
         │  multi-step │  │  indexing,  │
         │  AI tasks   │  │  semantic   │
         └─────────────┘  │  search     │
                          └─────────────┘
```

### Service Communication

- **Local IPC** — Unix domain sockets + HTTP (Express 5, same stack as vestara-bk)
- **Event bus** — Redis Pub/Sub for cross-service events
- **WebSocket** — Real-time updates to the desktop (Socket.IO)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Runtime | Node.js ≥22 |
| Package Manager | pnpm (workspace monorepo) |
| Build | Turborepo |
| HTTP | Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL 17 |
| Cache/PubSub | Redis 8 |
| Realtime | Socket.IO 4 |
| Validation | Zod 3 |
| Logging | Pino |
| Process Manager | systemd (production), PM2 (development) |

---

## Security Model

### Disk Encryption

- LUKS2 full-disk encryption on the external SSD
- Unlock at boot via passphrase (future: TPM-backed keys)
- `/vestara` encrypted at rest

### Service Isolation

- Each service runs as a dedicated system user
- systemd sandboxing (ReadOnlyPaths, ProtectSystem, NoNewPrivileges)
- Network isolation between services where possible

### Authentication

- JWT-based sessions (same pattern as vestara-bk)
- bcrypt password hashing
- Future: Passkeys, FIDO2, biometric

---

## Database Schema (High-Level)

```sql
-- Organizations (multi-tenant root)
organizations (id, name, slug, settings, created_at)

-- Users
users (id, org_id, email, name, password_hash, role, created_at)

-- Sessions
sessions (id, user_id, token, expires_at, created_at)

-- AI Conversations
conversations (id, org_id, user_id, title, model, created_at)

-- Messages
messages (id, conversation_id, role, content, tokens, created_at)

-- Knowledge Base
documents (id, org_id, title, content, embedding, metadata, created_at)

-- Memory
memories (id, org_id, user_id, key, value, context, created_at)

-- Projects
projects (id, org_id, name, description, status, created_at)

-- Tasks
tasks (id, project_id, title, description, status, assignee_id, created_at)

-- Agent Configurations
agents (id, org_id, name, type, config, status, created_at)

-- Workflows
workflows (id, org_id, name, steps, triggers, status, created_at)

-- Plugins / Marketplace
plugins (id, name, version, author, config, installed_at)

-- Audit Log
audit_log (id, org_id, user_id, action, resource, metadata, created_at)
```

---

## Monorepo Structure

```
vestara-ai-os/
├── apps/
│   ├── desktop/              # Vestara Workspace (Electron/Tauri)
│   ├── assistant/            # AI Assistant UI
│   ├── studio/               # Prompt engineering workspace
│   ├── terminal/             # AI-powered terminal
│   └── marketplace/          # Plugin marketplace
├── services/
│   ├── core/                 # @vestara/core library
│   ├── ai-gateway/           # Unified AI provider gateway
│   ├── model-router/         # Local/remote model routing
│   ├── memory/               # Context window management
│   ├── knowledge/            # RAG, indexing, semantic search
│   ├── agents/               # Agent lifecycle management
│   ├── workflow-engine/      # Multi-step AI automation
│   ├── notifications/        # Notification service
│   └── sync/                 # Cross-device synchronization
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── validation/           # Zod schemas
│   ├── constants/            # Shared constants
│   ├── utils/                # Shared utilities
│   └── config/               # Shared configuration
├── installer/                # Vestara Installer scripts
├── branding/                 # Plymouth, GDM, wallpapers, icons
├── systemd/                  # Service unit files
├── filesystem/               # Filesystem layout scripts
├── scripts/                  # Build and deployment scripts
├── blueprints/               # This documentation
└── docs/                     # Additional documentation
```

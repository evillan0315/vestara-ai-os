# Vestara AI OS

A portable AI operating system that boots from an external SSD.

Plug into any x86-64 computer, power on, and your complete AI environment is ready. Models, projects, memories, settings — everything travels with you.

[![CI](https://github.com/evillan0315/vestara-ai-os/actions/workflows/ci.yml/badge.svg)](https://github.com/evillan0315/vestara-ai-os/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/evillan0315/vestara-ai-os)](https://github.com/evillan0315/vestara-ai-os/releases)
[![License](https://img.shields.io/badge/license-proprietary-blue)](LICENSE)

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/evillan0315/vestara-ai-os.git
cd vestara-ai-os
pnpm install
pnpm build

# Start development servers
pnpm dev

# Or use Docker
docker compose up -d

# Or use the CLI
cd packages/cli && pnpm build
./dist/index.js status
```

## Features

- **16-screen Dashboard** — Dark/light glassmorphism AI command center with recharts visualizations
- **OS Authentication** — Login with your system username/password
- **AI Chat** — Stream responses from OpenAI, Anthropic, Google, Ollama
- **OpenCode Integration** — Embedded web UI with project directory selection and Vestara theme
- **Agent Runtime** — Create and execute AI agents with tools
- **Memory System** — Store and recall information across sessions
- **Knowledge Base** — Document storage with search and retrieval
- **User Management** — Admin panel for managing dashboard users
- **System Monitor** — Real-time CPU, memory, disk, network charts
- **Terminal** — Built-in terminal with Vestara CLI integration
- **CLI Tool** — Command-line interface for service management
- **Docker Support** — Full stack containerized deployment
- **CI/CD** — GitHub Actions for testing, building, and deployment
- **OS Build Scripts** — Create bootable portable SSDs

## Architecture

```
┌─────────────────────────────────────┐
│         Vestara Dashboard           │
│  React 19 · Tailwind 4 · Vite 6   │
│  16 pages · Recharts · Auth        │
├─────────────────────────────────────┤
│         Vestara API                 │
│  Fastify 5 · WebSocket · REST      │
│  20 route modules · SSE streaming   │
├─────────────────────────────────────┤
│         AI Services                 │
│  OpenCode · Agent Runtime ·         │
│  Memory · Knowledge · Notifications │
├─────────────────────────────────────┤
│         Data Layer                  │
│  SQLite (better-sqlite3) · WAL mode │
├─────────────────────────────────────┤
│         System Layer                │
│  systemd · Auto-login · Plymouth    │
├─────────────────────────────────────┤
│         Linux Foundation            │
│  Debian 13 · Docker · Ollama        │
└─────────────────────────────────────┘
```

## Monorepo Structure

```
vestara-ai-os/
├── apps/
│   └── dashboard/              # React dashboard (16 pages)
├── services/
│   ├── core/                   # @vestara/core library
│   │   ├── db.ts               # SQLite wrapper + schema
│   │   ├── events.ts           # EventBus (in-process event emitter)
│   │   ├── knowledge-service.ts# Knowledge base
│   │   ├── project-service.ts  # Project CRUD, tasks, activity
│   │   ├── project-analytics.ts# Project analytics service
│   │   ├── settings-service.ts # Key-value settings store
│   │   └── migrations.ts       # Database migrations
│   ├── api/                    # Fastify API server
│   │   ├── routes/             # 20 route modules
│   │   ├── providers/          # AI provider router
│   │   └── types.ts            # VestaraApp type (Fastify)
│   ├── agents/                 # @vestara/agents (AgentRuntime, AIProvider)
│   ├── memory/                 # @vestara/memory (auto-consolidation)
│   └── notifications/          # @vestara/notifications (activity log)
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── validation/             # Zod schemas
│   ├── constants/              # Shared constants
│   ├── utils/                  # Shared utilities
│   ├── config/                 # Shared configuration
│   ├── cli/                    # Vestara CLI tool
│   ├── deb/                    # Debian package definitions
│   │   ├── vestara-api/
│   │   ├── vestara-cli/
│   │   ├── vestara-core/
│   │   ├── vestara-dashboard/
│   │   └── vestara-systemd/
│   ├── immutable/              # Immutable OS infrastructure
│   │   ├── ab-system/          # A/B partition scheme
│   │   ├── rollback/           # Automatic rollback
│   │   ├── secureboot/         # Secure Boot signing
│   │   └── updater/            # Atomic updates
│   └── iso/                    # Custom ISO builder
│       ├── config/             # ISO configuration
│       ├── hooks/              # Pre/post-install hooks
│       ├── includes/           # Additional ISO content
│       ├── installer/          # Installation wizard
│       └── recovery/           # Recovery tools
├── branding/
│   └── plymouth/               # Boot splash theme
├── scripts/
│   ├── build-ssd.sh            # OS build script
│   ├── build-deb.sh            # Debian package builder
│   ├── build-repo.sh           # APT repository builder
│   ├── build-iso.sh            # ISO builder
│   ├── install.sh              # One-command installer
│   ├── upgrade.sh              # Upgrade script
│   ├── deploy.sh               # Deployment script
│   └── backup.sh               # Backup/restore
├── systemd/                    # Service unit files (api, core, dashboard, memory, target)
├── docker-compose.yml          # Full stack (API, Dashboard, Ollama)
├── docker-compose.dev.yml      # Development mode
├── Dockerfile                  # API server
├── Dockerfile.dashboard        # Dashboard
└── .github/workflows/          # CI/CD pipelines (6 workflows)
```

## Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | System overview with recharts (CPU, RAM, Disk, Network) |
| Login | `/login` | OS-based authentication |
| AI Chat | `/chat` | Chat with AI models (streaming) |
| OpenCode | `/opencode` | Embedded OpenCode web UI with project directory selector |
| Agents | `/agents` | Agent management and execution |
| Models | `/models` | AI model manager |
| Memory | `/memory` | Memory store with search |
| Projects | `/projects` | Project and task management (Kanban, sub-tasks, time tracking) |
| Knowledge | `/knowledge` | Knowledge base |
| Terminal | `/terminal` | Built-in terminal with Vestara CLI |
| Files | `/files` | File manager (tree, editor, operations) |
| System | `/monitor` | Resource monitor with charts |
| Scripts | `/scripts` | Script runner with documentation |
| Logs | `/logs` | Real-time log viewer with ring buffer |
| Users | `/users` | User management (admin) |
| Settings | `/settings` | Configuration |

## Default AI Models

Vestara uses OpenCode free models by default (no API key required):

- `opencode/deepseek-v4-flash-free`
- `opencode/mimo-v2.5-free`
- `opencode/nemotron-3-ultra-free`
- `opencode/north-mini-code-free`
- `opencode/big-pickle`

Additional providers: OpenAI, Anthropic, Google, Ollama (local with `deepseek-coder` pre-configured).

## API Endpoints

### Health (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (uptime, version, provider availability) |

### Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/os-user` | Detect current OS user |
| POST | `/api/auth/os-login` | Login with OS credentials |
| POST | `/api/auth/os-auto-login` | Auto-login as current user |
| GET | `/api/auth/me` | Get current user |
| DELETE | `/api/auth/logout` | Logout |

### System (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/stats` | System stats (CPU, RAM, Disk) |
| GET | `/api/system/health` | Service health check |
| GET | `/api/system/info` | Full system info |
| POST | `/api/system/exec` | Execute shell command |

### OpenCode (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers/opencode/status` | OpenCode status (includes serverUrl) |
| POST | `/api/providers/opencode/start` | Start server (accepts `{ cwd }` for project directory) |
| POST | `/api/providers/opencode/stop` | Stop server |
| GET | `/api/providers/opencode/models` | List available models |
| POST | `/api/providers/opencode/chat` | Send prompt to OpenCode |
| GET | `/api/providers/opencode/chats` | List chat sessions |
| POST | `/api/providers/opencode/chats` | Create new chat |
| GET | `/api/providers/opencode/chats/:id` | Get chat with messages |
| PATCH | `/api/providers/opencode/chats/:id` | Rename chat |
| DELETE | `/api/providers/opencode/chats/:id` | Delete chat |
| POST | `/api/providers/opencode/chats/:id/messages` | Send message |

### AI Chat & Conversations (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message (SSE streaming) |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation with messages |
| DELETE | `/api/conversations/:id` | Delete conversation |

### AI Providers (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers` | List configured providers |
| POST | `/api/providers` | Add provider |
| PUT | `/api/providers/:id` | Update provider |
| DELETE | `/api/providers/:id` | Delete provider |
| POST | `/api/providers/:id/test` | Test provider connection |

### Agents (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| GET | `/api/agents/stats` | Agent execution statistics |
| POST | `/api/agents` | Create agent |
| POST | `/api/agents/:id/run` | Execute agent task |
| POST | `/api/agents/:id/execute` | Execute agent (alternative) |

### Memory (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory` | List memories |
| POST | `/api/memory` | Create memory |
| GET | `/api/memory/search?q=` | Search memories |

### Knowledge (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge` | List knowledge entries |
| POST | `/api/knowledge` | Create knowledge entry |
| GET | `/api/knowledge/search?q=` | Search knowledge base |

### Projects (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/stats` | Project statistics |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/clone` | Clone project |
| POST | `/api/projects/:id/archive` | Archive to .vestara |
| GET | `/api/projects/:id/activity` | Project activity timeline |
| GET | `/api/projects/:id/tasks` | List tasks |
| POST | `/api/projects/:id/tasks` | Create task |
| PATCH | `/api/projects/:id/tasks/:taskId` | Update task |
| DELETE | `/api/projects/:id/tasks/:taskId` | Delete task |
| POST | `/api/projects/:id/tasks/bulk-update` | Bulk update tasks |

### Users (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/system` | List OS users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| POST | `/api/users/sync-os` | Import OS user |

### Scripts (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scripts` | List all scripts |
| GET | `/api/scripts/:name` | Get script details + docs + source |
| POST | `/api/scripts/:name/run` | Execute script with args |
| POST | `/api/scripts/:name/stream` | Execute with streaming output |

### Files (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/list?path=` | List directory contents |
| GET | `/api/files/read?path=` | Read file content |
| POST | `/api/files/write` | Create or overwrite file |
| POST | `/api/files/mkdir` | Create directory |
| POST | `/api/files/delete` | Delete file or directory |
| POST | `/api/files/rename` | Rename or move |
| GET | `/api/files/tree?depth=` | Directory tree for sidebar |
| GET | `/api/files/search?path=&query=` | Search files by name |

### Activity (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity` | List recent activity |

### Notifications (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| POST | `/api/notifications/:id/read` | Mark notification as read |
| POST | `/api/notifications/read-all` | Mark all as read |

### Logs (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | List recent log entries |
| GET | `/api/logs/stream` | SSE streaming logs |

### Settings (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| GET | `/api/settings/:key` | Get single setting |
| PUT | `/api/settings/:key` | Update setting |

### Analytics (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/projects` | Analyze all projects |
| GET | `/api/analytics/projects/:id` | Analyze single project |

### Ollama (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ollama/status` | Ollama status (running, models, RAM) |
| POST | `/api/ollama/pull` | Pull a model |
| POST | `/api/ollama/start` | Start Ollama |
| POST | `/api/ollama/stop` | Stop Ollama |

## CLI Commands

```bash
vestara init          # Initialize Vestara
vestara status        # Show service status
vestara start         # Start services
vestara stop          # Stop services
vestara logs          # View logs
vestara chat          # Interactive AI chat
vestara models        # List available models
vestara config        # Manage configuration
vestara upgrade       # Upgrade Vestara
```

## Docker

```bash
# Full stack (API + Dashboard + Ollama)
docker compose up -d

# Development mode (with hot reload)
docker compose -f docker-compose.dev.yml up

# With Ollama (CPU)
docker compose --profile ai up -d

# With Ollama (GPU)
docker compose --profile ai --profile gpu up -d
```

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| CI | Push to `main`/`develop`, PRs | Lint, typecheck, build, test, Docker build, security scan |
| Deploy Development | Push to `develop` | Auto-deploy to development environment |
| Deploy Staging | Push to `main` | Auto-deploy to staging environment |
| Deploy Production | Manual dispatch | Deploy to production |
| Nightly Build | Daily at 2 AM UTC | Build and push nightly Docker images |
| Release | Push tag `v*` | Build Docker images, .deb packages, ISO, create GitHub release |

### Running CI Locally

```bash
# Run all CI checks
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

## Installation

### From Source

```bash
git clone https://github.com/evillan0315/vestara-ai-os.git
cd vestara-ai-os
pnpm install
pnpm build
```

### Debian Package

```bash
# Install from APT repository
curl -fsSL https://raw.githubusercontent.com/evillan0315/vestara-ai-os/main/scripts/install.sh | sudo bash

# Or install .deb package directly
sudo dpkg -i vestara-*.deb
```

### Bootable SSD

```bash
# Build bootable SSD image
./scripts/build-ssd.sh

# Flash to SSD
sudo dd if=dist/vestara-ai-os.img of=/dev/sdX bs=4M status=progress
```

## Backup

```bash
# Create backup
./scripts/backup.sh backup

# List backups
./scripts/backup.sh list

# Restore from backup
./scripts/backup.sh restore vestara-backup-20260720-120000.tar.gz
```

## Resource Budget

| Component | RAM |
|---|---|
| Linux (Debian minimal) | 500–700 MB |
| Vestara services | ~150 MB |
| Dashboard (Chromium) | ~150 MB |
| **Total (cloud APIs)** | **~1 GB** |
| **Available for work** | **~7 GB** |

## Documentation

- [Vision](./blueprints/00-vision.md) — What Vestara AI OS is and why it exists
- [Architecture](./blueprints/01-architecture.md) — Fastify + SQLite + React stack
- [Boot Experience](./blueprints/02-boot-experience.md) — Auto-login, systemd services
- [Services](./blueprints/03-services.md) — Lightweight AI services
- [Filesystem](./blueprints/04-filesystem.md) — Purpose-built filesystem layout
- [Desktop](./blueprints/05-desktop.md) — 16-screen dark/light glassmorphism UI
- [Applications](./blueprints/06-applications.md) — Built-in AI applications
- [Implementation Roadmap](./blueprints/07-implementation-roadmap.md) — 4-stage build plan
- [API Reference](./docs/api.md) — Full API endpoint reference
- [Scripts Reference](./scripts/README.md) — Build and deployment scripts

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development servers
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## License

Proprietary — Vestara

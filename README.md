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

- **14-screen Dashboard** — Dark glassmorphism AI command center with recharts visualizations
- **OS Authentication** — Login with your system username/password
- **AI Chat** — Stream responses from OpenAI, Anthropic, Google, Ollama
- **OpenCode Integration** — First-class OpenCode support with chat history persistence
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
│  14 pages · Recharts · Auth        │
├─────────────────────────────────────┤
│         Vestara API                 │
│  Fastify 5 · WebSocket · REST      │
│  13 route modules · SSE streaming   │
├─────────────────────────────────────┤
│         AI Services                 │
│  OpenCode · Agent Runtime ·         │
│  Memory · Knowledge · Providers     │
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
│   └── dashboard/              # React dashboard (14 pages)
├── services/
│   ├── core/                   # @vestara/core library
│   │   ├── db.ts               # SQLite wrapper + schema
│   │   ├── memory-service.ts   # Memory consolidation
│   │   ├── knowledge-service.ts# Knowledge base
│   │   └── agent-runtime.ts    # Agent execution
│   └── api/                    # Fastify API server
│       ├── routes/             # 13 route modules
│       ├── providers/          # AI provider abstraction
│       └── types.ts            # VestaraApp type (Fastify)
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── validation/             # Zod schemas
│   ├── constants/              # Shared constants
│   ├── utils/                  # Shared utilities
│   ├── config/                 # Shared configuration
│   └── cli/                    # Vestara CLI tool
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
├── systemd/                    # Service unit files
├── docker-compose.yml          # Full stack (PostgreSQL, Redis, API, Dashboard)
├── docker-compose.dev.yml      # Development mode
├── Dockerfile                  # API server
├── Dockerfile.dashboard        # Dashboard
└── .github/workflows/          # CI/CD pipelines
```

## Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | System overview with recharts (CPU, RAM, Disk, Network) |
| Login | `/login` | OS-based authentication |
| AI Chat | `/chat` | Chat with AI models (streaming) |
| OpenCode | `/opencode` | OpenCode integration with chat history |
| Agents | `/agents` | Agent management and execution |
| Models | `/models` | AI model manager |
| Memory | `/memory` | Memory store with search |
| Projects | `/projects` | Project and task management |
| Knowledge | `/knowledge` | Knowledge base |
| Terminal | `/terminal` | Built-in terminal with Vestara CLI |
| Files | `/files` | File manager (tree, editor, operations) |
| System | `/monitor` | Resource monitor with charts |
| Scripts | `/scripts` | Script runner with documentation |
| Users | `/users` | User management (admin) |
| Settings | `/settings` | Configuration |

## Default AI Models

Vestara uses OpenCode free models by default (no API key required):

- `opencode/deepseek-v4-flash-free`
- `opencode/mimo-v2.5-free`
- `opencode/nemotron-3-ultra-free`
- `opencode/north-mini-code-free`
- `opencode/big-pickle`

Additional providers: OpenAI, Anthropic, Google, Ollama (local).

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/os-user` | Detect current OS user |
| POST | `/api/auth/os-login` | Login with OS credentials |
| POST | `/api/auth/os-auto-login` | Auto-login as current user |
| GET | `/api/auth/me` | Get current user |
| DELETE | `/api/auth/logout` | Logout |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/stats` | System stats (CPU, RAM, Disk) |
| GET | `/api/system/health` | Health check |
| GET | `/api/system/info` | Full system info |
| POST | `/api/system/exec` | Execute shell command |

### OpenCode

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/providers/opencode/status` | OpenCode status |
| GET | `/api/providers/opencode/models` | List available models |
| POST | `/api/providers/opencode/chat` | Send prompt to OpenCode |
| GET | `/api/providers/opencode/chats` | List chat sessions |
| POST | `/api/providers/opencode/chats` | Create new chat |
| GET | `/api/providers/opencode/chats/:id` | Get chat with messages |
| DELETE | `/api/providers/opencode/chats/:id` | Delete chat |
| POST | `/api/providers/opencode/chats/:id/messages` | Send message |

### Users (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/system` | List OS users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| POST | `/api/users/sync-os` | Import OS user |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Non-streaming chat |
| POST | `/api/chat/stream` | SSE streaming chat |
| GET | `/api/providers` | List providers |
| GET | `/api/conversations` | List conversations |
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| POST | `/api/agents/:id/execute` | Execute agent task |
| GET | `/api/memory` | List memories |
| POST | `/api/memory` | Add memory |
| GET | `/api/knowledge` | List knowledge entries |
| POST | `/api/knowledge` | Add knowledge entry |
| GET | `/api/projects` | List projects |

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
# Full stack (API + Dashboard + PostgreSQL + Redis)
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
- [Desktop](./blueprints/05-desktop.md) — 14-screen dark glassmorphism UI
- [Applications](./blueprints/06-applications.md) — Built-in AI applications
- [Implementation Roadmap](./blueprints/07-implementation-roadmap.md) — 4-stage build plan

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

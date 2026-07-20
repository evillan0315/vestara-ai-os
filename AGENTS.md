# AGENTS.md

This file contains instructions for AI agents working on the Vestara AI OS codebase.

---

## Project Overview

Vestara AI OS is a portable AI operating system that boots from an external SSD. It provides a complete AI workstation on any x86-64 computer.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js ≥22
- **Package Manager**: pnpm ≥10 (workspace)
- **Build**: Turborepo
- **API**: Fastify 5
- **Database**: SQLite (better-sqlite3)
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4
- **Charts**: Recharts
- **AI**: OpenCode, OpenAI, Anthropic, Google, Ollama
- **CI/CD**: GitHub Actions

## Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development servers
pnpm dev

# Lint code
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Project Structure

### Packages (`packages/`)

- `@vestara/types` — Shared TypeScript types
- `@vestara/validation` — Zod schemas
- `@vestara/constants` — Constants and defaults
- `@vestara/utils` — Utility functions
- `@vestara/config` — Configuration loader
- `@vestara/cli` — Command-line interface

### Services (`services/`)

- `@vestara/core` — Core library (SQLite, memory, knowledge, agents)
- `@vestara/api` — Fastify API server

### Apps (`apps/`)

- `@vestara/dashboard` — React dashboard (12 pages)

## Code Conventions

### File Naming

- Use `kebab-case` for file names
- Example: `memory-service.ts`, `agent-runtime.ts`

### TypeScript

- Strict mode is enabled
- Use explicit types for function parameters
- Prefer interfaces for object shapes
- Use `readonly` for immutable data

### API Routes

- All route functions accept `VestaraApp` (from `../types.ts`), not `FastifyInstance`
- `VestaraApp` extends `FastifyInstance` with typed `db`, `aiRouter`, `memoryService`, `knowledgeService`, `agentRuntime`, and `broadcast`
- Use `authMiddleware` for protected routes
- Validate input with Zod schemas
- Return appropriate HTTP status codes

### Database

- Use `better-sqlite3` wrapper (`Database` class from `@vestara/core`)
- The `Database` class wraps `better-sqlite3.Database` and exposes `run()`, `get()`, `all()`, `prepare()`, `transaction()`, `close()`, `pragma()`
- Tables use `snake_case` columns
- Always include `created_at` and `updated_at` timestamps

## Core Services

### Database Wrapper (`services/core/src/db.ts`)

The `Database` class provides a typed wrapper around `better-sqlite3`:

```typescript
import { Database } from '@vestara/core';

const db = new Database('/path/to/vestara.db');
db.run('INSERT INTO ...');
const row = db.get<T>('SELECT * FROM ...');
const rows = db.all<T>('SELECT * FROM ...');
```

### Memory Service (`services/core/src/memory-service.ts`)

Manages user memories with automatic consolidation:

```typescript
const memoryService = new MemoryService(db, events);
await memoryService.addMemory(userId, 'fact', 'User prefers dark mode');
const memories = await memoryService.searchMemories(userId, 'dark mode');
```

### Knowledge Service (`services/core/src/knowledge-service.ts`)

Manages knowledge base entries with full-text search:

```typescript
const knowledgeService = new KnowledgeService(db, events);
await knowledgeService.addKnowledge({ content: '...', type: 'document' });
const results = await knowledgeService.searchKnowledge(query);
```

### Agent Runtime (`services/core/src/agent-runtime.ts`)

Creates and executes AI agents with tools:

```typescript
const agentRuntime = new AgentRuntime(db, events);
const agent = await agentRuntime.createAgent({ name: 'assistant', ... });
const result = await agentRuntime.executeAgent(agent.id, task);
```

## Default Models

The project uses OpenCode free models by default:

```typescript
const DEFAULT_MODELS = [
  'opencode/deepseek-v4-flash-free',
  'opencode/mimo-v2.5-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/north-mini-code-free',
  'opencode/big-pickle',
];
```

## Environment Variables

```bash
# AI Provider Keys (optional — OpenCode free models work without keys)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...

# OpenCode Configuration
OPENCODE_API_KEY=sk-...
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
NVIDIA_API_KEY=nvapi-...
VERCEL_AI_GATEWAY_API_KEY=vck_...

# API Configuration
PORT=3000
NODE_ENV=development
DATABASE=/path/to/vestara.db
```

## Authentication

Vestara uses OS-based authentication:

- **Login**: Users authenticate with their OS username/password
- **Auto-login**: Skip password by detecting the current OS user
- **JWT**: Sessions are managed via JWT tokens stored in localStorage
- **Roles**: `admin` (full access), `editor` (limited), `user` (read-only)

### Auth Endpoints

```
GET  /api/auth/os-user      — Detect current OS user
POST /api/auth/os-login     — Login with OS credentials
POST /api/auth/os-auto-login— Auto-login (no password)
GET  /api/auth/me           — Get current user
```

## Git Workflow

- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Create feature branches from `main`
- Run `pnpm build` before committing
- Keep commits focused and atomic

## CI/CD

The project uses GitHub Actions with 6 workflows:

- **CI** — Lint, typecheck, build, test, Docker build, security scan (runs on push to `main`/`develop` and PRs)
- **Deploy Development** — Auto-deploy to development on push to `develop`
- **Deploy Staging** — Auto-deploy to staging on push to `main`
- **Deploy Production** — Manual deployment to production
- **Nightly Build** — Daily build and push of Docker images
- **Release** — Build Docker images, .deb packages, ISO, and create GitHub release on tag push

### Running CI Checks Locally

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/build-ssd.sh` | Build bootable SSD image |
| `scripts/build-deb.sh` | Build Debian packages |
| `scripts/build-repo.sh` | Build APT repository |
| `scripts/build-iso.sh` | Build custom ISO |
| `scripts/install.sh` | One-command installer |
| `scripts/upgrade.sh` | Upgrade Vestara |
| `scripts/deploy.sh` | Deployment script |
| `scripts/backup.sh` | Backup/restore |

## Important Notes

1. **OpenCode is the default provider** — All chat features work without API keys
2. **Ollama is NOT auto-started** — It loads on-demand when a local model is selected
3. **SQLite is the database** — No PostgreSQL, no MySQL
4. **No comments in code** — Unless explicitly requested
5. **Follow existing patterns** — Look at neighboring files before adding new code
6. **Use `VestaraApp` type** — Not `FastifyInstance` for route functions
7. **System routes are public** — `/api/system/*` endpoints don't require auth
8. **OpenCode routes are public** — `/api/providers/opencode/*` endpoints don't require auth
9. **Shell is `/usr/bin/sh`** — Use `shell: '/usr/bin/sh'` for `execSync` and `spawn`

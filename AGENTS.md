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

- `@vestara/dashboard` — React dashboard (14 pages)

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
- `VestaraApp` extends `FastifyInstance` with typed `db`, `aiRouter`, `memoryService`, `knowledgeService`, `agentRuntime`, `projectService`, and `broadcast`
- Use `authMiddleware` for protected routes
- Validate input with Zod schemas
- Return appropriate HTTP status codes

### Database

- Use `better-sqlite3` wrapper (`Database` class from `@vestara/core`)
- The `Database` class wraps `better-sqlite3.Database` and exposes `run()`, `get()`, `all()`, `prepare()`, `transaction()`, `close()`, `pragma()`
- Tables use `snake_case` columns
- Always include `created_at` and `updated_at` timestamps

### Tasks Table Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT FK | References projects |
| `title` | TEXT | Task title |
| `description` | TEXT | Optional description |
| `status` | TEXT | `todo` / `in_progress` / `review` / `done` |
| `assignee_id` | TEXT | User reference |
| `parent_id` | TEXT FK | Self-referencing for sub-tasks |
| `tags` | TEXT | JSON array of strings |
| `estimated_hours` | REAL | Estimated effort |
| `logged_hours` | REAL | Actual hours logged, default 0 |
| `sort_order` | INTEGER | Kanban drag position, default 0 |
| `created_at` | TEXT | ISO timestamp |
| `updated_at` | TEXT | ISO timestamp |

### Activity Log Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK | References users |
| `action` | TEXT | Event name (e.g. `task:created`, `project:synced`) |
| `resource` | TEXT | Resource identifier (e.g. `task:<id>`) |
| `metadata` | TEXT | JSON blob with extra context |
| `created_at` | TEXT | ISO timestamp |

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

### Project Service (`services/core/src/project-service.ts`)

Full CRUD for projects and tasks with .vestara sync, activity logging, and notifications:

```typescript
const projectService = new ProjectService(db, events);

// Projects
await projectService.createProject(userId, { name, description, path });
await projectService.cloneProject(id, userId, { name, includeTasks: true });
await projectService.archiveToVestara(id, userId);

// Tasks with new features
await projectService.createTask(projectId, userId, { title, parentId, tags: ['bug'], estimatedHours: 4 });
await projectService.bulkUpdateTasks(projectId, ids, { status: 'done' });
await projectService.getSubTasks(projectId, parentTaskId);

// Activity
await projectService.logActivity(userId, 'task:created', `task:${id}`, { projectId });
const activity = await projectService.getProjectActivity(projectId);
```

## Default Models

The project uses OpenCode free models by default, with Ollama local models available:

```typescript
const DEFAULT_MODELS = [
  'opencode/deepseek-v4-flash-free',
  'opencode/mimo-v2.5-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/north-mini-code-free',
  'opencode/big-pickle',
];
```

Ollama models (configured in `~/.config/opencode/opencode.json`):
- `ollama/deepseek-coder` — Default local model
- `ollama/llama2` — Available via Ollama

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

## Project Page Components

The Projects page (`apps/dashboard/src/pages/Projects.tsx`) uses extracted components in `apps/dashboard/src/components/`:

| Component | Purpose |
|-----------|---------|
| `StatsBar` | 4-card stats grid |
| `ProjectCard` | Project list item with progress bar, quick-actions menu |
| `TaskItem` | Task row with inline editing, sub-tasks, tags, time tracking |
| `KanbanBoard` | Drag-and-drop 4-column board (Todo → In Progress → Review → Done) |
| `ProjectForm` | Modal form for create/edit project |
| `TaskForm` | Modal form for create/edit task |
| `ActivityTimeline` | Vertical timeline with colored dots |
| `BulkActions` | Bulk operation bar (status change, select all/clear) |
| `ConfirmDialog` | Styled confirmation dialog replacing `confirm()` |

Data fetching lives in `apps/dashboard/src/hooks/useProjects.ts` using the SWR caching pattern from `useSWR.ts`.

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
10. **Project service is decorated** — `app.projectService` is available on `VestaraApp` (decorated in `api/src/index.ts`)
11. **DB migrations are additive** — New columns use `ALTER TABLE ... ADD COLUMN` with `PRAGMA table_info` checks

## OpenCode Integration

### Web UI Embedding

OpenCode runs as a headless server (`opencode serve`) on port 4096. The dashboard embeds it via iframe:

```tsx
// OpenCode page starts the server with a project directory
const res = await fetch('/api/providers/opencode/start', {
  method: 'POST',
  body: JSON.stringify({ cwd: project.path }),
});
// → { status: 'started', port: 4096, serverUrl: 'http://localhost:4096' }
```

### Theme Injection

OpenCode reads its theme from localStorage and CSS variables. Vestara injects a custom theme:

```typescript
// apps/dashboard/src/lib/opencode-theme.ts
import { seedVestaraThemeInIframe, injectVestaraTheme } from '../lib/opencode-theme';

// After iframe loads:
seedVestaraThemeInIframe(iframe);  // Sets localStorage keys
injectVestaraTheme(iframe, 'dark'); // Injects <style> with --v2-* variable mappings
```

The theme maps Vestara's color palette to OpenCode's `--v2-*` CSS variables:
- `--v2-background-bg-deep` → `#06060C` (vestara-bg)
- `--v2-text-text-base` → `#E8ECF1` (vestara-text)
- `--v2-text-text-accent` → `#C9A84C` (vestara-gold)

### Provider Configuration

OpenCode providers are configured in `~/.config/opencode/opencode.json`:

```json
{
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": { "baseURL": "http://localhost:11434/v1" },
      "models": {
        "deepseek-coder": { "name": "DeepSeek Coder" },
        "llama2": { "name": "Llama 2" }
      }
    }
  },
  "model": "ollama/deepseek-coder"
}
```

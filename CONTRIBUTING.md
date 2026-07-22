# Contributing to Vestara AI OS

Thank you for your interest in contributing! This guide will help you get started.

---

## Development Setup

### Prerequisites

- Node.js ≥22
- pnpm ≥10
- Docker (optional)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/evillan0315/vestara-ai-os.git
cd vestara-ai-os

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development servers
pnpm dev
```

## Project Structure

```
vestara-ai-os/
├── apps/dashboard/              # React frontend (16 pages)
├── services/core/               # @vestara/core (SQLite wrapper + services)
├── services/api/                # Fastify API server (20 route modules)
├── services/agents/             # @vestara/agents (Agent runtime)
├── services/memory/             # @vestara/memory (Memory service)
├── services/notifications/      # @vestara/notifications (Notification service)
├── packages/                    # Shared monorepo packages
│   ├── types/                   # @vestara/types — TypeScript types
│   ├── validation/              # @vestara/validation — Zod schemas
│   ├── constants/               # @vestara/constants — Constants
│   ├── utils/                   # @vestara/utils — Utilities
│   ├── config/                  # @vestara/config — Configuration
│   ├── cli/                     # @vestara/cli — Command-line interface
│   ├── deb/                     # @vestara/deb — Debian package definitions
│   ├── immutable/               # @vestara/immutable — A/B system, rollback, Secure Boot
│   └── iso/                     # @vestara/iso — Custom ISO builder
├── scripts/                     # Build, deploy, and maintenance scripts
├── systemd/                     # Service unit files
├── branding/                    # Plymouth boot theme, icons
├── docker-compose.yml           # Full stack (API + Dashboard + Ollama)
├── docker-compose.dev.yml       # Development mode
├── Dockerfile                   # API server image
├── Dockerfile.dashboard         # Dashboard image
└── .github/workflows/           # CI/CD pipelines (6 workflows)
```

## Code Style

### TypeScript

- Strict mode enabled
- Use explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use `readonly` for immutable data

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `memory-service.ts`)
- **Classes**: `PascalCase` (e.g., `MemoryService`)
- **Functions**: `camelCase` (e.g., `getMemory`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_MODEL`)
- **Routes**: `/api/resource` (e.g., `/api/memory`)

### React Components

- Functional components only
- Use hooks for state and side effects
- Keep components small and focused
- Co-locate related files

### API Routes

- All route functions accept `VestaraApp` (from `../types.ts`), not `FastifyInstance`
- Use `authMiddleware` for protected routes
- Return appropriate HTTP status codes
- Validate input with Zod schemas

### Database

- Use `better-sqlite3` wrapper (`Database` class from `@vestara/core`)
- Tables use `snake_case` columns
- Always include `created_at` and `updated_at` timestamps

## Git Workflow

### Branches

- `main` — Production-ready code
- `develop` — Development branch
- `feat/*` — New features
- `fix/*` — Bug fixes
- `docs/*` — Documentation changes

### Commit Messages

Use conventional commits:

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
ci: CI/CD changes
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm lint` to check code style
4. Run `pnpm typecheck` to verify types
5. Run `pnpm build` to ensure everything compiles
6. Commit with a clear message
7. Push and create a pull request

## CI/CD

The project uses GitHub Actions with 6 workflows:

| Workflow | Trigger | Description |
|----------|---------|-------------|
| CI | Push to `main`/`develop`, PRs | Lint, typecheck, build, test, Docker build, security scan |
| Deploy Development | Push to `develop` | Auto-deploy to development |
| Deploy Staging | Push to `main` | Auto-deploy to staging |
| Deploy Production | Manual dispatch | Deploy to production |
| Nightly Build | Daily at 2 AM UTC | Build nightly Docker images |
| Release | Push tag `v*` | Build Docker images, .deb packages, ISO, and release |

### Running CI Locally

Before pushing, run all CI checks locally:

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter=@vestara/core test

# Run tests in watch mode
pnpm test:watch
```

## Docker

### Full Stack

```bash
docker compose up -d
```

### Development Mode

```bash
docker compose -f docker-compose.dev.yml up
```

### Building Images

```bash
# Build API image
docker build -t vestara-api .

# Build Dashboard image
docker build -t vestara-dashboard -f Dockerfile.dashboard .
```

## Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | System overview with charts |
| Login | `/login` | OS-based authentication |
| AI Chat | `/chat` | Chat with AI models |
| OpenCode | `/opencode` | OpenCode with chat history |
| Agents | `/agents` | Agent management |
| Models | `/models` | AI model manager |
| Memory | `/memory` | Memory store |
| Projects | `/projects` | Project and task management |
| Knowledge | `/knowledge` | Knowledge base |
| Terminal | `/terminal` | Terminal with Vestara CLI |
| Files | `/files` | File manager (tree, editor, operations) |
| System | `/monitor` | Resource monitor with charts |
| Scripts | `/scripts` | Script runner with documentation |
| Logs | `/logs` | Real-time log viewer |
| Users | `/users` | User management (admin) |
| Settings | `/settings` | Configuration |

## API Routes

### Public Routes (no auth required)

- `/api/health` — Health check
- `/api/system/*` — System stats, info, exec
- `/api/providers/opencode/*` — OpenCode endpoints

### Protected Routes (auth required)

- `/api/auth/*` — Authentication endpoints
- `/api/users/*` — User management
- `/api/chat/*` — AI chat
- `/api/agents/*` — Agent management
- `/api/memory/*` — Memory operations
- `/api/knowledge/*` — Knowledge base
- `/api/projects/*` — Project management

## Documentation

- Keep blueprints updated when adding features
- Update API documentation for new endpoints
- Add JSDoc comments for public APIs
- Update AGENTS.md if adding new conventions

## Questions?

Open an issue on GitHub or reach out to the maintainers.

### GitHub Actions

The project uses GitHub Actions with 6 workflows:

| Workflow | Trigger | Description |
|----------|---------|-------------|
| CI | Push to `main`/`develop`, PRs | Lint, typecheck, build, test, Docker build, security scan |
| Deploy Development | Push to `develop` | Auto-deploy to development |
| Deploy Staging | Push to `main` | Auto-deploy to staging |
| Deploy Production | Manual dispatch | Deploy to production |
| Nightly Build | Daily at 2 AM UTC | Build nightly Docker images |
| Release | Push tag `v*` | Build and release packages |

### Running CI Locally

Before pushing, run all CI checks locally:

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter=@vestara/core test

# Run tests in watch mode (if configured)
pnpm test:watch
```

## Docker

### Full Stack

```bash
docker compose up -d
```

### Development Mode

```bash
docker compose -f docker-compose.dev.yml up
```

### Building Images

```bash
# Build API image
docker build -t vestara-api .

# Build Dashboard image
docker build -t vestara-dashboard -f Dockerfile.dashboard .
```

## Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | System overview with charts |
| Login | `/login` | OS-based authentication |
| AI Chat | `/chat` | Chat with AI models |
| OpenCode | `/opencode` | OpenCode with chat history |
| Agents | `/agents` | Agent management |
| Models | `/models` | AI model manager |
| Memory | `/memory` | Memory store |
| Projects | `/projects` | Project and task management |
| Knowledge | `/knowledge` | Knowledge base |
| Terminal | `/terminal` | Terminal with Vestara CLI |
| Files | `/files` | File manager (tree, editor, operations) |
| System | `/monitor` | Resource monitor with charts |
| Scripts | `/scripts` | Script runner with documentation |
| Users | `/users` | User management (admin) |
| Settings | `/settings` | Configuration |

## API Routes

### Public Routes (no auth required)

- `/api/health` — Health check
- `/api/system/*` — System stats, info, exec
- `/api/providers/opencode/*` — OpenCode endpoints

### Protected Routes (auth required)

- `/api/auth/*` — Authentication endpoints
- `/api/users/*` — User management
- `/api/chat/*` — AI chat
- `/api/agents/*` — Agent management
- `/api/memory/*` — Memory operations
- `/api/knowledge/*` — Knowledge base
- `/api/projects/*` — Project management

## Documentation

- Keep blueprints updated when adding features
- Update API documentation for new endpoints
- Add JSDoc comments for public APIs
- Update AGENTS.md if adding new conventions

## Questions?

Open an issue on GitHub or reach out to the maintainers.

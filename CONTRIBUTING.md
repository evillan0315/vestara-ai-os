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
├── apps/dashboard/          # React frontend
├── services/core/           # Core library (SQLite, services)
├── services/api/            # Fastify API server
├── packages/                # Shared packages
│   ├── types/               # TypeScript types
│   ├── validation/          # Zod schemas
│   ├── constants/           # Constants
│   ├── utils/               # Utilities
│   ├── config/              # Configuration
│   └── cli/                 # CLI tool
├── scripts/                 # Build scripts
├── systemd/                 # Service files
└── blueprints/              # Documentation
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

- RESTful conventions
- Use auth middleware for protected routes
- Return appropriate HTTP status codes
- Validate input with Zod schemas

## Git Workflow

### Branches

- `main` — Production-ready code
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
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm build` to ensure everything compiles
4. Run `pnpm lint` to check code style
5. Commit with a clear message
6. Push and create a pull request

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter=@vestara/core test

# Run tests in watch mode
pnpm test:watch
```

## Documentation

- Keep blueprints updated when adding features
- Update API documentation for new endpoints
- Add JSDoc comments for public APIs

## Questions?

Open an issue on GitHub or reach out to the maintainers.

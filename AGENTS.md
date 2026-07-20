# AGENTS.md

This file contains instructions for AI agents working on the Vestara AI OS codebase.

---

## Project Overview

Vestara AI OS is a portable AI operating system that boots from an external SSD. It provides a complete AI workstation on any x86-64 computer.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js ≥22
- **Package Manager**: pnpm (workspace)
- **Build**: Turborepo
- **API**: Fastify 5
- **Database**: SQLite (better-sqlite3)
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4
- **AI**: OpenCode, OpenAI, Anthropic, Google, Ollama

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

- `@vestara/dashboard` — React dashboard (10 pages)

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

- Use `authMiddleware` for protected routes
- Validate input with Zod schemas
- Return appropriate HTTP status codes

### Database

- Use `better-sqlite3` for SQLite
- Tables use `snake_case` columns
- Always include `created_at` and `updated_at` timestamps

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

# API Configuration
PORT=3000
NODE_ENV=development
DATABASE=/path/to/vestara.db
```

## Git Workflow

- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Create feature branches from `main`
- Run `pnpm build` before committing
- Keep commits focused and atomic

## Important Notes

1. **OpenCode is the default provider** — All chat features work without API keys
2. **Ollama is NOT auto-started** — It loads on-demand when a local model is selected
3. **SQLite is the database** — No PostgreSQL, no MySQL
4. **No comments in code** — Unless explicitly requested
5. **Follow existing patterns** — Look at neighboring files before adding new code

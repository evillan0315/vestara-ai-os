---
name: testing-and-quality
description: >-
  Use when writing, running, or debugging tests, linting, type-checking, or
  formatting code. Triggers on keywords: test, spec, jest, vitest, supertest,
  lint, eslint, typecheck, tsc, prettier, format, coverage, CI, quality gate,
  QA, code review, PR checklist. Also use when the task involves verifying code
  correctness before committing or merging.
---

# Testing & Quality

This project follows strict quality practices. Always adhere to these standards
when writing or modifying code, running quality checks, or reviewing pull
requests.

---

## 1. Running Quality Checks

### All at once

```bash
pnpm lint      # ESLint across all workspace packages
pnpm typecheck # TypeScript strict type checking
pnpm format:check # Prettier formatting check
pnpm test      # Run all tests (requires prior build)
```

### By workspace

```bash
pnpm lint --filter=@vestara/api
pnpm typecheck --filter=@vestara/web
pnpm test --filter=@vestara/api
```

### Formatting

```bash
pnpm format              # Write formatting changes
pnpm format:check        # Check only (CI-safe)
```

### Prisma checks

Always run `pnpm prisma:generate` after any schema change before type-checking:

```bash
pnpm prisma:generate
pnpm typecheck --filter=@vestara/api
```

---

## 2. Test Conventions

### Test runner

The project uses **vitest** (or Jest-compatible runner). Tests use global
`describe`, `it`, `expect`, `beforeAll`, `beforeEach`, `afterAll`,
`afterEach`.

### File naming

- Place test files in a `tests/` directory inside the workspace package.
- Name test files `*.test.ts` (for unit/integration) or `*.spec.ts`
  (for behavioral/e2e tests).
- Mirror the source directory structure inside `tests/`.

Example:

```
apps/api/
  src/
    routes/
      auth.routes.ts
  tests/
    routes/
      auth.test.ts
```

### API tests

Use `supertest` to test HTTP endpoints. Import `createApp` from the app
factory, not the server entry point:

```typescript
import request from 'supertest';
import { createApp } from '../src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp();
```

### Database cleanup

Each test suite must clean shared state in `beforeEach`. Always clean
dependent tables first (respect foreign key order):

```typescript
beforeEach(async () => {
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});
```

### Test structure pattern

Every test should follow the **Arrange-Act-Assert** pattern:

```typescript
describe('POST /resource', () => {
  it('should create a resource successfully', async () => {
    // Arrange
    const input = { name: 'test' };

    // Act
    const response = await request(app).post('/api/v1/resource').send(input).expect(201);

    // Assert
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(input.name);
  });

  it('should return 409 for duplicate', async () => {
    // ... duplicate test
  });
});
```

### What to test

| Layer                  | Focus                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **API routes**         | HTTP status codes, response shape, success/error payloads, auth guards, input validation |
| **Services**           | Business logic in isolation, edge cases, error conditions                                |
| **Validation schemas** | Zod schemas — valid input passes, invalid input fails with correct error codes           |
| **Middleware**         | Auth guards, role checks, request enrichment                                             |
| **Repository layer**   | Database queries, filtering, pagination                                                  |

### Response format

All API responses follow a standard envelope:

```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

Always test for `response.body.success` and error codes, not just HTTP
status.

---

## 3. Quality Gates

Every pull request must pass:

- ✅ **ESLint**: zero errors, zero warnings (warnings fail in CI)
- ✅ **TypeScript**: strict mode, no `any`, no errors
- ✅ **Prettier**: formatting must match `prettier --check`
- ✅ **Tests**: all tests pass on CI (tests require prior `build`)
- ✅ **No `console.log`**: only `console.warn` and `console.error` allowed

### ESLint rules (non-negotiable)

| Rule                                 | Enforcement                                            |
| ------------------------------------ | ------------------------------------------------------ |
| `@typescript-eslint/no-unused-vars`  | `error` — prefix unused params with `_`                |
| `@typescript-eslint/no-explicit-any` | `warn` — avoid `any`; prefer `unknown`                 |
| `no-console`                         | `warn` — only `console.warn` / `console.error` allowed |
| `prefer-const`                       | `error`                                                |
| `no-var`                             | `error`                                                |

### TypeScript strictness

The project uses strict TypeScript. Key rules enforced across all
`tsconfig.json` files:

- `strict: true`
- `noUncheckedIndexedAccess`: true
- `exactOptionalPropertyTypes`: false
- Path aliases (`@vestara/*`) must resolve correctly

### Formatting (Prettier)

Configured in root Prettier config with `prettier-plugin-tailwindcss`.
Always run `pnpm format` before committing to avoid formatting noise in
diffs.

---

## 4. Edge Cases to Cover in Tests

When writing tests, always consider:

- **Null/undefined inputs**: Zod schemas should catch these
- **Empty collections**: empty arrays, no matching records
- **Boundary values**: pagination limits, string max lengths, numeric bounds
- **Invalid IDs**: UUID format, non-existent references
- **Auth/authorization**: unauthenticated, wrong role, expired token
- **Concurrent requests**: race conditions on create/update
- **Idempotency**: repeated requests should not produce duplicate resources

---

## 5. Test-Driven Development (TDD) Workflow

When implementing a new feature, prefer this workflow:

1. **Write the validation schema** (Zod) first
2. **Write integration tests** for the expected API behavior
3. **Run tests** — they should fail (red)
4. **Implement the endpoint** — routes, service, repository
5. **Run tests** — they should pass (green)
6. **Run full quality suite**: `pnpm lint && pnpm typecheck && pnpm test`
7. **Commit**

---

## 6. CI Pipeline

The CI pipeline (GitHub Actions) runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm build`
5. `pnpm test`

Always run these steps locally before pushing. If `pnpm test` requires a
database, ensure the test helper starts an in-memory or test-mode database
connection.

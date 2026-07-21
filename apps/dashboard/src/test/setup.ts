import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Polyfill ResizeObserver for jsdom (used by OpenCode page, Dashboard charts)
if (typeof ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).ResizeObserver = ResizeObserverMock;
}

// Mock global fetch for /api/* calls that use relative URLs.
// In jsdom, new URL('/api/...') fails without a base URL.
// Pages handle HTTP errors (res.ok === false) in catch blocks,
// which keeps vitest from reporting unhandled rejections.
const originalFetch = globalThis.fetch;
globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return Promise.resolve(
      new Response(JSON.stringify({ error: 'mocked' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
  return originalFetch(input, init);
});

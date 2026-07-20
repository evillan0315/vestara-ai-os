# Vestara AI OS

A portable AI operating system that boots from an external SSD.

Plug into any x86-64 computer, power on, and your complete AI environment is ready. Models, projects, memories, settings — everything travels with you.

---

## Quick Start

```bash
# On a Debian 13 system
curl -sSL https://get.vestara.ai | bash

# Or clone and build locally
git clone https://github.com/evillan0315/vestara-ai-os.git
cd vestara-ai-os
pnpm install
pnpm build
```

## Documentation

- [Vision](./blueprints/00-vision.md) — What Vestara AI OS is and why it exists
- [Architecture](./blueprints/01-architecture.md) — Fastify + SQLite + React stack
- [Boot Experience](./blueprints/02-boot-experience.md) — Auto-login, systemd services
- [Services](./blueprints/03-services.md) — Lightweight AI services
- [Filesystem](./blueprints/04-filesystem.md) — Purpose-built filesystem layout
- [Desktop](./blueprints/05-desktop.md) — 12-screen dark glassmorphism UI
- [Applications](./blueprints/06-applications.md) — Built-in AI applications
- [Implementation Roadmap](./blueprints/07-implementation-roadmap.md) — 4-stage build plan

## Architecture

```
┌─────────────────────────────────────┐
│         Vestara Dashboard           │
│  React · Tailwind · Glassmorphism   │
├─────────────────────────────────────┤
│         Vestara API                 │
│  Fastify · WebSocket · REST         │
├─────────────────────────────────────┤
│         AI Services                 │
│  OpenCode · Agent Runtime ·         │
│  Memory · Provider Manager          │
├─────────────────────────────────────┤
│         Data Layer                  │
│  SQLite · JSON · File Storage       │
├─────────────────────────────────────┤
│         System Layer                │
│  systemd · Auto-login · Branding    │
├─────────────────────────────────────┤
│         Tiny Linux                  │
│  Debian Minimal · Docker · Ollama   │
└─────────────────────────────────────┘
```

## Resource Budget

| Component | RAM |
|---|---|
| Tiny Linux | 500–700 MB |
| Vestara services | ~150 MB |
| Dashboard (Chromium) | ~150 MB |
| **Total (cloud APIs)** | **~1 GB** |
| **Available for work** | **~7 GB** |

## License

Proprietary — Vestara

# Vestara AI OS

A complete AI workstation that boots from an external SSD.

Plug into any x86-64 computer, power on, and enter the Vestara ecosystem.

---

## Quick Start

```bash
# On a Debian 13 system
curl -sSL https://get.vestara.ai | bash

# Or clone and build locally
git clone https://github.com/vestara/vestara-ai-os.git
cd vestara-ai-os
pnpm install
pnpm build
```

## Documentation

- [Vision](./blueprints/00-vision.md) — What Vestara AI OS is and why it exists
- [Architecture](./blueprints/01-architecture.md) — Layered architecture from kernel to application
- [Boot Experience](./blueprints/02-boot-experience.md) — From power-on to desktop
- [Services](./blueprints/03-services.md) — systemd-managed AI services
- [Filesystem](./blueprints/04-filesystem.md) — Purpose-built filesystem layout
- [Desktop](./blueprints/05-desktop.md) — The Vestara Workspace
- [Applications](./blueprints/06-applications.md) — Built-in AI applications
- [Implementation Roadmap](./blueprints/07-implementation-roadmap.md) — Four-stage build plan

## Architecture

```
┌─────────────────────────────────────┐
│         Applications                │
├─────────────────────────────────────┤
│         Vestara Workspace           │
├─────────────────────────────────────┤
│         Vestara Services            │
├─────────────────────────────────────┤
│         Vestara Core                │
├─────────────────────────────────────┤
│         Debian 13 (Trixie)          │
└─────────────────────────────────────┘
```

## License

Proprietary — Vestara

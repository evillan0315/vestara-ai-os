# Vestara AI OS — Vision

> A portable AI operating system that boots from an external SSD.
> Plug into any x86-64 computer, power on, and your complete AI environment is ready.
> Models, projects, memories, settings — everything travels with you.

---

## The Experience

```
Power On
    ▼
Portable SSD
    ▼
Tiny Linux
    ▼
Auto Login (OS-based auth)
    ▼
AI Platform
    ├── Dashboard (14 pages)
    ├── AI Chat (streaming)
    ├── OpenCode (CLI + chat history)
    ├── Agents (8 built-in + custom)
    ├── Models (multi-provider)
    ├── Memory (auto-consolidation)
    ├── Knowledge (RAG search)
    ├── Terminal (Vestara CLI)
    ├── File Manager (tree + editor)
    ├── System Monitor (real-time)
    ├── Scripts (build/deploy/maintain)
    └── User Management (admin)
    ▼
Everything is ready
```

The user never sees Debian. The OS is a lightweight foundation. The experience is **Vestara**.

---

## Core Principles

1. **Portable** — Boot from an external SSD. Nothing installed on the host computer. Your entire AI workstation in your pocket.
2. **Lightweight** — Idle under 700MB RAM. Leave headroom for development and AI tasks.
3. **Branded** — Every touchpoint carries the Vestara identity. No exposed Debian branding.
4. **Auto-start** — OpenCode, Dashboard, API, Memory, Provider Manager start automatically. Ollama loads only when you select a local model.
5. **Offline-capable** — Works with local models (Ollama) or cloud APIs. No internet required.
6. **Zero footprint** — Leaves no traces on the host system after shutdown.

---

## Target Hardware

- Any x86-64 computer (laptop, desktop, workstation)
- Minimum: 8GB+ RAM, SSD
- Recommended: 16GB+ RAM, SSD, discrete GPU (NVIDIA for local model inference)
- Boot media: Samsung T9 or equivalent external SSD (USB 3.2 Gen 2x2)

---

## Resource Budget (8GB Machine)

| Component | RAM |
|---|---|
| Tiny Linux | 500–700 MB |
| OpenCode | ~300 MB |
| Dashboard/API | ~200 MB |
| SQLite | negligible |
| **Total (cloud APIs)** | **~1–2 GB** |
| **Available for local model** | **~6 GB** |

---

## What Makes This Different

| Traditional Linux Distros | Vestara AI OS |
|---|---|
| Generic desktop environment | Purpose-built AI workstation |
| Manual AI tool setup | Everything pre-configured |
| App-by-app installation | Integrated AI platform |
| User manages everything | Automated service orchestration |
| One-size-fits-all | Portable, private, personal |
| Leaves traces on host | Zero footprint |
| Password-based auth | OS-based authentication |

---

## Related Documents

- [Architecture](./01-architecture.md)
- [Boot Experience](./02-boot-experience.md)
- [Services](./03-services.md)
- [Filesystem](./04-filesystem.md)
- [Desktop](./05-desktop.md)
- [Applications](./06-applications.md)
- [Implementation Roadmap](./07-implementation-roadmap.md)

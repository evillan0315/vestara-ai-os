# Vestara AI OS — Vision

> A complete AI workstation that boots from an external SSD.
> Plug into any x86-64 computer, power on, and enter the Vestara ecosystem.

---

## The Experience

```
Power On
    ▼
VESTARA Logo
    ▼
AI OS Boot Animation
    ▼
Encrypted Disk Unlock
    ▼
Vestara Login
    ▼
Desktop
    ▼
AI Companion automatically starts
    ▼
Everything is ready
```

The user never sees Debian. Debian becomes merely the kernel and package ecosystem. The experience is **Vestara**.

---

## Core Principles

1. **Identity-first** — Every service is scoped to an organization and user. Multi-tenant from day one.
2. **Portable** — Boot from an external SSD. Nothing installed on the host computer. Your entire AI workstation in your pocket.
3. **Branded** — Every touchpoint (boot, login, desktop, apps) carries the Vestara identity. No exposed Debian branding.
4. **Service-oriented** — AI capabilities are systemd services. The desktop is just another consumer.
5. **Stable foundation** — Debian Stable as the base. We add layers, not forks.

---

## Target Hardware

- Any x86-64 computer (laptop, desktop, workstation)
- Minimum: 8GB+ RAM, SSD
- Recommended: 16GB+ RAM, SSD, discrete GPU (NVIDIA for local model inference)
- Boot media: Samsung T9 or equivalent external SSD (USB 3.2 Gen 2x2)

---

## What Makes This Different

| Traditional Linux Distros | Vestara AI OS |
|---|---|
| Generic desktop environment | Purpose-built AI workspace |
| Manual AI tool setup | AI services pre-configured |
| App-by-app installation | Integrated AI applications |
| User manages everything | Automated service orchestration |
| One-size-fits-all | Identity-scoped, multi-tenant |

---

## Related Documents

- [Architecture](./01-architecture.md)
- [Boot Experience](./02-boot-experience.md)
- [Services](./03-services.md)
- [Filesystem](./04-filesystem.md)
- [Desktop](./05-desktop.md)
- [Applications](./06-applications.md)
- [Implementation Roadmap](./07-implementation-roadmap.md)

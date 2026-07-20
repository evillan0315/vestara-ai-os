# Vestara AI OS — Implementation Roadmap

> A staged approach from portable SSD to immutable OS.
> Ship early. Iterate often.

---

## Roadmap Overview

```
Stage 1: Portable SSD        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100% COMPLETE
Stage 2: Vestara Layer        ░░░░░░░░░░░░░░░░  0%
Stage 3: Custom ISO           ░░░░░░░░░░░░░░░░  0%
Stage 4: Immutable OS         ░░░░░░░░░░░░░░░░  0%
```

**Stage 1: COMPLETE**

---

## Stage 1: Portable SSD

> Boot from USB. All services running. Dashboard accessible.

### Goals

- [x] Debian 13 minimal boots from external SSD
- [x] Auto-login as `ai` user
- [x] All Vestara services start via systemd
- [x] Dashboard accessible at localhost:5173
- [x] AI Chat works with OpenAI/Anthropic/Google/Ollama
- [x] Ollama starts on-demand
- [x] OS build script creates bootable SSD image

### Completed

```
✅ Foundation
  ├── Monorepo structure (pnpm + Turborepo)
  ├── 6 shared packages (types, validation, constants, utils, config, cli)
  ├── @vestara/core library (SQLite, events, logging)
  └── SQLite schema (16 tables)

✅ API Server
  ├── Fastify 5 with 12 route modules
  ├── Health endpoint
  ├── Auth routes (JWT)
  ├── Provider management
  ├── Chat endpoints (SSE streaming)
  ├── Conversation CRUD
  ├── Agent management + runtime
  ├── Memory service with consolidation
  ├── Knowledge base with search
  ├── System stats
  ├── OpenCode integration
  └── WebSocket support

✅ Dashboard (10 pages)
  ├── Dashboard — System overview
  ├── AI Chat — Streaming chat
  ├── OpenCode — OpenCode integration
  ├── Agents — Agent management
  ├── Models — Model manager
  ├── Memory — Memory store
  ├── Knowledge — Knowledge base
  ├── Terminal — Built-in terminal
  ├── System — Resource monitor
  └── Settings — Configuration

✅ AI Integration
  ├── AI provider abstraction (OpenAI, Anthropic, Google, Ollama)
  ├── AIRouter with fallback logic
  ├── OpenCode provider (server + CLI)
  ├── Agent runtime with tool execution
  ├── Memory service with consolidation
  └── Knowledge service with search

✅ System Integration
  ├── systemd service files
  ├── Plymouth boot theme
  ├── Docker Compose (full stack)
  ├── Dockerfiles (API + Dashboard)
  ├── OS build script (build-ssd.sh)
  ├── Backup script (backup.sh)
  └── Vestara CLI tool
```

### Stage 1 Deliverable

**A Samsung T9 SSD that boots into Vestara AI OS on any x86-64 computer.**

The user plugs in the SSD, powers on, selects USB boot, and enters a fully functional AI workstation. All services are running. The dashboard is ready.

---

## Stage 2: Vestara Layer

> Build as installable packages. One-command installer for Debian.

### Goals

- [ ] All Vestara components are `.deb` packages
- [ ] Signed APT repository
- [ ] One-command installer
- [ ] Automatic updates

### Planned

```
Tasks:
├── Create Debian packages
│   ├── vestara-core
│   ├── vestara-api
│   ├── vestara-dashboard
│   └── vestara-systemd
├── Set up APT repository (GPG-signed)
├── One-command installer script
└── Automatic update system
```

### Stage 2 Deliverable

**A one-command installer that transforms any Debian 13 system into Vestara AI OS.**

---

## Stage 3: Custom ISO

> Branded installer. No visible Debian branding.

### Goals

- [ ] Custom ISO boots into Vestara installer
- [ ] No Debian branding during install
- [ ] Guided installation wizard
- [ ] Recovery tools

### Stage 3 Deliverable

**A branded ISO that boots directly into Vestara AI OS installer.**

---

## Stage 4: Immutable OS

> A/B updates, read-only system, automatic rollback.

### Goals

- [ ] Read-only system partition
- [ ] A/B partition scheme
- [ ] Atomic updates
- [ ] Automatic rollback
- [ ] Optional Secure Boot

### Stage 4 Deliverable

**A production-grade immutable AI operating system.**

---

## Technical Milestones

| Milestone | Status | Stage |
|---|---|---|
| Monorepo setup | ✅ Complete | 1 |
| Core library | ✅ Complete | 1 |
| API server | ✅ Complete | 1 |
| Dashboard (10 pages) | ✅ Complete | 1 |
| AI provider abstraction | ✅ Complete | 1 |
| Agent runtime | ✅ Complete | 1 |
| Memory service | ✅ Complete | 1 |
| Knowledge service | ✅ Complete | 1 |
| OpenCode integration | ✅ Complete | 1 |
| Docker support | ✅ Complete | 1 |
| OS build script | ✅ Complete | 1 |
| CLI tool | ✅ Complete | 1 |
| Plymouth boot theme | ✅ Complete | 1 |
| Backup script | ✅ Complete | 1 |
| First `.deb` package | ⬜ Pending | 2 |
| One-command installer | ⬜ Pending | 2 |
| Custom ISO boots | ⬜ Pending | 3 |
| Installer works | ⬜ Pending | 3 |
| A/B updates working | ⬜ Pending | 4 |
| Version 1.0 release | ⬜ Pending | 4 |

---

## Success Criteria

### Stage 1 — ✅ COMPLETE

- [x] Build script creates bootable SSD image
- [x] All services start and report healthy
- [x] Dashboard loads and is usable
- [x] AI Chat works with cloud APIs and free OpenCode models
- [x] Ollama starts on-demand
- [x] CLI tool manages services

### Stage 2

- `apt install vestara-*` completes without errors
- One-command installer works on clean Debian
- CLI tool manages all services
- Updates install cleanly

### Stage 3

- ISO boots on 3+ different hardware configurations
- Installation completes in under 30 minutes
- No Debian branding visible during install
- Recovery tools work

### Stage 4

- System updates are atomic
- Failed updates auto-rollback within 1 boot
- Boot time under 15 seconds
- Memory usage under 1.5GB idle

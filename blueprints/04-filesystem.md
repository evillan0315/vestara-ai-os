# Vestara AI OS — Filesystem Layout

> A clean, purpose-built filesystem.
> User data lives under `/home/ai/`. Platform code lives in `/opt/vestara/`.

---

## Filesystem Hierarchy

```
/                           # Root
├── boot/                   # Kernel and bootloader
│   ├── vmlinuz             # Linux kernel
│   ├── initrd.img          # Initial ramdisk
│   └── grub/               # GRUB bootloader
├── etc/
│   ├── systemd/
│   │   └── system/
│   │       ├── vestara-*.service     # Service unit files
│   │       └── vestara.target
│   └── vestara/
│       └── system.toml               # System configuration
├── opt/
│   └── vestara/                       # Platform installation
│       ├── bin/                       # CLI tools
│       │   ├── vestara                # Main CLI
│       │   ├── vestara-setup          # Initial setup
│       │   └── vestara-update         # System updater
│       ├── lib/                       # Shared libraries
│       │   └── @vestara/
│       │       ├── core/              # @vestara/core
│       │       ├── types/             # @vestara/types
│       │       ├── validation/        # @vestara/validation
│       │       ├── constants/         # @vestara/constants
│       │       └── utils/             # @vestara/utils
│       ├── services/                  # Service applications
│       │   ├── api/                   # Fastify API
│       │   ├── memory/                # Memory service
│       │   ├── agents/                # Agent manager
│       │   └── notifications/         # Notification service
│       └── dashboard/                 # React dashboard build
├── home/
│   └── ai/                            # Default user
│       ├── vestara/                   # Vestara home
│       │   ├── data/
│       │   │   └── vestara.db         # SQLite database
│       │   ├── logs/                  # Service logs
│       │   ├── backups/               # Database backups
│       │   └── config.toml            # User configuration
│       ├── workspace/                 # Working directory
│       ├── projects/                  # User projects
│       ├── memory/                    # Memory storage
│       │   ├── working/               # Current session
│       │   ├── short-term/            # Recent (24h)
│       │   └── long-term/             # Persistent
│       ├── knowledge/                 # Knowledge base
│       │   ├── documents/             # Indexed documents
│       │   ├── embeddings/            # Vector data
│       │   └── collections/           # Document groups
│       ├── models/                    # Downloaded AI models
│       │   ├── ollama/                # Ollama model storage
│       │   └── custom/                # Custom models
│       ├── agents/                    # Agent configurations
│       │   ├── builtin/               # Built-in agents
│       │   └── custom/                # User-created agents
│       ├── plugins/                   # Installed plugins
│       └── .vestara/                  # Internal config
│           ├── credentials/           # Encrypted API keys
│           └── sessions/              # Session data
└── var/
    ├── log/
    │   └── vestara/                   # System logs
    └── lib/
        └── vestara/                   # Variable state
            └── migrations/            # Database migrations
```

---

## Key Directories

### `/opt/vestara/` — Installation

Read-only platform code. Updated via `vestara-update`.

### `/home/ai/` — User Home

The `ai` user's home directory. Auto-logged in at boot.

### `/home/ai/vestara/` — Vestara Home

All Vestara-specific user data lives here.

### `/home/ai/workspace/` — Working Directory

Default working directory for projects and development.

---

## Storage Layout (External SSD)

```
Samsung T9 (500GB)

├── Partition 1: EFI (512MB)
│   FAT32, /boot/efi
│
├── Partition 2: Boot (1GB)
│   ext4, /boot
│   Kernel, initrd, GRUB
│
├── Partition 3: Root (20GB)
│   ext4, /
│   Debian Minimal + Vestara
│
└── Partition 4: Data (478GB)
    LUKS2 encrypted
    ├── /home/ai/vestara/data/    (database)
    ├── /home/ai/models/          (AI models)
    ├── /home/ai/knowledge/       (documents)
    ├── /home/ai/projects/        (user projects)
    └── /home/ai/vestara/backups/ (backups)
```

---

## Permissions

```
/home/ai/                    ai:ai       755
/home/ai/vestara/            ai:ai       755
/home/ai/vestara/data/       ai:ai       700
/home/ai/vestara/logs/       ai:ai       755
/home/ai/workspace/          ai:ai       755
/home/ai/projects/           ai:ai       755

/opt/vestara/                root:root   755
/opt/vestara/services/       root:ai     750

/etc/vestara/                root:ai     660
```

---

## Encryption Layout

```
┌─────────────────────────────────────┐
│ LUKS2 Encrypted Partition           │
│ /dev/sda4 (Data partition)         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ /home/ai/vestara/data/         │ │
│ │ └── vestara.db                 │ │
│ ├─────────────────────────────────┤ │
│ │ /home/ai/models/               │ │
│ │ ├── ollama/                    │ │
│ │ └── custom/                    │ │
│ ├─────────────────────────────────┤ │
│ │ /home/ai/knowledge/            │ │
│ │ ├── documents/                 │ │
│ │ └── embeddings/                │ │
│ ├─────────────────────────────────┤ │
│ │ /home/ai/projects/             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ /home/ai/.vestara/credentials/ │ │
│ │ └── (encrypted API keys)       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**What's encrypted:**
- All user data (knowledge, memory, conversations)
- AI models
- Database
- Credentials and API keys
- Projects and code

**What's NOT encrypted:**
- `/opt/vestara/` binaries (read-only, public)
- `/boot/` (kernel, bootloader)

---

## Comparison with Standard Linux

| Path | Standard Linux | Vestara AI OS |
|---|---|---|
| `/home/user/` | User data | User data + Vestara workspace |
| `/opt/` | Third-party software | Vestara installation |
| `/etc/` | System config | System config + Vestara config |
| `/var/lib/` | Variable state | Service state |
| `/home/ai/vestara/` | — | **Vestara platform data** |
| `/home/ai/workspace/` | — | **Working directory** |

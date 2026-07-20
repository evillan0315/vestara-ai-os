# Vestara AI OS — Filesystem Layout

> A purpose-built filesystem that reflects the platform's architecture.
> Generic Linux conventions where appropriate, Vestara-specific where meaningful.

---

## Filesystem Hierarchy

```
/                           # Root
├── boot/                   # Kernel and bootloader
│   ├── vmlinuz             # Linux kernel
│   ├── initrd.img          # Initial ramdisk
│   └── grub/               # GRUB bootloader config
├── etc/
│   ├── systemd/
│   │   └── system/
│   │       ├── vestara-*.service      # Service unit files
│   │       └── vestara-workspace.target
│   ├── vestara/
│   │   ├── system.toml               # System-wide configuration
│   │   └── versions.toml             # Installed component versions
│   └── plymouth/
│       └── plymouthd.conf            # Boot splash config
├── opt/
│   └── vestara/                       # Main installation directory
│       ├── bin/                       # CLI tools
│       │   ├── vestara                # Main CLI entrypoint
│       │   ├── vestara-setup          # Initial setup wizard
│       │   └── vestara-update         # System updater
│       ├── lib/                       # Shared libraries
│       │   └── @vestara/
│       │       ├── core/              # @vestara/core
│       │       ├── types/             # @vestara/types
│       │       ├── validation/        # @vestara/validation
│       │       ├── constants/         # @vestara/constants
│       │       ├── utils/             # @vestara/utils
│       │       └── config/            # @vestara/config
│       ├── services/                  # Service applications
│       │   ├── ai-gateway/
│       │   ├── model-router/
│       │   ├── memory/
│       │   ├── knowledge/
│       │   ├── agents/
│       │   ├── workflow/
│       │   ├── notifications/
│       │   └── sync/
│       ├── apps/                      # Desktop applications
│       │   ├── desktop/
│       │   ├── assistant/
│       │   ├── studio/
│       │   ├── terminal/
│       │   └── marketplace/
│       ├── desktop/                   # Desktop shell assets
│       │   ├── themes/
│       │   ├── icons/
│       │   └── fonts/
│       ├── data/                      # Runtime data (encrypted)
│       │   ├── postgres/              # PostgreSQL data directory
│       │   ├── redis/                 # Redis data directory
│       │   ├── models/                # Local AI models (GGUF, etc.)
│       │   └── cache/                 # Application cache
│       ├── .env                       # Environment variables
│       └── config.toml               # Master configuration
├── vestara/                           # Platform-specific (user-facing)
│   ├── ai/                            # AI configurations and prompts
│   │   ├── prompts/                   # System prompts
│   │   ├── models/                    # Model configurations
│   │   └── providers/                 # Provider API configs
│   ├── agents/                        # Agent definitions
│   │   ├── builtin/                   # Built-in agents
│   │   └── custom/                    # User-created agents
│   ├── knowledge/                     # Knowledge base data
│   │   ├── documents/                 # Indexed documents
│   │   ├── embeddings/                # Vector embeddings
│   │   └── indexes/                   # Search indexes
│   ├── memory/                        # Memory storage
│   │   ├── working/                   # Current session memory
│   │   ├── short-term/               # Recent conversations
│   │   └── long-term/                # Persistent memories
│   ├── models/                        # Downloaded AI models
│   │   ├── ollama/                    # Ollama model storage
│   │   └── custom/                    # Custom model files
│   ├── plugins/                       # Installed plugins
│   ├── projects/                      # User projects
│   └── workspace/                     # Workspace state
│       ├── conversations/             # Chat history
│       ├── workflows/                 # Saved workflows
│       └── preferences/              # User preferences
├── home/
│   └── vestara/                       # Default user home
│       ├── .vestara/                  # User-level config
│       │   ├── config.toml           # User configuration
│       │   ├── credentials/          # Encrypted credentials
│       │   └── sessions/             # Session data
│       ├── Documents/                 # User documents
│       ├── Downloads/                 # Downloads
│       └── .local/
│           └── share/
│               └── vestara/          # User-specific data
└── var/
    ├── log/
    │   └── vestara/                   # Service logs
    │       ├── ai-gateway.log
    │       ├── model-router.log
    │       └── ...
    └── lib/
        └── vestara/                   # Variable state data
            ├── migrations/           # Database migrations
            └── tmp/                  # Temporary files
```

---

## Key Directories Explained

### `/opt/vestara/` — Installation

The read-only (or read-mostly) installation directory. Contains all binaries, libraries, and service code. Updated via `vestara-update` with atomic swaps.

**Why `/opt`?**
- Follows FHS convention for third-party software
- Clean separation from Debian packages
- Easy to snapshot, backup, or replace
- Supports A/B update strategy (Stage 4)

### `/vestara/` — Platform Data

The user-facing data directory. This is what Vestara "owns."

**Why a top-level `/vestara`?**
- Immediately identifies Vestara-specific data
- Easy to encrypt as a single mount point
- Clear mental model: `/vestara` = Vestara's world
- Separated from user home (supports multi-user)

### `/etc/vestara/` — System Configuration

System-wide configuration files. Managed by administrators.

### `/home/vestara/` — Default User

The default user account. Created during installation.

---

## Encryption Layout

```
┌─────────────────────────────────────┐
│ LUKS2 Encrypted Partition           │
│ /dev/sda2 (or USB SSD)             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ /vestara                        │ │
│ │ ├── knowledge/                  │ │
│ │ ├── memory/                     │ │
│ │ ├── models/                     │ │
│ │ └── workspace/                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ /opt/vestara/data/              │ │
│ │ ├── postgres/                   │ │
│ │ └── redis/                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ /home/vestara/.vestara/         │ │
│ │ └── credentials/                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**What's encrypted:**
- All user data (knowledge, memory, conversations)
- AI models
- Database files
- Credentials and API keys
- Workspace state

**What's NOT encrypted:**
- `/opt/vestara/` binaries (read-only, public)
- `/etc/vestara/` config (may contain non-sensitive settings)
- `/boot/` (kernel, bootloader)

---

## Filesystem Mount Options

```fstab
# /etc/fstab (excerpt)

# Root filesystem
UUID=xxxx  /        ext4  errors=remount-ro  0 1

# EFI partition
UUID=yyyy  /boot/efi vfat  umask=0077        0 1

# Vestara encrypted data
/dev/mapper/vestara-data  /vestara  ext4  defaults  0 2

# Vestara runtime data
/dev/mapper/vestara-data  /opt/vestara/data  none  bind  0 0
```

---

## Permissions Model

```
/vestara/                    root:vestara   775
/vestara/knowledge/          vestara:vestara 770
/vestara/memory/             vestara:vestara 770
/vestara/models/             vestara:vestara 770
/vestara/projects/           vestara:vestara 770
/vestara/workspace/          vestara:vestara 770

/opt/vestara/                root:root     755
/opt/vestara/services/       root:vestara  750
/opt/vestara/data/           vestara:vestara 770

/etc/vestara/                root:vestara  660
/etc/vestara/system.toml     root:vestara  640
```

**Service user:** `vestara` — dedicated system user for all Vestara services.

```bash
# Create vestara user
useradd --system --shell /usr/sbin/nologin --home-dir /opt/vestara vestara
usermod -aG vestara $USER  # Add real user to vestara group
```

---

## Comparison with Standard Linux

| Path | Standard Linux | Vestara AI OS |
|---|---|---|
| `/etc/` | System config | System config + Vestara config |
| `/opt/` | Third-party software | Vestara installation |
| `/var/lib/` | Variable state | Service state + Vestara data |
| `/home/` | User data | User data + Vestara workspace |
| `/vestara/` | — | **Vestara platform data** |

The key difference: Vestara has a **dedicated top-level directory** that makes the platform's data immediately identifiable and manageable.

---

## Disk Layout (External SSD)

```
Samsung T9 (500GB)

├── Partition 1: EFI (512MB)
│   FAT32, /boot/efi
│
├── Partition 2: Boot (1GB)
│   ext4, /boot
│   Kernel, initrd, GRUB
│
├── Partition 3: Root (50GB)
│   ext4, /
│   Debian + Vestara installation
│   Read-only (Stage 4)
│
└── Partition 4: Vestara Data (448GB)
    LUKS2 encrypted
    ├── /vestara (platform data)
    ├── /opt/vestara/data (runtime data)
    └── /home/vestara (user home)
```

Total: ~500GB external SSD fits a complete AI workstation with room for large models.

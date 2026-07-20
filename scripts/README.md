# Vestara AI OS — Scripts

Management and automation scripts for building, deploying, and maintaining Vestara AI OS.

---

## Quick Reference

| Script | Category | Purpose |
|--------|----------|---------|
| `build-ssd.sh` | Build | Create bootable SSD image |
| `build-deb.sh` | Build | Build .deb packages |
| `build-repo.sh` | Build | Create signed APT repository |
| `build-iso.sh` | Build | Build bootable ISO image |
| `install.sh` | Deploy | One-command installer |
| `deploy.sh` | Deploy | CI/CD deployment |
| `upgrade.sh` | Maintain | Upgrade to latest version |
| `backup.sh` | Maintain | Backup and restore data |

---

## Build Scripts

### build-ssd.sh

Creates a 20GB bootable disk image for the Vestara AI OS portable SSD.

```bash
./scripts/build-ssd.sh
```

**What it does:**

1. Creates a 20GB GPT disk image (`dist/vestara-ai-os.img`)
2. Partitions into EFI (512MB), boot (2GB), and root (remaining)
3. Installs Debian 13 (Trixie) minimal via debootstrap
4. Installs Node.js 22, Docker, Ollama, OpenCode, Chromium
5. Copies and builds the Vestara monorepo
6. Creates `ai` user with auto-login and passwordless sudo
7. Installs systemd services and Plymouth boot theme

**Prerequisites:**
- `debootstrap`, `parted`, `mkfs.ext4`, `mkfs.vfat`, `rsync`, `fakeroot`
- ~20GB free disk space
- Root/loop device access

**Output:**
- `dist/vestara-ai-os.img` — Raw disk image

**Flash to SSD:**
```bash
sudo dd if=dist/vestara-ai-os.img of=/dev/sdX bs=4M status=progress
```

> **Safety:** This script requires `--confirm` flag when run from the dashboard.

---

### build-deb.sh

Builds all five Vestara Debian packages from the compiled monorepo.

```bash
./scripts/build-deb.sh
VERSION=0.2.0 ./scripts/build-deb.sh
```

**Prerequisites:**
- `dpkg-deb`, `fakeroot`
- Built monorepo (`pnpm build` must have been run)

**Packages produced:**

| Package | Description | Dependencies |
|---------|-------------|--------------|
| `vestara-core` | Core library (SQLite, memory, knowledge, agents) | Node.js >= 22 |
| `vestara-api` | Fastify API server | Node.js >= 22, vestara-core |
| `vestara-dashboard` | React dashboard + Nginx config | nginx, vestara-api |
| `vestara-cli` | CLI tool (`/usr/bin/vestara`) | Node.js >= 22 |
| `vestara-systemd` | systemd services + auto-login | systemd |

**Output:**
- `dist/deb/vestara-*.deb` — Five Debian packages

---

### build-repo.sh

Creates a signed APT repository from the built .deb packages.

```bash
./scripts/build-repo.sh
GPG_KEY=mykey ./scripts/build-repo.sh
```

**Prerequisites:**
- `dpkg-scanpackages` (from `dpkg-dev`)
- `gpg`
- Built .deb files (`build-deb.sh` must have been run)

**What it does:**
1. Copies .deb files to `dist/apt/pool/main/`
2. Generates `Packages` and `Packages.gz` index files
3. Creates `Release` file with checksums
4. Generates GPG key if none exists (RSA 4096-bit)
5. Signs Release file (Release.gpg and InRelease)

**Output:**
- `dist/apt/` — Complete APT repository
- `dist/apt/key.gpg` — Public GPG key

**Add to sources.list:**
```bash
curl -fsSL https://repo.vestara.ai/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/vestara.gpg
echo "deb [signed-by=/usr/share/keyrings/vestara.gpg] https://repo.vestara.ai stable main" | sudo tee /etc/apt/sources.list.d/vestara.list
```

---

### build-iso.sh

Builds a custom bootable ISO image with Vestara pre-installed.

```bash
./scripts/build-iso.sh
VERSION=0.2.0 ./scripts/build-iso.sh
```

**Prerequisites:**
- `debootstrap`, `xorriso`, `mksquashfs`, `grub-mkrescue`
- ~10GB free disk space

**What it does:**
1. Bootstraps Debian 13 minimal into a chroot
2. Installs Node.js 22, Docker, Ollama, Chromium
3. Copies and builds the Vestara monorepo
4. Compresses filesystem with squashfs
5. Configures isolinux (BIOS) and GRUB (UEFI) boot menus
6. Creates ISO with xorriso

**Boot menu options:**
- Vestara AI OS (normal)
- Vestara AI OS (Safe Mode — nomodeset)
- Recovery Mode

**Default credentials:** `ai` / `vestara`

**Output:**
- `dist/iso/vestara-ai-os-<version>.iso`

---

## Deploy Scripts

### install.sh

One-command installer for Vestara on Debian/Ubuntu systems.

```bash
curl -fsSL https://get.vestara.ai | bash
```

Or run locally:
```bash
./scripts/install.sh
VESTARA_USER=myuser API_PORT=8080 bash scripts/install.sh
```

**Prerequisites:**
- Debian 13+ or Ubuntu 22.04+
- x86_64 architecture
- Non-root user with sudo
- 8GB+ RAM recommended

**What it does:**
1. Checks system requirements (arch, memory, OS)
2. Installs system dependencies (curl, wget, nginx, git)
3. Installs Node.js 22 via NodeSource
4. Installs Docker
5. Installs Ollama (starts on-demand)
6. Adds Vestara APT repo and installs all .deb packages
7. Creates `ai` user with passwordless sudo
8. Enables and starts systemd services

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `VESTARA_USER` | `ai` | User to create |
| `API_PORT` | `3000` | API server port |
| `DASHBOARD_PORT` | `5173` | Dashboard port |

**Post-install:**
- Dashboard: `http://localhost:5173`
- API: `http://localhost:3000`
- CLI: `vestara status`

---

### deploy.sh

Deployment script for CI/CD and manual deployments.

```bash
./scripts/deploy.sh deploy
DEPLOY_ENV=production ./scripts/deploy.sh deploy
./scripts/deploy.sh health-check
./scripts/deploy.sh rollback
```

**Prerequisites:**
- Vestara codebase at `DEPLOY_PATH`
- `pnpm` installed
- sudo access (for systemd restarts)

**Commands:**

| Command | Description |
|---------|-------------|
| `deploy` | Full deployment pipeline |
| `health-check` | Check API health |
| `rollback` | Rollback to previous version |

**Deploy pipeline:**
1. Pre-deploy checks (correct user, directory exists)
2. Create backup via `backup.sh`
3. Install production dependencies
4. Build if needed
5. Run migrations
6. Restart services
7. Health check (10 retries, 5s delay)

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOY_ENV` | `development` | `development` or `production` |
| `DEPLOY_PATH` | `/opt/vestara` | Vestara installation path |

---

## Maintain Scripts

### upgrade.sh

Upgrades Vestara to the latest version.

```bash
./scripts/upgrade.sh
```

**What it does:**
1. Checks for available package updates via apt
2. Creates pre-upgrade backup (database + config)
3. Stops Vestara services
4. Upgrades all Vestara packages
5. Restarts services
6. Verifies API health

**Behavior:**
- If no updates available, exits cleanly
- Creates backup at `/home/ai/vestara-backups/vestara-pre-upgrade-*.tar.gz`
- Health check retries up to 10 times

---

### backup.sh

Full backup and restore solution for Vestara data.

```bash
./scripts/backup.sh backup
./scripts/backup.sh list
./scripts/backup.sh restore ~/vestara-backups/vestara-backup-20260720-120000.tar.gz
```

**Commands:**

| Command | Description |
|---------|-------------|
| `backup` | Create a new backup (default) |
| `list` | List all available backups |
| `restore <file>` | Restore from a backup archive |

**What gets backed up:**
- SQLite database (`data/vestara.db`)
- Configuration files (`config/`)
- Knowledge base (`knowledge/`)
- Memory store (`memory/`)
- Projects (`projects/`)

**Environment variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `VESTARA_HOME` | `/home/ai/vestara` | Vestara data directory |
| `BACKUP_DIR` | `~/vestara-backups` | Backup output directory |
| `RETENTION_DAYS` | `30` | Days to keep old backups |

**Output:**
- `BACKUP_DIR/vestara-backup-YYYYMMDD-HHMMSS.tar.gz`

---

## Running from Dashboard

All scripts are accessible through the Vestara dashboard at `/scripts`:

1. Navigate to **Scripts** in the sidebar (Admin section)
2. Select a script from the categorized list
3. View the source code and documentation
4. Add arguments if needed
5. Click **Run** to execute

**Safety gates:**
- `build-ssd.sh` and `install.sh` require `--confirm` argument
- All scripts run with a 5-minute timeout
- Output is captured and displayed in real-time

---

## Environment Variables

| Variable | Scripts | Description |
|----------|---------|-------------|
| `VESTARA_HOME` | backup | Vestara data directory |
| `BACKUP_DIR` | backup | Backup output directory |
| `RETENTION_DAYS` | backup | Backup retention period |
| `VESTARA_USER` | install | User to create |
| `API_PORT` | install | API server port |
| `DASHBOARD_PORT` | install | Dashboard port |
| `DEPLOY_ENV` | deploy | Deployment environment |
| `DEPLOY_PATH` | deploy | Installation path |
| `VERSION` | build-deb, build-iso | Package/ISO version |
| `GPG_KEY` | build-repo | GPG key identity |

---

## Dependencies Summary

| Script | System Packages |
|--------|----------------|
| build-ssd | debootstrap, parted, mkfs.ext4, mkfs.vfat, rsync, fakeroot |
| build-deb | dpkg-deb, fakeroot |
| build-repo | dpkg-scanpackages, gpg |
| build-iso | debootstrap, xorriso, mksquashfs, grub-mkrescue |
| install | curl, wget, gnupg, ca-certificates, nginx, git |
| deploy | pnpm, sudo |
| upgrade | apt, sudo, curl |
| backup | rsync, tar, gzip |

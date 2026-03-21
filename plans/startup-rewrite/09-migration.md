# Project 9: Migration & Deployment

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Safely migrate from old startup to new version in production |
| **Risk** | Medium-High |
| **Effort** | 1 day |
| **Dependencies** | #8 Testing & Verification |
| **Unlocks** | Production deployment |

## Migration Strategy

The migration must be **zero-downtime** and **reversible**. We'll use a gradual rollout approach:

1. Deploy new startup alongside old (coexistence)
2. Test on single staging machine
3. Switch one production machine
4. Monitor for 24-48 hours
5. Roll out to remaining machines
6. Remove old startup code

## Tasks

### 9.1 Pre-Migration Checklist

Before starting migration:

- [x] All tests pass (`bun test`)
- [x] Type checking passes (`bun run typecheck`)
- [x] Linting passes (`bun run lint`)
- [x] Binaries built for all platforms (`bun run build`)
- [x] Manual testing on development machine
- [x] Backup of production configs documented (rollback-startup.sh restores from backup)
- [x] Rollback procedure documented and tested (rollback-startup.sh created)
- [ ] Team notified of migration window

### 9.2 Directory Structure During Migration

```
source/apps/
├── startup/          # OLD - Keep during migration
│   ├── src/
│   └── package.json
├── startup-v2/       # NEW - The rewrite
│   ├── src/
│   ├── dist/
│   │   ├── startup-ubuntu
│   │   ├── startup-windows.exe
│   │   └── startup-mac
│   ├── scripts/
│   └── package.json
```

### 9.3 Coexistence Setup

Update the root `package.json` to support both versions:

#### source/package.json (temporary additions)

```json
{
  "scripts": {
    "start:main": "pm2 start bun --name babybox -- apps/backend/src/index.ts",
    "start:configer": "pm2 start bun --name configer -- apps/configer/src/index.ts",
    
    "startup:old": "cd apps/startup && node src/index.js --ubuntu",
    "startup:new": "./apps/startup-v2/dist/startup-ubuntu --ubuntu",
    
    "startup:old:install": "cd apps/startup && node src/index.js --ubuntu --install",
    "startup:new:install": "./apps/startup-v2/dist/startup-ubuntu --ubuntu --install"
  }
}
```

### 9.4 Update Autostart Scripts

The autostart mechanism needs to point to the new binary.

#### Original: ~/.config/autostart/babybox.desktop

```ini
[Desktop Entry]
Type=Application
Name=Babybox Panel
Exec=/home/babybox/babybox/source/apps/startup/scripts/ubuntu/startup.sh
Terminal=false
```

#### New: ~/.config/autostart/babybox.desktop

```ini
[Desktop Entry]
Type=Application
Name=Babybox Panel
Exec=/home/babybox/babybox/source/apps/startup-v2/scripts/ubuntu/startup.sh
Terminal=false
```

### 9.5 Migration Script

Create a script to automate the migration on each machine:

#### scripts/migrate-startup.sh

```bash
#!/bin/bash
set -e

# Migration script for startup-v2
# Run this on each production machine

REPO_ROOT="/home/babybox/babybox"
OLD_STARTUP="$REPO_ROOT/source/apps/startup"
NEW_STARTUP="$REPO_ROOT/source/apps/startup-v2"
AUTOSTART_FILE="$HOME/.config/autostart/babybox.desktop"

echo "=== Babybox Startup Migration ==="
echo "Repository: $REPO_ROOT"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if [ ! -f "$NEW_STARTUP/dist/startup-ubuntu" ]; then
    echo "ERROR: New startup binary not found!"
    echo "Run: cd $NEW_STARTUP && bun run build"
    exit 1
fi

if [ ! -x "$NEW_STARTUP/dist/startup-ubuntu" ]; then
    echo "Making binary executable..."
    chmod +x "$NEW_STARTUP/dist/startup-ubuntu"
fi

# Test new binary
echo "Testing new startup binary..."
if ! "$NEW_STARTUP/dist/startup-ubuntu" --version > /dev/null 2>&1; then
    echo "ERROR: New startup binary failed to run!"
    exit 1
fi

echo "New binary works: $($NEW_STARTUP/dist/startup-ubuntu --version)"

# Backup current autostart
echo ""
echo "Backing up current autostart configuration..."
if [ -f "$AUTOSTART_FILE" ]; then
    cp "$AUTOSTART_FILE" "${AUTOSTART_FILE}.backup.$(date +%Y%m%d%H%M%S)"
    echo "Backed up to ${AUTOSTART_FILE}.backup.*"
fi

# Update autostart
echo ""
echo "Updating autostart configuration..."
cat > "$AUTOSTART_FILE" << 'EOF'
[Desktop Entry]
Type=Application
Name=Babybox Panel
Comment=Babybox monitoring panel startup
Exec=/home/babybox/babybox/source/apps/startup-v2/scripts/ubuntu/startup.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

echo "Autostart updated."

# Verify
echo ""
echo "Verifying configuration..."
grep "Exec=" "$AUTOSTART_FILE"

echo ""
echo "=== Migration Complete ==="
echo ""
echo "Next steps:"
echo "1. Stop current services: pm2 stop all"
echo "2. Test new startup: $NEW_STARTUP/dist/startup-ubuntu --ubuntu"
echo "3. Or reboot to test autostart"
echo ""
echo "To rollback:"
echo "  cp ${AUTOSTART_FILE}.backup.* $AUTOSTART_FILE"
```

### 9.6 Rollback Script

#### scripts/rollback-startup.sh

```bash
#!/bin/bash
set -e

# Rollback script - reverts to old startup
# Use if migration causes issues

REPO_ROOT="/home/babybox/babybox"
AUTOSTART_FILE="$HOME/.config/autostart/babybox.desktop"

echo "=== Babybox Startup Rollback ==="
echo ""

# Find latest backup
LATEST_BACKUP=$(ls -t ${AUTOSTART_FILE}.backup.* 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backup found. Creating default old configuration..."
    cat > "$AUTOSTART_FILE" << 'EOF'
[Desktop Entry]
Type=Application
Name=Babybox Panel
Exec=/home/babybox/babybox/source/apps/startup/scripts/ubuntu/startup.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF
else
    echo "Restoring from: $LATEST_BACKUP"
    cp "$LATEST_BACKUP" "$AUTOSTART_FILE"
fi

echo ""
echo "Autostart configuration:"
grep "Exec=" "$AUTOSTART_FILE"

echo ""
echo "=== Rollback Complete ==="
echo ""
echo "Restart the machine or manually start the old startup."
```

### 9.7 Production Deployment Procedure

#### Step 1: Prepare (Day 1)

```bash
# On development machine
cd /path/to/babybox

# Ensure latest code
git pull

# Build startup binaries
cd source/apps/startup-v2
bun install
bun test
bun run build

# Commit binaries (if not already)
git add dist/startup-*
git commit -m "build: compile startup-v2 binaries for production"
git push
```

#### Step 2: Deploy to Staging (Day 1)

```bash
# SSH to staging machine
ssh babybox@staging-machine

# Pull latest
cd /home/babybox/babybox
git pull

# Run migration script
./source/apps/startup-v2/scripts/migrate-startup.sh

# Stop current services
pm2 stop all

# Test new startup
./source/apps/startup-v2/dist/startup-ubuntu --ubuntu

# Verify services are running
pm2 list
curl http://localhost:3000/api/v1/status
```

#### Step 3: Monitor Staging (Day 1-2)

- Check logs: `tail -f source/apps/startup-v2/logs/startup.*.log`
- Verify panel loads in browser
- Check for errors in PM2: `pm2 logs`
- Test a reboot to verify autostart works

#### Step 4: Deploy to First Production (Day 2)

```bash
# SSH to first production machine
ssh babybox@production-1

# Same procedure as staging
cd /home/babybox/babybox
git pull
./source/apps/startup-v2/scripts/migrate-startup.sh
pm2 stop all
./source/apps/startup-v2/dist/startup-ubuntu --ubuntu

# Verify
pm2 list
curl http://localhost:3000/api/v1/status
```

#### Step 5: Monitor First Production (Day 2-4)

- Monitor for 24-48 hours
- Check logs daily
- Verify auto-updates work when code is pushed
- Test that panel functions correctly

#### Step 6: Roll Out to Remaining Machines (Day 4+)

After successful monitoring:

```bash
# For each remaining machine
ssh babybox@production-N
cd /home/babybox/babybox
git pull
./source/apps/startup-v2/scripts/migrate-startup.sh
pm2 stop all && ./source/apps/startup-v2/dist/startup-ubuntu --ubuntu
```

### 9.8 Cleanup (After Successful Migration)

Once all machines are migrated and stable (1-2 weeks):

1. **Remove old startup code**:
```bash
git rm -r source/apps/startup
git commit -m "chore: remove old startup app (replaced by startup-v2)"
```

2. **Rename startup-v2 to startup**:
```bash
git mv source/apps/startup-v2 source/apps/startup
# Update all path references
git commit -m "chore: rename startup-v2 to startup"
```

3. **Update documentation**:
- Update CLAUDE.md
- Update any deployment docs
- Remove migration scripts

### 9.9 Troubleshooting Guide

#### Problem: New startup binary won't run

**Symptoms**: `./startup-ubuntu: Permission denied` or `cannot execute binary file`

**Solution**:
```bash
chmod +x source/apps/startup-v2/dist/startup-ubuntu
# Or rebuild
cd source/apps/startup-v2 && bun run build:ubuntu
```

#### Problem: Services don't start

**Symptoms**: PM2 shows services as "errored"

**Solution**:
```bash
# Check PM2 logs
pm2 logs

# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Kill any zombie processes
pm2 kill
pm2 start bun --name babybox -- source/apps/backend/src/index.ts
```

#### Problem: Git pull fails during auto-update

**Symptoms**: Logs show "conflict" or "unable to pull"

**Solution**:
```bash
cd /home/babybox/babybox

# Check status
git status

# If local changes, stash them
git stash

# Pull
git pull

# Apply stash if needed
git stash pop
```

#### Problem: Build fails

**Symptoms**: Logs show "compilation_failed" or "dependency_install_failed"

**Solution**:
```bash
cd /home/babybox/babybox/source

# Clear node_modules
rm -rf node_modules apps/*/node_modules

# Reinstall
bun install

# Try build
bun run build
```

### 9.10 Monitoring Checklist

After migration, monitor for:

- [ ] Services start automatically on boot (pending production deployment)
- [ ] Git auto-update works (pending production deployment)
- [ ] Logs are being written to correct location (pending production deployment)
- [ ] Panel UI loads and shows data (pending production deployment)
- [ ] No memory leaks (pending 24-hour monitoring)
- [ ] Error recovery works (pending production deployment)

## Verification Checklist

- [x] Migration script tested on development
- [x] Rollback script tested
- [ ] Staging deployment successful
- [ ] Staging monitored for 24+ hours
- [ ] First production deployment successful
- [ ] All production machines migrated
- [ ] Old startup code removed
- [ ] Documentation updated

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Binary incompatible with target OS | Build on similar Linux version, test first |
| Services fail to start | Keep old startup available, quick rollback |
| Auto-update breaks itself | Startup binary is standalone, survives bad pulls |
| Config incompatibility | New startup reads same env vars, same paths |
| Permission issues | Migration script checks permissions |

## Rollback Triggers

Immediately rollback if:

1. Services repeatedly crash (>3 times in 10 minutes)
2. Panel UI inaccessible for >5 minutes
3. Auto-update causes data loss
4. Memory usage grows unbounded
5. Any critical hospital monitoring features fail

## Post-Migration

After successful migration on all machines:

1. Remove `startup/` directory
2. Rename `startup-v2/` to `startup/`
3. Update all documentation
4. Archive migration scripts
5. Close migration tracking issue

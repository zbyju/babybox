# Project 0: Untrack main.json from Git

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Remove `main.json` from git tracking; it's environment-specific config |
| **Risk** | Very Low |
| **Effort** | 0.5 hours |
| **Dependencies** | None |
| **Unlocks** | Clean git history; no more merge conflicts on config |

## Why This Matters

Currently, `main.json` (the active config) is tracked in git alongside `base.json` (the default template). This causes:
- Merge conflicts when different environments update config
- Config values (like passwords, IPs) leak into git history
- Developers must manually stash/cherry-pick config changes during merges

Solution: Keep `main.json` local-only, use `base.json` as the tracked template.

## Tasks

### 0.1 Update .gitignore

**File**: `.gitignore` (project root)

Add these lines:
```
# Environment-specific config
source/apps/backend/configs/main.json
source/apps/backend/configs/versions.json

# Build artifacts
*.tsbuildinfo
coverage/

# Environment variables
.env
.env.local
.env.*.local
```

### 0.2 Remove main.json from Git Tracking

Run this command from project root:
```bash
cd /Users/zbyju/projects/babybox
git rm --cached source/apps/backend/configs/main.json
git rm --cached source/apps/backend/configs/versions.json  # if it's also env-specific
```

This removes the files from git history while keeping them locally (they'll still exist in your working directory).

**Verify**: `git status` should show these files as deleted (staged for commit).

### 0.3 Commit Changes

```bash
git add .gitignore
git commit -m "chore: untrack main.json and versions.json - env-specific config"
```

### 0.4 Update Documentation

**File**: `CLAUDE.md` (in Configuration section)

Add a note explaining config setup:
```markdown
### Configuration Setup

- **`base.json`** - Tracked in git, contains default values and template structure
- **`main.json`** - Environment-specific, NOT tracked (add to .gitignore)
- **`versions.json`** - Deployment metadata, NOT tracked

On first setup:
```bash
cd source/apps/backend/configs
cp base.json main.json  # Create local config from template
# Edit main.json with your environment-specific values (passwords, IPs, etc.)
```
```

### 0.5 Verify No Other Env Config Is Tracked

Search for other files that might contain environment-specific data:

```bash
cd source
git ls-files | grep -E "(\.env|\.local|main\.|config\.)"
```

Should only return `apps/backend/configs/base.json` and maybe some tracked test configs.

## Verification

After completing all tasks:

1. **Git status clean**:
   ```bash
   git status
   # Should show a clean working tree (except the .gitignore edit)
   ```

2. **Files still exist locally**:
   ```bash
   ls source/apps/backend/configs/
   # Should list: base.json, main.json, versions.json
   ```

3. **main.json not tracked**:
   ```bash
   git ls-files | grep main.json
   # Should return nothing (or only base.json)
   ```

4. **No secrets in commit history**:
   ```bash
   git log --oneline -5 -- source/apps/backend/configs/
   # Should not show "main.json" as a tracked file
   ```

## Files Changed Summary

| Action | Files |
|--------|-------|
| Edit | `.gitignore` |
| Remove from git | `source/apps/backend/configs/main.json`, `source/apps/backend/configs/versions.json` |
| Edit | `CLAUDE.md` |

## Rollback

If you need to restore `main.json` to git tracking:
```bash
git reset source/apps/backend/configs/main.json
git checkout source/apps/backend/configs/main.json
git add source/apps/backend/configs/main.json
git commit -m "chore: restore main.json tracking (rollback)"
```

## Notes

- `main.json` will remain in your local working directory after `git rm --cached`
- Any developer cloning the repo should run `cp base.json main.json` to create their local config
- This is a one-way change — after this commit, the config file is cleanly separated from version control

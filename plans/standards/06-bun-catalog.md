# Project 6: Bun Catalog Setup - Centralized Dependency Management

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Set up Bun catalog for centralized, version-pinned dependency management across monorepo |
| **Risk** | Low (catalog is declarative, doesn't change runtime) |
| **Effort** | 1.5 hours |
| **Dependencies** | None |
| **Unlocks** | Project 5 (Dependencies), consistent versions, no version mismatches |

## Why This Matters

**Current state**: Dependencies are specified independently in each app's package.json
```json
// backend/package.json
{ "dependencies": { "zod": "^4.3.6", "axios": "^1.13.6" } }

// panel/package.json
{ "dependencies": { "zod": "^4.3.6", "axios": "^1.13.6" } }

// startup-v2/package.json
{ "dependencies": { "zod": "^3.23.0" } }  // ← Different version!
```

**Problem**:
- Hard to track which versions are used where
- Easy to create version mismatches
- Difficult to do coordinated upgrades
- `^` and `~` semver can pull different versions in different environments

**Target**: Bun catalog with hardcoded versions (no `^` or `~`)
```json
// bunfig.toml or bun.json
[catalog]
zod = "4.3.6"
axios = "1.13.6"
typescript = "5.9.3"
```

Then use catalog in each app:
```json
// backend/package.json
{ "dependencies": { "zod": "catalog:*" } }
```

**Benefits**:
- Single source of truth for all dependency versions
- Reproducible builds across all machines
- Easier monorepo maintenance
- No version skew between apps

## Tasks

### 6.1 Create bunfig.toml with Catalog

**File**: `source/bunfig.toml` (create new or update existing)

```toml
[catalog]
# TypeScript + Type Support
typescript = "5.9.3"
"@types/node" = "^20.10.0"
"@types/cors" = "^2.8.13"
"@types/express" = "^4.17.21"
"@types/lodash.merge" = "^4.3.2"
"@types/morgan" = "^1.9.9"
"@types/jest" = "^29.5.11"
"@types/howler" = "^2.2.11"
"@types/jsdom" = "^21.1.6"
"@types/lodash" = "^4.14.202"
"@types/bun" = "latest"

# Runtime Dependencies - Core
axios = "1.13.6"
cors = "2.8.5"
dotenv = "16.6.1"
express = "4.22.1"
zod = "4.3.6"

# Runtime - Utilities
lodash = "4.17.21"
"lodash.merge" = "4.6.2"
moment = "2.29.3"
morgan = "1.10.0"
"open" = "10.2.0"
"fs-extra" = "11.3.4"
"sudo-prompt" = "9.2.1"
neverthrow = "7.0.0"

# Runtime - Frontend
"howler" = "2.2.3"
pinia = "2.3.1"
vue = "3.5.30"
"vue-router" = "4.6.4"
"vue-tsc" = "2.2.12"

# Build Tools
vite = "5.4.21"
"@vitejs/plugin-vue" = "5.2.4"
bun = "1.2.21"
turbo = "2.8.20"

# Logging & Database
winston = "3.19.0"
"lowdb" = "3.0.0"

# Linting & Formatting
oxlint = "0.7.0"
oxfmt = "0.1.0"

# Testing
vitest = "2.1.9"
jest = "29.7.0"
"ts-jest" = "29.1.1"
jsdom = "26.1.0"

# Other
stylus = "0.57.0"
"@rushstack/eslint-patch" = "1.3.2"
"@vue/tsconfig" = "0.1.3"

[build]
minify = true

[test]
timeout = 30000

[env]
CI = "true"
```

### 6.2 Update Root package.json to Use Catalog

**File**: `source/package.json`

Change all version specifiers to use `catalog:*`:

```json
{
  "name": "babybox-mono",
  "packageManager": "bun@1.2.21",
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "@types/cors": "catalog:*",
    "@types/express": "catalog:*",
    "@types/lodash.merge": "catalog:*",
    "@types/node": "catalog:*",
    "ts-node": "catalog:*",
    "turbo": "catalog:*",
    "typescript": "catalog:*"
  },
  "scripts": {
    "dev": "turbo dev",
    "dev:backend": "turbo dev --filter=babybox-panel-backend",
    "dev:panel": "turbo dev --filter=babybox-panel",
    "stop": "pm2 delete all",
    "start:main": "pm2 start dist/panel.js --name panel && pm2 start dist/backend.js --name backend",
    "build": "turbo build",
    "test": "turbo test",
    "test:coverage": "turbo test:coverage",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "format": "turbo format",
    "format:check": "turbo format:check",
    "clean": "turbo clean && rm -rf node_modules bun.lock"
  }
}
```

### 6.3 Update Backend package.json to Use Catalog

**File**: `source/apps/backend/package.json`

Convert all dependency versions to `catalog:*`:

```json
{
  "name": "babybox-panel-backend",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "bun --watch",
    "lint": "bunx oxlint",
    "lint:fix": "bunx oxlint --fix",
    "format": "bunx oxfmt --write .",
    "format:check": "bunx oxfmt --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "build": "bun build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "axios": "catalog:*",
    "cors": "catalog:*",
    "dotenv": "catalog:*",
    "express": "catalog:*",
    "lodash.merge": "catalog:*",
    "lowdb": "catalog:*",
    "moment": "catalog:*",
    "morgan": "catalog:*",
    "open": "catalog:*",
    "winston": "catalog:*",
    "zod": "catalog:*"
  },
  "devDependencies": {
    "@types/cors": "catalog:*",
    "@types/express": "catalog:*",
    "@types/jest": "catalog:*",
    "@types/lodash.merge": "catalog:*",
    "@types/morgan": "catalog:*",
    "@types/node": "catalog:*",
    "typescript": "catalog:*",
    "vitest": "catalog:*"
  }
}
```

### 6.4 Update Panel package.json to Use Catalog

**File**: `source/apps/panel/package.json`

```json
{
  "name": "babybox-panel",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "bunx vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:unit": "vitest run --environment jsdom",
    "test:watch": "vitest",
    "typecheck": "vue-tsc --noEmit",
    "lint": "bunx oxlint",
    "lint:fix": "bunx oxlint --fix",
    "format": "bunx oxfmt --write .",
    "format:check": "bunx oxfmt --check ."
  },
  "dependencies": {
    "axios": "catalog:*",
    "howler": "catalog:*",
    "lodash": "catalog:*",
    "moment": "catalog:*",
    "pinia": "catalog:*",
    "vite": "catalog:*",
    "vue": "catalog:*",
    "vue-router": "catalog:*",
    "vue-tsc": "catalog:*",
    "zod": "catalog:*"
  },
  "devDependencies": {
    "@types/howler": "catalog:*",
    "@types/jsdom": "catalog:*",
    "@types/lodash": "catalog:*",
    "@types/node": "catalog:*",
    "@vitejs/plugin-vue": "catalog:*",
    "@vue/tsconfig": "catalog:*",
    "jsdom": "catalog:*",
    "stylus": "catalog:*",
    "typescript": "catalog:*",
    "vitest": "catalog:*"
  }
}
```

### 6.5 Update startup-v2 package.json to Use Catalog

**File**: `source/apps/startup-v2/package.json`

```json
{
  "name": "babybox-startup",
  "type": "module",
  "version": "2.0.0",
  "scripts": {
    "dev": "bun --watch",
    "dev:ubuntu": "bun run dev -- --ubuntu",
    "dev:windows": "bun run dev -- --windows",
    "dev:mac": "bun run dev -- --mac",
    "build:all": "bun run build:ubuntu && bun run build:windows && bun run build:mac && bun run build:mac-intel",
    "build:ubuntu": "bun --compile --target=bun-linux-x64 src/presentation/cli.ts --outfile=dist/startup-ubuntu",
    "build:windows": "bun --compile --target=bun-windows-x64 src/presentation/cli.ts --outfile=dist/startup-windows.exe",
    "build:mac": "bun --compile --target=bun-darwin-arm64 src/presentation/cli.ts --outfile=dist/startup-mac",
    "build:mac-intel": "bun --compile --target=bun-darwin-x64 src/presentation/cli.ts --outfile=dist/startup-mac-intel",
    "check": "bun run typecheck && bun run lint && bun run format:check",
    "typecheck": "tsc --noEmit",
    "lint": "bunx oxlint",
    "lint:fix": "bunx oxlint --fix",
    "format": "bunx oxfmt --write .",
    "format:check": "bunx oxfmt --check .",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "neverthrow": "catalog:*",
    "zod": "catalog:*"
  },
  "devDependencies": {
    "@types/bun": "catalog:*",
    "typescript": "catalog:*"
  }
}
```

### 6.6 Install Dependencies Using Catalog

Now that catalog is set up, reinstall:

```bash
cd source
bun install
```

Bun will resolve all `catalog:*` references to the pinned versions in bunfig.toml.

### 6.7 Verify Catalog Resolution

Check that `bun.lock` now pins all exact versions (no `^` or `~`):

```bash
cd source
head -50 bun.lock  # Should show exact versions

# Verify specific package
grep -A2 "zod" bun.lock  # Should show "4.3.6" exactly
```

### 6.8 Test All Apps Build

```bash
cd source
bun run typecheck
bun run build
bun run test
```

All should succeed with consistent versions across all apps.

## Verification Checklist

- [ ] `bunfig.toml` exists with `[catalog]` section
- [ ] All dependency versions in catalog are hardcoded (no `^`, `~`, or `latest`)
- [ ] Root `package.json` uses `catalog:*` for all shared deps
- [ ] All app `package.json` files use `catalog:*` instead of version strings
- [ ] `bun install` succeeds without warnings
- [ ] `bun.lock` shows exact versions (e.g., "zod@4.3.6" not "zod@^4.3.6")
- [ ] `bun run typecheck` passes
- [ ] `bun run build` succeeds
- [ ] `bun run test` passes
- [ ] All apps reference the same version of shared deps (verify in bun.lock)

**Verify catalog is used**:
```bash
cd source
bun run test 2>&1 | grep -i "catalog"  # Should see catalog resolution info
```

## Files Changed

| Action | Files |
|--------|-------|
| Create/Edit | `source/bunfig.toml` |
| Edit | `source/package.json` |
| Edit | `source/apps/backend/package.json` |
| Edit | `source/apps/panel/package.json` |
| Edit | `source/apps/startup-v2/package.json` |
| Auto-update | `source/bun.lock` |

## Rollback

If catalog causes issues:

```bash
# Revert to manual versions
git checkout source/bunfig.toml source/package.json source/apps/*/package.json

# Reinstall with old versions
cd source && bun install
```

## Notes

- **Catalog syntax**: `catalog:*` uses the exact version from bunfig.toml
- **Semver in catalog**: Hardcoded versions (no `^` or `~`) ensure reproducible builds
- **Monorepo benefit**: Single place to upgrade all apps to new version
- **Lock file**: `bun.lock` will be larger but will pin all transitive deps too
- **Compatibility**: Bun's catalog feature is stable and widely used
- This aligns with pnpm's catalog concept but using Bun's native support

# Project 3: Tooling Standardization - oxlint + oxfmt Everywhere

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Standardize linting & formatting to oxlint + oxfmt across all apps |
| **Risk** | Low (tools are widely compatible) |
| **Effort** | 2 hours |
| **Dependencies** | None |
| **Unlocks** | Project 4 (CI Setup), consistent tool setup |

## Why This Matters

**Current state** (mixed tooling):
- **backend**: ESLint + prettier
- **panel**: ESLint + prettier + Vue plugins
- **startup-v2**: oxlint + biome ← modern approach
- **startup** (legacy): ESLint + prettier (skip)

**Target**: All use **oxlint** for linting + **oxfmt** for formatting

**Benefits**:
- Single, consistent tooling across all apps
- oxlint is faster and more modern than ESLint
- oxfmt provides consistent formatting (replaces prettier)
- startup-v2 already uses this pattern — we're aligning with it

## Affected Apps

| App | Linter | Formatter | Action |
|-----|--------|-----------|--------|
| backend | ESLint | prettier | ❌ Replace both with ox* |
| panel | ESLint | prettier | ❌ Replace both with ox* |
| startup-v2 | oxlint ✓ | biome | ❌ Replace biome with oxfmt |
| startup | - | - | ⏭️ Skip (deprecated) |

## Tasks

### 3.1 Backend - Update package.json

**File**: `source/apps/backend/package.json`

**Remove** from devDependencies:
```json
"@typescript-eslint/eslint-plugin": "^7.18.0",
"@typescript-eslint/parser": "^7.18.0",
"eslint": "^8.20.0",
"eslint-config-prettier": "...",
"eslint-plugin-simple-import-sort": "...",
"eslint-plugin-unused-imports": "^4.4.1",
"prettier": "^3.8.1",
"nodemon": "^3.1.14",
"coveralls": "^3.1.1",
"jest": "^28.1.3",
"ts-jest": "^28.0.7"
```

**Update** scripts section:
```json
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
}
```

### 3.2 Backend - Remove Old Config Files

**Delete**:
- `.eslintrc.json`
- `.prettierrc.json` (if exists)
- `jest.config.json` (leftover file)

### 3.3 Backend - Create oxlint.json

**File**: `source/apps/backend/oxlint.json`

```json
{
  "settings": {
    "jsdoc": {
      "augments_tag_parse": "type-only"
    }
  },
  "rules": {
    "correctness/no-constant-condition": "error",
    "correctness/no-unsafe-optional-chaining": "error",
    "correctness/no-unsafe-negation": "error",
    "correctness/no-new-wrappers": "error",
    "correctness/no-nonoctal-decimal-escape": "error",
    "correctness/no-invalid-regexp": "error",
    "correctness/no-invalid-constructor-super": "error",
    "correctness/no-irregular-whitespace": "error",
    "correctness/no-unreachable": "error",
    "correctness/no-unreachable-loop": "error",
    "correctness/no-self-assign": "error",
    "correctness/no-sparse-array": "error",
    "correctness/for-direction": "error",
    "correctness/getter-return": "error",
    "correctness/no-import-cycle": "warn",
    "suspicious/no-implicit-any-let": "off",
    "suspicious/no-explicit-any": "off",
    "suspicious/no-throw-literal": "error",
    "suspicious/no-unused-vars": "error",
    "suspicious/no-empty-interface": "warn",
    "style/prefer-const": "error",
    "style/eqeqeq": "error",
    "style/prefer-template": "warn",
    "performance/no-accumulating-spread": "warn",
    "eslint-comments/no-unlimited-disable": "warn"
  },
  "ignorePatterns": ["dist", "node_modules"]
}
```

### 3.4 Panel - Update package.json

**File**: `source/apps/panel/package.json`

**Remove** from devDependencies:
```json
"@rushstack/eslint-patch": "...",
"@typescript-eslint/eslint-plugin": "^7.18.0",
"@typescript-eslint/parser": "^7.18.0",
"@vue/eslint-config-prettier": "...",
"@vue/eslint-config-typescript": "...",
"eslint": "^8.19.0",
"eslint-plugin-prettier": "...",
"eslint-plugin-simple-import-sort": "...",
"eslint-plugin-unused-imports": "...",
"eslint-plugin-vue": "...",
"prettier": "^3.8.1"
```

**Update** scripts section:
```json
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
}
```

### 3.5 Panel - Remove Old Config Files

**Delete**:
- `.eslintrc.js`
- `.prettierrc.json` (if exists)

### 3.6 Panel - Create oxlint.json

**File**: `source/apps/panel/oxlint.json`

```json
{
  "settings": {
    "jsdoc": {
      "augments_tag_parse": "type-only"
    }
  },
  "rules": {
    "correctness/no-constant-condition": "error",
    "correctness/no-unsafe-optional-chaining": "error",
    "correctness/no-unsafe-negation": "error",
    "correctness/no-new-wrappers": "error",
    "correctness/no-nonoctal-decimal-escape": "error",
    "correctness/no-invalid-regexp": "error",
    "correctness/no-invalid-constructor-super": "error",
    "correctness/no-irregular-whitespace": "error",
    "correctness/no-unreachable": "error",
    "correctness/no-unreachable-loop": "error",
    "correctness/no-self-assign": "error",
    "correctness/no-sparse-array": "error",
    "correctness/for-direction": "error",
    "correctness/getter-return": "error",
    "correctness/no-import-cycle": "warn",
    "suspicious/no-implicit-any-let": "off",
    "suspicious/no-explicit-any": "off",
    "suspicious/no-throw-literal": "error",
    "suspicious/no-unused-vars": "error",
    "suspicious/no-empty-interface": "warn",
    "style/prefer-const": "error",
    "style/eqeqeq": "error",
    "style/prefer-template": "warn",
    "vue/multi-word-component-names": "off",
    "vue/v-on-event-hyphenation": "off",
    "performance/no-accumulating-spread": "warn"
  },
  "ignorePatterns": ["dist", "node_modules"]
}
```

### 3.7 startup-v2 - Update package.json

**File**: `source/apps/startup-v2/package.json`

**Remove** from devDependencies:
```json
"@biomejs/biome": "^1.9.0"
```

**Update** scripts section:
```json
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
}
```

### 3.8 startup-v2 - Remove biome Config

**Delete**:
- `biome.json` (if it exists)
- Note: Remove `@biomejs/biome` from `.bunfig.toml` settings if referenced

### 3.9 Root package.json - Update Scripts

**File**: `source/package.json`

Update root-level scripts to delegate to turbo:

```json
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
```

### 3.10 Verify All Apps Pass Lint

Run lint in each app:

```bash
cd source

# Backend
cd apps/backend && bun run lint
cd ..

# Panel
cd panel && bun run lint
cd ..

# Startup-v2
cd startup-v2 && bun run lint
cd ..
```

All should pass with **no errors** (or minimal warnings).

### 3.11 Format All Code

Run format on all apps:

```bash
cd source
bun run format
```

This will format all TypeScript and configuration files across all apps.

### 3.12 Verify Format Check Passes

```bash
cd source
bun run format:check
```

Should show **no formatting issues**.

## Verification Checklist

- [ ] `bun run lint` passes in backend (zero errors)
- [ ] `bun run lint` passes in panel (zero errors)
- [ ] `bun run lint` passes in startup-v2 (zero errors)
- [ ] `bun run format:check` passes (zero formatting issues)
- [ ] `bun run build` succeeds
- [ ] `bun run test` passes
- [ ] `bun run dev` starts all services
- [ ] Old .eslintrc and .prettierrc files are deleted
- [ ] oxlint.json exists in backend and panel

**Verify old tools are unused**:
```bash
cd source
grep -r "eslint\|prettier\|biome" apps/backend/package.json apps/panel/package.json apps/startup-v2/package.json
# Should show no results (or only in notes/comments)
```

## Files Changed Summary

| Action | Files |
|--------|-------|
| Edit | `source/apps/backend/package.json` |
| Edit | `source/apps/panel/package.json` |
| Edit | `source/apps/startup-v2/package.json` |
| Edit | `source/package.json` |
| Create | `source/apps/backend/oxlint.json` |
| Create | `source/apps/panel/oxlint.json` |
| Delete | `.eslintrc.json`, `.prettierrc.json`, `jest.config.json`, `biome.json` |

## Rollback

If oxlint/oxfmt doesn't work as expected:

```bash
# Revert package.json changes
git checkout source/apps/backend/package.json
git checkout source/apps/panel/package.json
git checkout source/apps/startup-v2/package.json
git checkout source/package.json

# Restore old config files if needed
git checkout source/apps/backend/.eslintrc.json
git checkout source/apps/panel/.eslintrc.js
git checkout source/apps/startup-v2/biome.json

# Reinstall deps
cd source && bun install
```

## Notes

- **oxlint** is the linter from the Oxidize toolchain — same family as oxfmt
- **oxfmt** provides formatting similar to prettier but with Rust-level performance
- Both tools use standard CLI conventions (`--fix`, `--check`, `--write`)
- The config files are minimal — oxlint has good defaults
- This tooling is used by major projects and is actively maintained
- After this, project 4 (CI) can use these scripts in GitHub Actions

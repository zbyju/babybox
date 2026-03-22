# Project 1: Fix TypeScript Config - Strict Settings & Clean Imports

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Enable strict ESM-only mode, apply maximum TypeScript strictness, use bundler resolution without .js extensions |
| **Risk** | Medium (module resolution + strict settings could require code changes) |
| **Effort** | 2 hours |
| **Dependencies** | None (but should complete before file renaming - plan 2) |
| **Unlocks** | Plan 2 (File Renaming), Plan 7 (JS→TS), cleaner imports, better type safety |

## Why This Matters

**Current state:**
- Backend uses `module: NodeNext, moduleResolution: NodeNext`
- This requires `.js` extensions in all local imports (ESM requirement for Node.js)
- startup-v2 also has `.js` extensions (even though it uses `moduleResolution: bundler`)

**Problems**:
1. `.js` extensions on every import are tedious and non-standard
2. TypeScript settings are not strict enough — type safety gaps exist
3. Not enforcing pure ESM across the codebase

**Target**:
- Clean imports without `.js` extensions
- Maximum type safety with all strict settings enabled
- Pure ESM-only (no CommonJS mixing)

```typescript
// Before:
import { loadConfig } from "./services/config/loader.js";

// After:
import { loadConfig } from "./services/config/loader";
```

### Strictness Improvements

**Before** (current backend):
```json
{
  "strict": true,
  "noImplicitAny": true
}
```

**After** (all apps):
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "exactOptionalPropertyTypes": true,
  "noPropertyAccessFromIndexSignature": true,
  "forceConsistentCasingInFileNames": true,
  "isolatedModules": true,
  "module": "ESNext",
  "moduleResolution": "bundler"
}
```

These settings catch:
- Unused variables/parameters
- Missing return statements
- Incomplete switch cases
- Unsafe property access on objects
- Hidden type issues

## Affected Apps

| App | Status | Action |
|-----|--------|--------|
| backend | Uses NodeNext | ❌ Change to bundler, remove all .js |
| startup-v2 | Uses bundler | ❌ Already correct config, but remove .js from imports |
| panel | Uses Vite bundler | ✅ No changes (already correct) |
| startup (legacy) | - | Skip (being deprecated) |

## Tasks

### 1.1 Update backend/tsconfig.json

**File**: `source/apps/backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "target": "ES2022",
    "module": "ESNext",              // Changed from NodeNext
    "moduleResolution": "bundler",   // Changed from NodeNext
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,          // NEW: catch unused variables
    "noUnusedParameters": true,      // NEW: catch unused params
    "noImplicitReturns": true,       // NEW: ensure all paths return
    "noFallthroughCasesInSwitch": true,  // NEW: catch incomplete switches
    "noUncheckedIndexedAccess": true,    // NEW: safer object access
    "noImplicitOverride": true,      // NEW: explicit override in classes
    "exactOptionalPropertyTypes": true,  // NEW: stricter optional handling
    "noPropertyAccessFromIndexSignature": true,  // NEW: safer property access
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,         // NEW: each file is independent module
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true                // NEW: easier debugging
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.1b Update panel/tsconfig.app.json with Strict Settings

**File**: `source/apps/panel/tsconfig.app.json`

Add the same strict settings to the `compilerOptions`:

```json
{
  "extends": "@vue/tsconfig/tsconfig.web.json",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["env.d.ts", "src/**/*", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.vite-config.json" }]
}
```

Also update `tsconfig.vitest.json` with the same strict settings.

### 1.1c Update startup-v2/tsconfig.json with Strict Settings

**File**: `source/apps/startup-v2/tsconfig.json`

It likely already has many strict settings. Ensure all these are present:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "types": ["bun-types"],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "paths": {
      "@domain/*": ["./src/domain/*"],
      "@application/*": ["./src/application/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@presentation/*": ["./src/presentation/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.2 Remove .js from Backend Imports

All files in `source/apps/backend/src/**/*.ts` need imports updated. Use a script or IDE find-replace:

**Find & Replace Pattern**:
- **Find**: `from "([^"]+)\.js"`
- **Replace**: `from "$1"`

**Or manually in these key files** (contains many imports):
- `src/index.ts`
- `src/routes/configRoute.ts`
- `src/routes/engineRoute.ts`
- `src/routes/healthRoute.ts`
- `src/routes/restartRoute.ts`
- `src/routes/thermalRoute.ts`
- `src/routes/unitsRoute.ts`
- `src/fetch/fetchFromUnits.ts`
- `src/services/config/loader.ts`
- `src/services/config/factory.ts`
- `src/services/config/main.ts`
- `src/middleware/validate.ts`
- `src/utils/actions.ts`
- `src/utils/response.ts`
- `src/utils/url.ts`
- `src/state/config.ts`
- All `__tests__/**/*.test.ts` files

**Example changes**:
```typescript
// src/index.ts - Before:
import { modulesObject } from "./modules/init.js";
import { configRoute } from "./routes/configRoute.js";
import { loadConfig } from "./services/config/loader.js";

// After:
import { modulesObject } from "./modules/init";
import { configRoute } from "./routes/config-route";  // Also doing kebab-case rename here
import { loadConfig } from "./services/config/loader";
```

### 1.3 Update startup-v2 Imports

**File**: `source/apps/startup-v2/tsconfig.json`

Already correct:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    ...
  }
}
```

**But imports still have `.js`** — remove them from all files in `src/`:

**Find & Replace**: Same pattern as backend

Key files with many imports:
- `src/presentation/cli.ts`
- `src/application/context.ts`
- `src/application/orchestrators/build.ts`
- `src/application/orchestrators/update.ts`
- `src/application/orchestrators/startup.ts`
- `src/application/orchestrators/process.ts`
- `src/application/orchestrators/override.ts`
- `src/presentation/adapter-factory.ts`
- `src/presentation/config-loader.ts`
- All `.test.ts` files

**Example changes**:
```typescript
// src/presentation/cli.ts - Before:
import { createAppContext } from "../application/context.js";
import { startup } from "../application/orchestrators/index.js";

// After:
import { createAppContext } from "../application/context";
import { startup } from "../application/orchestrators/index";
```

### 1.4 Type-Check All Apps

Run type checking in all three apps:

```bash
cd source/apps/backend && bun run typecheck
cd ../panel && bun run typecheck
cd ../startup-v2 && bun run typecheck
```

**All three should pass with no errors.**

### 1.5 Test Build Process

Build each app:

```bash
cd source && bun run build
```

Should complete without errors.

### 1.6 Test Dev Mode

Start dev servers:

```bash
cd source && bun run dev
```

Backend, Panel, and any other services should start correctly.

**Browser test**: Navigate to `http://localhost:3002` and confirm panel loads.

## Verification Checklist

- [ ] `bun run typecheck` passes in backend
- [ ] `bun run typecheck` passes in panel
- [ ] `bun run typecheck` passes in startup-v2
- [ ] `bun run build` succeeds
- [ ] `bun run dev` starts all services without errors
- [ ] Manual test: Panel loads at http://localhost:3002
- [ ] All imports in TypeScript files don't end with `.js`

**Command to verify no .js extensions remain**:
```bash
cd source/apps/backend
grep -r "from ['\"].*\.js['\"]" src/
# Should return no results

cd ../startup-v2
grep -r "from ['\"].*\.js['\"]" src/
# Should return no results
```

## Files Changed Summary

| Action | Files |
|--------|-------|
| Edit | `source/apps/backend/tsconfig.json` |
| Edit | ~50 files in `source/apps/backend/src/**/*.ts` (remove .js) |
| Edit | ~30 files in `source/apps/startup-v2/src/**/*.ts` (remove .js) |

## Rollback

If imports break after this change:

1. Revert tsconfig changes:
   ```bash
   git checkout source/apps/backend/tsconfig.json
   ```

2. Revert import changes:
   ```bash
   git checkout source/apps/backend/src/
   git checkout source/apps/startup-v2/src/
   ```

3. Verify types again:
   ```bash
   bun run typecheck
   ```

## Notes

- This change is **safe** because TypeScript and bundlers both handle extensionless imports
- `panel` app doesn't need changes (already uses bundler resolution via Vite)
- After this, plan 2 (File Renaming) can proceed with camelCase → kebab-case renames
- The bundler resolution is more modern and aligns with how frontend bundlers work

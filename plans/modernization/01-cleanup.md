# Project 1: Cleanup & Dead Code Removal

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Remove dead code, fix obvious bugs, clean up project structure |
| **Risk** | Low |
| **Effort** | 1-2 days |
| **Dependencies** | None |
| **Unlocks** | Cleaner codebase for all subsequent work |

## Why First?

This project has zero risk and immediate benefits:
- Removes noise that could confuse during later migrations
- Fixes bugs that could cause issues during testing
- Quick wins build momentum
- No breaking changes possible

## Tasks

### 1.1 Remove Unused Dependencies

#### Backend `package.json`
- [x] Remove `lowdb` - Listed but never imported (config comes from configer via HTTP)

#### Root Level
- [x] Delete `source/yarn.lock` - Project uses pnpm, this is legacy
- [x] Delete `source/apps/panel/pnpm-lock.yaml` - Duplicate, should use root lock file only

### 1.2 Delete Dead Files

#### Backend
| File | Reason |
|------|--------|
| `src/utils/checkInit.ts` | Never called anywhere |
| `src/types/data.types.ts` | Contains only empty interfaces, never used properly |
| `src/utils/transformData.ts` | Functions are no-ops (return input unchanged) |

#### Panel
| File | Reason |
|------|--------|
| `src/logic/settings/table.ts` | Completely empty file (0 lines) |

### 1.3 Fix Bugs

#### Backend - Typo in Environment Variable
**File**: `src/modules/restart.ts:26`
```typescript
// Before (typo):
const interval: number = parseInt(process.env.RESTART_INTEVAL) || 20000;

// After:
const interval: number = parseInt(process.env.RESTART_INTERVAL) || 20000;
```

#### Startup - False Positive Build Errors
**File**: `src/logic/start/ubuntu.js` (and `windows.js`)

The build function treats any stderr as failure, but npm/pnpm write warnings to stderr even on success.

```javascript
// Before:
if (stderr) {
  buildLogger.error(...);
  return Result.Error;
}

// After:
// Only treat as error if the command actually failed (check exit code instead)
// Or log stderr as warning but don't fail the build
```

### 1.4 Address Critical TODOs

#### Panel - Connection Tracker
**File**: `src/logic/panel/connections.ts:1`
```typescript
// TODO: Remove this file - move to connection store
```
- [x] Move `ConnectionTracker` class logic into `connectionStore.ts`
- [x] Delete `connections.ts` after migration
- [x] Update imports in `connection.types.ts`

#### Panel - Units Store Getters  
**File**: `src/pinia/unitsStore.ts:25`
```typescript
// TODO: Add used getters
```
- [x] Add commonly computed getters (or document why none needed)

### 1.5 Remove Unused Code

#### Backend - Unused Parameters
**File**: `src/routes/engineRoute.ts` and `thermalRoute.ts`
- Functions receive parameters that are never used (prefixed with `_`)
- Either use them or remove from signature

#### Panel - Unused Parameters
**File**: `src/logic/panel/tables.ts`
- Functions like `getTableTemperaturesValues` receive unused `_: Maybe<ThermalUnit>`
- Clean up signatures

### 1.6 Update Pinned Versions in Install Scripts

**File**: `src/logic/install/ubuntu.js` (and `windows.js`)

Current pins are from 2022:
```javascript
await exec("npm install -g pnpm@7.5.0");
await exec("npm install -g typescript@4.7.4");
await exec("npm install -g ts-node@10.9.1");
```

Update to more recent stable versions (will be replaced by Bun later, but good to update now):
```javascript
await exec("npm install -g pnpm@9");
await exec("npm install -g typescript@5");
await exec("npm install -g ts-node@10");
```

Also update `source/package.json`:
```json
"packageManager": "pnpm@9.0.0"
```

## Verification

After completing all tasks:

1. **Build check**:
   ```bash
   cd source && pnpm install && pnpm build
   ```

2. **No import errors**: All files should compile without "module not found" errors

3. **Functionality preserved**: Manual test that panel loads and displays data

## Files Changed Summary

| Action | Files |
|--------|-------|
| Delete | `yarn.lock`, `apps/panel/pnpm-lock.yaml`, `backend/src/utils/checkInit.ts`, `backend/src/types/data.types.ts`, `backend/src/utils/transformData.ts`, `panel/src/logic/settings/table.ts` |
| Edit | `backend/package.json`, `backend/src/modules/restart.ts`, `startup/src/logic/start/ubuntu.js`, `startup/src/logic/start/windows.js`, `startup/src/logic/install/ubuntu.js`, `startup/src/logic/install/windows.js`, `panel/src/pinia/connectionStore.ts`, `panel/src/logic/panel/panelLoop.ts` |
| Delete (after migration) | `panel/src/logic/panel/connections.ts` |

## Rollback

If issues arise:
- Git revert the commit(s)
- Run `pnpm install` to restore dependencies
- Low risk since we're only removing unused code

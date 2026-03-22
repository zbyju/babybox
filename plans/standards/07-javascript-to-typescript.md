# Project 7: JavaScript to TypeScript Conversion

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking. **Must complete [Project 1](./01-typescript-config.md) first** to have strict TS settings in place.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Convert all remaining .js files to .ts (non-legacy apps) |
| **Risk** | Low (mostly rename + add types) |
| **Effort** | 1 hour |
| **Dependencies** | Project 1 (strict TS config) |
| **Unlocks** | Pure TypeScript codebase, better type safety |

## Why This Matters

**Current state**: Most code is TypeScript, but some .js files remain
- Reduces type coverage
- Inconsistent language across codebase
- Some files may have looser type checking

**Target**: 100% TypeScript across all non-legacy apps
- backend: all .ts ✓
- panel: all .ts + .vue ✓
- startup-v2: needs verification (likely already all .ts)
- startup: ⏭️ skip (being deprecated)

## Scope

Search for remaining .js files:

```bash
cd source/apps
find . -name "*.js" -type f | grep -v node_modules | grep -v dist
```

Expected findings:
- **backend**: none (already all .ts)
- **panel**: none (already all .ts)
- **startup-v2**: verify configuration files (bunfig.toml is .toml, not .js - OK)

### Possible Leftover JS Files to Check

| File | App | Status | Action |
|------|-----|--------|--------|
| `index.js` (if exists) | Any | Check | → Rename to `index.ts` |
| `setup.js` (if exists) | Any | Check | → Rename to `setup.ts` |
| `config.js` (if exists) | Any | Check | → Convert to .ts |
| Vite config | panel | ⚠️ Check | → Should be vite.config.ts |

## Tasks

### 7.1 Search for All .js Files

```bash
cd source
find . -type f -name "*.js" | grep -v node_modules | grep -v dist | grep -v ".next"
```

Document what you find (likely very few or none).

### 7.2 Check Vite Config (Panel)

**File**: `source/apps/panel/vite.config.ts` or `vite.config.js`

If it's `.js`, rename to `.ts`:

```bash
cd source/apps/panel
git mv vite.config.js vite.config.ts
```

**Update vite.config.ts with types**:

```typescript
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

### 7.3 Check Turborepo Config

**File**: `source/turbo.json`

Already `.json` (correct). No changes needed.

### 7.4 Check tsconfig Files

**Files**: All `tsconfig.json`, `tsconfig.*.json` files

These should be `.json`. If any are `.js`, convert to `.json`.

### 7.5 Check Test Config Files

**Files**: `vitest.config.ts`, `jest.config.js` (if exists)

- `vitest.config.ts` should already exist (correct)
- If `jest.config.js` exists, it's a leftover → delete it

```bash
rm source/apps/backend/jest.config.js  # if it exists
```

### 7.6 Verify Type Definitions

After ensuring all code is `.ts`, run typecheck:

```bash
cd source
bun run typecheck
```

Should pass with **zero errors**.

### 7.7 Rebuild to Verify

```bash
cd source
bun run build
```

All apps should compile successfully.

## File Conversion Steps (If Needed)

If you find any `.js` files that should be `.ts`:

1. **Rename the file**:
   ```bash
   git mv source/file.js source/file.ts
   ```

2. **Add TypeScript types** (at minimum):
   ```typescript
   // Before:
   function process(data) {
     return data.map(item => item.value)
   }

   // After:
   import type { DataItem } from './types'

   function process(data: DataItem[]): number[] {
     return data.map((item) => item.value)
   }
   ```

3. **Update imports** if any files imported the old `.js`:
   ```typescript
   // Old:
   import { process } from './file.js'

   // New:
   import { process } from './file'  // TypeScript resolves to .ts
   ```

4. **Type check**:
   ```bash
   bun run typecheck
   ```

## Verification Checklist

- [ ] No `.js` files found in backend source (besides test artifacts)
- [ ] No `.js` files found in panel source (besides test artifacts)
- [ ] No `.js` files found in startup-v2 source (besides test artifacts)
- [ ] `vite.config.ts` exists (or `.js` was renamed to `.ts`)
- [ ] `jest.config.json` removed from backend (if it existed)
- [ ] All build config files are `.json` or `.ts` (not `.js`)
- [ ] `bun run typecheck` passes with zero errors
- [ ] `bun run build` succeeds
- [ ] `bun run test` passes

**Verify with search**:
```bash
cd source
find apps -type f -name "*.js" | grep -v node_modules | wc -l
# Should return: 0
```

## Files Changed

| Action | Files |
|--------|-------|
| Rename | `vite.config.js` → `vite.config.ts` (if needed) |
| Delete | `jest.config.js` (leftover) |
| Update | Import statements if any `.js` files were renamed |

## Rollback

If conversion causes issues:

```bash
# Revert renames
git checkout source/apps/

# Reinstall
bun install
```

## Notes

- This project is likely **very short** — most code is already TypeScript
- The main task is finding and converting any stragglers
- Configuration files (`.json`, `.toml`) don't need to be `.ts`
- Test output (`.d.ts` declaration files) are fine as-is
- After this, 100% of application code is TypeScript — easier to maintain and safer
- This completes the "strict ESM + pure TypeScript" requirement from the user

## After Completion

Once this project is done:
- ✅ Zero `.js` files in application code
- ✅ Strict TypeScript settings enforced
- ✅ Pure ESM across all apps
- ✅ Ready for Project 2 (File Renaming) to proceed

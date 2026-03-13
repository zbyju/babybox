# Project 5: Dependency Updates

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Update all dependencies to current versions |
| **Risk** | Medium |
| **Effort** | 3-5 days |
| **Dependencies** | #3 ESM, #4 Testing (recommended) |
| **Unlocks** | Modern tooling, security fixes, Bun compatibility |

## Why After ESM & Tests?

- ESM migration removes blockers for some packages
- Tests catch breaking changes during updates
- Systematic approach reduces debugging time

## Update Strategy

Updates are grouped by risk level. Do each group, test, then proceed.

## Group 1: Safe Updates (Non-Breaking)

These are minor version bumps with no breaking changes.

### All Apps

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| typescript | ^4.7.4 | ^5.4 | Minor syntax changes |
| @types/node | ^16-18 | ^20 | Type definitions only |

### Backend

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| express | ^4.18.1 | ^4.21 | Patch updates |
| dotenv | ^16.0.1 | ^16.4 | Minor updates |
| winston | ^3.8.1 | ^3.17 | Minor updates |
| cors | ^2.8.5 | ^2.8.5 | Already latest |
| morgan | ^1.10.0 | ^1.10.0 | Already latest |

### Panel

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| vue | ^3.2.33 | ^3.4 | Minor updates, no breaking |
| vue-router | ^4.0.14 | ^4.3 | Minor updates |
| pinia | ^2.0.13 | ^2.1 | Minor updates |
| howler | ^2.2.3 | ^2.2.4 | Patch |
| lodash | ^4.17.21 | ^4.17.21 | Already latest |

### Commands
```bash
cd source

# Update TypeScript across all apps
pnpm -r update typescript@^5.4

# Update @types/node
pnpm -r update @types/node@^20

# Backend safe updates
cd apps/backend
pnpm update express@^4.21 dotenv@^16.4 winston@^3.17

# Panel safe updates  
cd ../panel
pnpm update vue@^3.4 vue-router@^4.3 pinia@^2.1
```

## Group 2: Tooling Updates (Dev Dependencies)

These affect development but not production runtime.

### All Apps - Linting/Formatting

| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| prettier | ^2.7.1 | ^3.3 | Config format, trailing commas |
| eslint | ^8.x | ^8.57 | Stay on 8.x, 9.x is major rewrite |
| @typescript-eslint/* | ^5.x | ^7.x | Rule name changes |

### Prettier 3 Migration

Update `.prettierrc` or `prettier.config.js`:
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5"
}
```

Run prettier to reformat:
```bash
pnpm prettier --write "**/*.{ts,tsx,vue,json}"
```

### ESLint Plugin Updates

```bash
pnpm update @typescript-eslint/eslint-plugin@^7 @typescript-eslint/parser@^7
```

May need to update rule configurations in `.eslintrc`.

## Group 3: Build Tooling (Medium Risk)

These affect the build process.

### Panel - Vite Ecosystem

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| vite | ^2.9.5 | ^5.4 | Major config changes |
| @vitejs/plugin-vue | ^2.3.1 | ^5.1 | Must match Vite version |
| vue-tsc | ^0.38.2 | ^2.0 | New CLI |
| vitest | ^0.9.3 | ^2.0 | Config changes |

#### Vite 5 Migration Steps

1. **Update packages together**:
   ```bash
   cd source/apps/panel
   pnpm update vite@^5 @vitejs/plugin-vue@^5 vitest@^2 vue-tsc@^2
   ```

2. **Update vite.config.ts**:
   ```typescript
   // Vite 5 changes
   import { defineConfig } from "vite";
   import vue from "@vitejs/plugin-vue";
   import { resolve } from "path";

   export default defineConfig({
     plugins: [vue()],
     resolve: {
       alias: {
         "@": resolve(__dirname, "./src"),
       },
     },
     server: {
       port: 4000,
     },
     build: {
       outDir: "dist",
     },
     css: {
       preprocessorOptions: {
         stylus: {
           additionalData: `@import "${resolve(__dirname, "src/assets/styles/variables.styl")}"`,
         },
       },
     },
   });
   ```

3. **Update build script**:
   ```json
   {
     "scripts": {
       "build": "vue-tsc -b && vite build"
     }
   }
   ```

### Backend - Test Runner

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| jest | ^28.1.3 | ^29.7 | Config changes |
| ts-jest | ^28.0.7 | ^29.2 | Must match Jest |
| @types/jest | ^28.1.6 | ^29.5 | Must match Jest |

Or migrate to Vitest (recommended for consistency with panel).

### Nodemon Update

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| nodemon | ^2.0.19 | ^3.1 | Minor config changes |

## Group 4: Breaking Changes (Higher Risk)

These require code changes.

### Axios 0.x → 1.x

**Affected**: Backend, Panel

| Before | After |
|--------|-------|
| `axios.defaults.headers.common` | `axios.defaults.headers.common` (same) |
| Error handling | `AxiosError` type improved |
| Request config | Some options renamed |

**Code changes needed**:

```typescript
// Before (0.x):
import axios, { AxiosResponse } from "axios";
axios.get(url).catch((err) => {
  if (axios.isAxiosError(err)) { ... }
});

// After (1.x) - mostly same, but:
import axios, { AxiosError, isAxiosError } from "axios";
axios.get(url).catch((err) => {
  if (isAxiosError(err)) { ... }
});
```

**Migration steps**:
1. Update axios: `pnpm update axios@^1.7`
2. Search for all axios usage
3. Update error handling if needed
4. Test API calls

### Open 8.x → 10.x (Backend)

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| open | ^8.4.0 | ^10.1 | ESM-only in 9+ |

```typescript
// Usage is the same, but requires ESM
import open from "open";
await open("http://localhost:5000");
```

### fs-extra Update (Startup)

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| fs-extra | ^10.1.0 | ^11.2 | Minor API changes |

```bash
cd source/apps/startup
pnpm update fs-extra@^11 @types/fs-extra@^11
```

## Group 5: Optional Replacements

### moment.js → dayjs or date-fns

`moment` is in maintenance mode. Consider replacing:

| Current | Option A | Option B |
|---------|----------|----------|
| moment | dayjs | date-fns |
| 290KB | 2KB | Tree-shakeable |
| Mutable | Immutable | Immutable |

**dayjs migration** (API-compatible):
```typescript
// Before:
import moment from "moment";
moment().format("DD.MM.YYYY HH:mm:ss");

// After:
import dayjs from "dayjs";
dayjs().format("DD.MM.YYYY HH:mm:ss");
```

**Decision**: Can defer this - moment still works fine.

## Update Order

```
1. Group 1 (Safe) → Test
2. Group 2 (Tooling) → Verify dev workflow
3. Group 3 (Build) → Full build test
4. Group 4 (Breaking) → Thorough testing
5. Group 5 (Optional) → If time permits
```

## Verification After Each Group

```bash
# Type check
cd source && pnpm -r typecheck

# Build
cd source && pnpm build

# Tests
cd source && pnpm test

# Manual test
cd source && pnpm dev
# Open browser, verify panel works
```

## Package.json Final State (Example)

### Root
```json
{
  "packageManager": "pnpm@9.0.0",
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

### Backend
```json
{
  "dependencies": {
    "axios": "^1.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.21.0",
    "morgan": "^1.10.0",
    "open": "^10.1.0",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

### Panel
```json
{
  "dependencies": {
    "axios": "^1.7.0",
    "howler": "^2.2.4",
    "pinia": "^2.1.0",
    "vue": "^3.4.0",
    "vue-router": "^4.3.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-vue": "^5.1.0",
    "vitest": "^2.0.0",
    "vue-tsc": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

## Rollback

For each group:
1. Git stash/commit before starting
2. If issues: `git checkout -- package.json pnpm-lock.yaml`
3. Run `pnpm install` to restore

## Notes

- Update one app at a time if issues arise
- Keep detailed notes of what breaks and how to fix
- Some packages may need peer dependency overrides

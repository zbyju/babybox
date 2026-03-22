# Project 2: File Renaming - camelCase → kebab-case

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking. **Must complete [Project 1](./01-typescript-config.md) first** to have clean imports.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Rename all TypeScript files to kebab-case naming convention |
| **Risk** | Medium (many file renames, many imports to update) |
| **Effort** | 3 hours |
| **Dependencies** | Project 1 (clean imports first) |
| **Unlocks** | Consistent naming across codebase |

## Why This Matters

**Current state**: Mixed naming conventions
- Backend files: `camelCase` (`configRoute.ts`, `fetchFromUnits.ts`)
- Panel files: `camelCase` (`appStateStore.ts`, `panelLoop.ts`)
- startup-v2: Already uses `kebab-case` ✓
- Vue components: `PascalCase` (correct, Vue convention)

**Standard**: TypeScript/JavaScript files should use `kebab-case` (matches modern conventions in Angular, Nuxt, etc.). Vue components correctly use `PascalCase`.

## Scope

| App | Action | Notes |
|-----|--------|-------|
| backend | Rename `.ts` files | ~10-15 files |
| panel | Rename `.ts` files | ~15-20 files (NOT `.vue` components) |
| startup-v2 | ✅ Skip | Already correct |
| startup | ⏭️ Skip | Being deprecated |

## File Renames - Backend

All renames in `source/apps/backend/src/`:

| Old Name | New Name | Type |
|----------|----------|------|
| `fetch/fetchFromUnits.ts` | `fetch/fetch-from-units.ts` | route |
| `routes/configRoute.ts` | `routes/config-route.ts` | route |
| `routes/engineRoute.ts` | `routes/engine-route.ts` | route |
| `routes/healthRoute.ts` | `routes/health-route.ts` | route |
| `routes/restartRoute.ts` | `routes/restart-route.ts` | route |
| `routes/thermalRoute.ts` | `routes/thermal-route.ts` | route |
| `routes/unitsRoute.ts` | `routes/units-route.ts` | route |
| `utils/fetchWithTimeout.ts` | (in panel, see below) | - |
| `middleware/validate.ts` | ✓ Already ok | - |
| `modules/init.ts` | ✓ Already ok | - |
| `modules/restart.ts` | ✓ Already ok | - |
| `services/config/factory.ts` | ✓ Already ok | - |
| `services/config/loader.ts` | ✓ Already ok | - |
| `services/config/main.ts` | ✓ Already ok | - |
| `services/config/version.ts` | ✓ Already ok | - |
| `state/config.ts` | ✓ Already ok | - |
| `types/*.types.ts` | ✓ Already ok (dot-separated pattern) | - |
| `schemas/*.schema.ts` | ✓ Already ok (dot-separated pattern) | - |
| `utils/*.ts` | ✓ Already ok | - |

**Backend Total**: 7 files to rename

## File Renames - Panel

All renames in `source/apps/panel/src/`:

| Old Name | New Name | Type |
|----------|----------|------|
| `pinia/appStateStore.ts` | `pinia/app-state-store.ts` | store |
| `pinia/configStore.ts` | `pinia/config-store.ts` | store |
| `pinia/connectionStore.ts` | `pinia/connection-store.ts` | store |
| `pinia/panelStateStore.ts` | `pinia/panel-state-store.ts` | store |
| `pinia/unitsStore.ts` | `pinia/units-store.ts` | store |
| `pinia/versions.ts` | ✓ Already ok | - |
| `logic/panel/panelLoop.ts` | `logic/panel/panel-loop.ts` | logic |
| `logic/panel/combineTableData.ts` | `logic/panel/combine-table-data.ts` | logic |
| `composables/useCamera.ts` | `composables/use-camera.ts` | composable |
| `composables/useSounds.ts` | `composables/use-sounds.ts` | composable |
| `composables/useActiveTime.ts` | `composables/use-active-time.ts` | composable |
| `composables/useBigClockColon.ts` | `composables/use-big-clock-colon.ts` | composable |
| `composables/useDelayedMessage.ts` | `composables/use-delayed-message.ts` | composable |
| `utils/fetchWithTimeout.ts` | `utils/fetch-with-timeout.ts` | util |
| `api/units.ts` | ✓ Already ok | - |
| `api/restart.ts` | ✓ Already ok | - |
| `logic/panel/state.ts` | ✓ Already ok | - |
| `logic/panel/tables.ts` | ✓ Already ok | - |
| `defaults/*.defaults.ts` | ✓ Already ok (dot-separated pattern) | - |
| `types/**/*.types.ts` | ✓ Already ok (dot-separated pattern) | - |
| `.vue` components | ✅ **DO NOT RENAME** | Keep PascalCase |

**Panel Total**: ~12-15 files to rename

## Tasks

### 2.1 Rename Backend Files

Use your IDE's refactoring tool or git mv:

```bash
cd source/apps/backend/src

# Routes
git mv routes/configRoute.ts routes/config-route.ts
git mv routes/engineRoute.ts routes/engine-route.ts
git mv routes/healthRoute.ts routes/health-route.ts
git mv routes/restartRoute.ts routes/restart-route.ts
git mv routes/thermalRoute.ts routes/thermal-route.ts
git mv routes/unitsRoute.ts routes/units-route.ts

# Fetch
git mv fetch/fetchFromUnits.ts fetch/fetch-from-units.ts
```

**Verify**:
```bash
git status  # Should show renames
```

### 2.2 Rename Panel Files

```bash
cd source/apps/panel/src

# Pinia stores
git mv pinia/appStateStore.ts pinia/app-state-store.ts
git mv pinia/configStore.ts pinia/config-store.ts
git mv pinia/connectionStore.ts pinia/connection-store.ts
git mv pinia/panelStateStore.ts pinia/panel-state-store.ts
git mv pinia/unitsStore.ts pinia/units-store.ts

# Logic
git mv logic/panel/panelLoop.ts logic/panel/panel-loop.ts
git mv logic/panel/combineTableData.ts logic/panel/combine-table-data.ts

# Composables
git mv composables/useCamera.ts composables/use-camera.ts
git mv composables/useSounds.ts composables/use-sounds.ts
git mv composables/useActiveTime.ts composables/use-active-time.ts
git mv composables/useBigClockColon.ts composables/use-big-clock-colon.ts
git mv composables/useDelayedMessage.ts composables/use-delayed-message.ts

# Utils
git mv utils/fetchWithTimeout.ts utils/fetch-with-timeout.ts
```

### 2.3 Update Imports in Backend

All files that import the renamed files need updates. Use find-replace in your IDE:

**Find Pattern**: `from "(.*)(configRoute|engineRoute|thermalRoute|unitsRoute|healthRoute|restartRoute|fetchFromUnits)"`

**Replace with kebab-case equivalents**:
- `configRoute` → `config-route`
- `engineRoute` → `engine-route`
- `thermalRoute` → `thermal-route`
- `unitsRoute` → `units-route`
- `healthRoute` → `health-route`
- `restartRoute` → `restart-route`
- `fetchFromUnits` → `fetch-from-units`

**Key files to update**:
- `src/index.ts` - imports routes
- Test files in `**/__tests__/*.test.ts`

### 2.4 Update Imports in Panel

All files that import renamed files need updates.

**Find Pattern**: `from "(.*)(appStateStore|configStore|connectionStore|panelStateStore|unitsStore|panelLoop|combineTableData|useCamera|useSounds|useActiveTime|useBigClockColon|useDelayedMessage|fetchWithTimeout)"`

**Replace with kebab-case equivalents**:
- `appStateStore` → `app-state-store`
- `configStore` → `config-store`
- `connectionStore` → `connection-store`
- `panelStateStore` → `panel-state-store`
- `unitsStore` → `units-store`
- `panelLoop` → `panel-loop`
- `combineTableData` → `combine-table-data`
- `useCamera` → `use-camera`
- `useSounds` → `use-sounds`
- `useActiveTime` → `use-active-time`
- `useBigClockColon` → `use-big-clock-colon`
- `useDelayedMessage` → `use-delayed-message`
- `fetchWithTimeout` → `fetch-with-timeout`

**Key files to update**:
- `src/main.ts` - imports stores
- `src/App.vue` - imports composables
- `src/logic/panel/panel-loop.ts` (formerly panelLoop.ts) - imports stores
- All `.vue` component files
- Test files in `**/__tests__/*.test.ts`

### 2.5 Type Check

Verify all imports resolve correctly:

```bash
cd source && bun run typecheck
```

Should show **no type errors**. If import paths are wrong, TypeScript will catch them.

### 2.6 Build

```bash
cd source && bun run build
```

Should succeed without errors.

### 2.7 Test

```bash
cd source && bun run test
```

All tests should pass. If a test file references a renamed module, imports will be updated automatically if you used IDE refactoring.

### 2.8 Dev Test

```bash
cd source && bun run dev
```

All services should start:
- Backend at port 3000
- Panel at port 3002

**Browser test**: Navigate to `http://localhost:3002`, confirm panel loads and functions.

## Verification Checklist

- [ ] All renamed files exist with new names
- [ ] No old files remain (or are deleted)
- [ ] `bun run typecheck` passes with **zero errors**
- [ ] `bun run build` succeeds
- [ ] `bun run test` passes
- [ ] `bun run dev` starts all services
- [ ] Panel loads and displays data at http://localhost:3002
- [ ] Backend can connect to hardware units (if available)

**Search for remaining camelCase imports** (should find none):
```bash
cd source/apps/backend
grep -r "configRoute\|engineRoute\|thermalRoute\|unitsRoute\|healthRoute\|restartRoute\|fetchFromUnits" src/ | grep -v node_modules
# Should return no results

cd ../panel
grep -r "appStateStore\|configStore\|connectionStore\|panelStateStore\|unitsStore\|panelLoop\|combineTableData\|useCamera\|useSounds\|useActiveTime\|useBigClockColon\|useDelayedMessage\|fetchWithTimeout" src/ | grep -v node_modules
# Should return no results
```

## Files Changed Summary

| Action | Count | Examples |
|--------|-------|----------|
| Rename | ~20 | `configRoute.ts` → `config-route.ts`, `appStateStore.ts` → `app-state-store.ts` |
| Update imports | ~50 | Files that import renamed modules |
| Delete | 0 | (git mv handles this) |

## Rollback

If renames break the build unexpectedly:

```bash
# Revert all renames
git reset --hard HEAD

# Or selectively restore individual files:
git checkout HEAD -- source/apps/backend/src/routes/
git checkout HEAD -- source/apps/panel/src/pinia/
```

## Notes

- **IDE refactoring is safest**: Use "Rename Symbol" in your editor (Cmd+R in VS Code) on each file — it updates all imports automatically
- **OR use `git mv` + manual grep**: If not using IDE, search for each old name and replace with kebab-case
- Vue component files (`.vue`) should **NOT** be renamed — keep their PascalCase convention
- Test files will be updated as part of the import updates
- After this project, imports will be clean and consistent across the codebase

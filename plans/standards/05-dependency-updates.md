# Project 5: Dependency Updates & Alignment

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking. Best completed after [Projects 1 & 3](./01-typescript-config.md) for import cleanliness.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Align dependency versions across all apps, remove unused packages |
| **Risk** | Low-Medium (some version bumps are breaking changes) |
| **Effort** | 1 hour |
| **Dependencies** | Project 1 (imports clean), Project 3 (tooling updated) |
| **Unlocks** | No more version mismatches, smaller node_modules |

## Why This Matters

**Current state** (misaligned):

| Package | backend | panel | startup-v2 | Issue |
|---------|---------|-------|------------|-------|
| `zod` | ^4.3.6 | ^4.3.6 | ^3.23.0 | ❌ Major version mismatch |
| `typescript` | ^5.9.3 | ^5.9.3 | ^5.4.0 | ⚠️ Minor mismatch |
| `bun` (packageManager) | root: 1.0.0 | — | — | ❌ Outdated (actual: 1.2.21) |
| `moment` | ^2.29.3 | ^2.29.3 | — | ℹ️ Consider modern alternative |
| `jest` | backend | — | — | ❌ Unused (migrated to vitest) |
| `ts-jest` | backend | — | — | ❌ Unused (migrated to vitest) |
| `nodemon` | backend | — | — | ❌ Unused (use bun --watch) |

**Target**: Consistent, modern versions across all apps.

## Tasks

### 5.1 Update Root package.json - Bun Version

**File**: `source/package.json`

Update `packageManager` to match actual installed version:

```json
{
  "packageManager": "bun@1.2.21"
}
```

### 5.2 Update startup-v2 - Zod (Breaking Change)

**File**: `source/apps/startup-v2/package.json`

Update zod from v3 to v4:

```json
{
  "dependencies": {
    "zod": "^4.3.6"  // Changed from ^3.23.0
  }
}
```

**⚠️ Breaking Changes Check**: Zod v3 → v4 has breaking changes. Common patterns still work:

| Pattern | v3 | v4 | Status |
|---------|----|----|--------|
| `schema.parse()` | ✓ | ✓ | Same |
| `schema.safeParse()` | ✓ | ✓ | Same |
| `.z.literal()` | ✓ | ✓ | Same |
| `.z.discriminatedUnion()` | ✓ | ✓ | Same |
| `.z.object()` | ✓ | ✓ | Same |

**Check if startup-v2 code breaks**:

```bash
cd source/apps/startup-v2
bun install
bun run typecheck
bun run test
bun run build:all
```

Should all pass. If not, review breaking changes at https://zod.dev/CHANGELOG

### 5.3 Update startup-v2 - TypeScript

**File**: `source/apps/startup-v2/package.json`

Update TypeScript to match other apps:

```json
{
  "devDependencies": {
    "typescript": "^5.9.3"  // Changed from ^5.4.0
  }
}
```

### 5.4 Remove Unused Dependencies - Backend

**File**: `source/apps/backend/package.json`

After tooling standardization (Project 3), remove:

```json
{
  "devDependencies": {
    // DELETE THESE:
    "jest": "^28.1.3",
    "ts-jest": "^28.0.7",
    "nodemon": "^3.1.14",
    "coveralls": "^3.1.1",
    // (already removed in project 3: eslint, prettier, @typescript-eslint/*, etc.)
  }
}
```

### 5.5 Remove Leftover Files - Backend

**File**: `source/apps/backend/jest.config.json`

Delete this file (leftover from Jest → Vitest migration):

```bash
rm source/apps/backend/jest.config.json
```

### 5.6 Verify Dependencies in All Apps

Update bun lock file:

```bash
cd source
bun install
```

This will:
- Update `bun.lock` to reflect new versions
- Validate all dependencies resolve correctly
- Report any conflicts

### 5.7 Verify No Type Conflicts

Run typecheck across all apps:

```bash
cd source
bun run typecheck
```

Should complete with **no errors**. If there are TypeScript version-related errors:

```bash
# Regenerate types
cd source
bun install --force
```

### 5.8 Run All Tests

```bash
cd source
bun run test
```

All tests should pass. If a test fails:

1. Note which app/test failed
2. Check if it's related to the dependency update
3. Fix or rollback that specific dependency

### 5.9 Test Build

```bash
cd source
bun run build
```

All apps should build successfully.

### 5.10 Verify startup-v2 Binaries

If startup-v2 is critical, test binary builds:

```bash
cd source/apps/startup-v2
bun run build:all
```

Should generate 4 binaries:
- `dist/startup-ubuntu`
- `dist/startup-windows.exe`
- `dist/startup-mac`
- `dist/startup-mac-intel`

All should be executable.

## Optional: Consider Replacing moment

**Note**: `moment` is considered a legacy library. Consider modernizing:

**Current usage**: Time display in panel (clock, timers)

**Modern alternatives**:
- **date-fns** - Lightweight, modern, tree-shakeable
- **Day.js** - Lightweight drop-in replacement
- **Native Date API** - For simple use cases

**If upgrading**:

```bash
# Remove moment
npm remove moment

# Add alternative (example with date-fns)
npm install date-fns
```

Then update imports in backend and panel:

```typescript
// Before:
import moment from "moment";
const time = moment().format("HH:mm:ss");

// After (with date-fns):
import { format } from "date-fns";
const time = format(new Date(), "HH:mm:ss");
```

⚠️ This is **optional** — moment still works fine. Only if you want to modernize.

## Dependency Size Check (Optional)

Compare `node_modules` sizes before and after:

```bash
# Before updates
du -sh node_modules/

# After updates
du -sh node_modules/
```

Removing jest, ts-jest, coveralls, and moment could save 50-100MB.

## Verification Checklist

- [x] `bun.lock` updated (run `bun install`)
- [x] `bun run typecheck` passes in all apps
- [x] `bun run test` passes
- [x] `bun run build` succeeds
- [x] `bun run lint` passes
- [x] No version conflicts in output
- [x] Root package.json shows `bun@1.2.21`
- [x] startup-v2 builds all 4 binaries
- [x] Optional: moment replaced (if decided)

**Version verification**:
```bash
# Check what versions are actually installed
cd source
cat bun.lock | grep -E "zod|typescript|moment" | head -20
```

## Files Changed

| Action | Files |
|--------|-------|
| Edit | `source/package.json` |
| Edit | `source/apps/backend/package.json` |
| Edit | `source/apps/startup-v2/package.json` |
| Delete | `source/apps/backend/jest.config.json` |
| Auto-update | `source/bun.lock` |

## Rollback

If version bumps cause issues:

```bash
# Restore original versions
git checkout source/package.json source/apps/*/package.json

# Clear lock and reinstall
rm source/bun.lock
cd source && bun install

# Revert workspace state
bun run typecheck
```

## Notes

- **Zod v3→v4 breakage**: Rare in typical usage. Check startup-v2 tests pass.
- **TypeScript minor bump**: Safe, mostly backwards-compatible
- **Bun packageManager**: Just documenting actual version, no harm in staying on older version string
- **Jest/ts-jest removal**: Safe if Project 3 (tooling) fully completed vitest migration
- **moment replacement**: Optional improvement, not critical

## After This Project

All 5 standards projects will be complete! 🎉

**Summary of improvements**:
- ✅ No more git config conflicts (Project 0)
- ✅ Clean imports without .js extensions (Project 1)
- ✅ Consistent file naming (kebab-case) (Project 2)
- ✅ Modern tooling (oxlint + oxfmt) (Project 3)
- ✅ Automated CI/CD pipeline (Project 4)
- ✅ Aligned, up-to-date dependencies (Project 5)

Codebase is now at **modern standards**! 🚀

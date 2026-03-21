# Project 10: Backend Logic Migration

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Better separation of concerns in backend, remove dead code, improve API consistency |
| **Risk** | Low |
| **Effort** | 1-2 days |
| **Dependencies** | #6 Zod Validation, #9 Configer Merge |
| **Unlocks** | Cleaner codebase, easier maintenance |
| **Status** | **Complete** |

## Current Issues

1. `src/fetch/fetchConfig.ts` is dead code - connects to old configer on port 3001 (merged in #9)
2. `unitsRoute.ts` uses legacy manual type guard wrappers instead of Zod middleware
3. API response format is inconsistent - some routes use `{ msg, data }`, some use `{ success, error }`, some mix both
4. `fetchFromUnits.ts` is a large monolithic file mixing different concerns
5. `modules/` directory contains initialization logic that could be cleaner

## Tasks

### 10.1 Remove Dead Code: fetchConfig.ts

- [x] Delete `src/fetch/fetchConfig.ts` (old HTTP config fetcher, replaced by direct db loading)
- [x] Verify no remaining imports reference it

### 10.2 Replace Manual Type Guards with Zod Middleware in Routes

Update `unitsRoute.ts` to use the `validate` middleware instead of `isInstanceOfPostUnitSettingsRequestBody`:

- [x] Update `PUT /units/settings` to use `validate(PostUnitSettingsRequestBodySchema)` middleware
- [x] Update `GET /units/settings` to use Zod `safeParse` or validate middleware

### 10.3 Standardize API Response Format

Establish a consistent response format:
- Success: `{ success: true, data: T }`
- Error: `{ success: false, error: string, details?: unknown }`

- [x] Create helper functions for building consistent responses
- [x] Update `configRoute.ts` (already mostly consistent)
- [x] Update `engineRoute.ts` to use standardized format
- [x] Update `thermalRoute.ts` to use standardized format
- [x] Update `unitsRoute.ts` to use standardized format

### 10.4 Type Safety Improvements

- [x] Remove `as unknown` casts where Zod safeParse can be used
- [x] Fix `query` parameter handling in fetch functions to use proper types

### 10.5 Verification

- [x] TypeScript compiles without errors (`bun run typecheck`)
- [x] All tests pass (`bun run test`)
- [x] Manual API testing confirms routes work correctly

## Files Changed

| Action | Files |
|--------|-------|
| Delete | `src/fetch/fetchConfig.ts` |
| Update | `src/routes/unitsRoute.ts` |
| Update | `src/routes/engineRoute.ts` |
| Update | `src/routes/thermalRoute.ts` |
| Create | `src/utils/response.ts` |

## Rollback

All changes are additive or cleanup:
- Restore `fetchConfig.ts` from git history if needed
- Revert route changes

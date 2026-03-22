# Babybox Standards & Quality Improvements

This document tracks the progress of standardizing the Babybox codebase to modern best practices.

## Current Issues (as of 2026-03-22)

After successful modernization to Bun/Turborepo/ESM, several quality issues remain:

| Issue                              | Impact                                        | Effort | Risk   |
| ---------------------------------- | --------------------------------------------- | ------ | ------ |
| `main.json` tracked in git         | Env conflicts, merge fights                   | 0.5h   | Low    |
| `.js` extensions in imports        | Confusing, not needed with bundler resolution | 2h     | Medium |
| TypeScript not strict enough       | Type safety gaps, silent bugs                 | 1h     | Low    |
| camelCase file names               | Inconsistent with modern conventions          | 3h     | Medium |
| .js files in non-legacy apps       | Should be pure TypeScript                     | 1h     | Low    |
| Dependencies not centrally managed | Hard to track versions, inconsistency         | 1.5h   | Low    |
| No CI pipeline                     | Code quality drift, untested deploys          | 2h     | Low    |
| Inconsistent tooling               | Complex setup, harder to maintain             | 2h     | Low    |

## Project Status

| #   | Project                                                                    | Status      | Dependencies | Notes                                     |
| --- | -------------------------------------------------------------------------- | ----------- | ------------ | ----------------------------------------- |
| 0   | [Untrack main.json](./standards/00-untrack-main-json.md)                   | **Done**    | None         | Remove env config from git                |
| 1   | [TypeScript Config & Strict Settings](./standards/01-typescript-config.md) | **Done**    | None         | bundler resolution, strict TS, remove .js |
| 2   | [File Renaming](./standards/02-file-renaming.md)                           | **Pending** | #1           | camelCase → kebab-case                    |
| 3   | [Tooling Standardization](./standards/03-tooling-standardization.md)       | **Done**    | None         | oxlint + oxfmt everywhere                 |
| 4   | [CI Setup](./standards/04-ci-setup.md)                                     | **Pending** | #3           | GitHub Actions pipeline                   |
| 5   | [Dependency Updates](./standards/05-dependency-updates.md)                 | **Pending** | #1, #3, #6   | Align versions, remove unused             |
| 6   | [Bun Catalog Setup](./standards/06-bun-catalog.md)                         | **Deferred** | None         | Centralize deps, hardcode versions        |
| 7   | [JavaScript to TypeScript](./standards/07-javascript-to-typescript.md)     | **Pending** | #1           | Convert all .js to .ts (non-legacy)       |

### Status Legend

- **Not Started** - Work has not begun
- **In Progress** - Currently being worked on
- **Blocked** - Waiting on dependency
- **Complete** - Finished and merged
- **Deferred** - Postponed for later

## Execution Strategy

**Recommended order** (balances risk and dependencies):

1. Projects 0, 1, 3, 6 can run **in parallel** (no blockers)
   - 0: untrack main.json (0.5h)
   - 1: TS config + strict settings (2h)
   - 3: tooling standardization (2h)
   - 6: bun catalog (1.5h)
2. Project 7 waits for 1 (JS→TS, after import cleanup)
3. Project 2 waits for 1 + 7 (file renaming, after TS/JS conversion)
4. Project 4 waits for 3 (needs lint/format scripts)
5. Project 5 waits for 1, 3, 6 (integrate with catalog)

Estimated total effort: **15.5 hours** (parallelizable to ~5-6 hours).

## Quick Reference

### Branch

All work happens on: `feat/modernization` (or create new branch from main)

### Key Principles

- **No breaking changes**: All work must be backwards-compatible with deployment flow
- **Verify frequently**: Run tests after each major step
- **Update imports**: Whenever files are renamed or imports change

### Testing Checklist

Before merging any project:

1. ✅ `bun run typecheck` passes in all apps
2. ✅ `bun run lint` passes in all apps
3. ✅ `bun run format:check` passes (if implemented)
4. ✅ `bun run test` passes in all apps
5. ✅ `bun run build` succeeds in all apps
6. ✅ Manual test: `bun run dev` starts all services

## Changelog

| Date       | Project | Change                                                                |
| ---------- | ------- | --------------------------------------------------------------------- |
| 2026-03-22 | —       | Plan expanded - 8 projects total; added Bun catalog, strict TS, JS→TS |
| 2026-03-21 | —       | Plan created - 6 projects identified                                  |

## Notes

- Each project file contains a detailed breakdown and verification steps
- Projects are designed to be independent and parallelizable where possible
- The file naming standardization (project 2) is the largest effort after conversions
- CI setup requires root-level turbo scripts to be in place (from project 3)
- Bun catalog (project 6) should be done before dependency updates (project 5)
- JS→TS conversion (project 7) is quick if minimal .js files exist
- After all projects complete, the codebase will be at modern standards:
  - ✅ Strictly typed TypeScript (all strict settings)
  - ✅ Pure ESM (no CJS, all .ts files)
  - ✅ Centralized dependency management (Bun catalog)
  - ✅ Kebab-case file naming
  - ✅ Modern tooling (oxlint, oxfmt)
  - ✅ Automated CI/CD quality gates
  - ✅ No environment config in git
  - ✅ Clean imports without .js extensions

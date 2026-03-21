# Babybox Modernization Tracker

This document tracks the progress of modernizing the Babybox monitoring system.

## Current State (Starting Point - 2022 Era)

| Aspect | Current | Target |
|--------|---------|--------|
| Runtime | Node.js 18.12.1 | Bun |
| Package Manager | pnpm 7.5.0 | Bun |
| Monorepo Tool | pnpm workspaces | Turborepo |
| Module System | Mixed (CJS + ESM) | ESM only |
| Language | Mixed (JS + TS) | TypeScript only |
| TypeScript | 4.7.4 | 5.x |
| Services | 4 apps | 3 apps (merge configer) |
| Validation | Manual type guards | Zod schemas |
| Testing | Minimal (3 test files) | Comprehensive |

## Project Status

Projects are ordered by recommended execution sequence. Earlier projects unlock or simplify later ones.

| # | Project | Status | Dependencies | Notes |
|---|---------|--------|--------------|-------|
| 0 | [Local Dev Setup](./modernization/00-local-dev-setup.md) | **Complete** | None | Build & dev mode working |
| 1 | [Cleanup & Dead Code](./modernization/01-cleanup.md) | **Complete** | None | Dead code removed, bugs fixed |
| 2 | [TypeScript Completion](./modernization/02-typescript-completion.md) | **Complete** | None | Better tooling, catches bugs |
| 3 | [ESM Migration](./modernization/03-esm-migration.md) | **Complete** | #2 recommended | Required for Bun |
| 4 | [Testing Foundation](./modernization/04-testing-foundation.md) | **Complete** | #1, #2, #3 | Safety net for future changes |
| 5 | [Dependency Updates](./modernization/05-dependency-updates.md) | **Complete** | #3, #4 recommended | Modern tooling |
| 6 | [Zod Validation](./modernization/06-zod-validation.md) | **Complete** | #2, #5 | Runtime type safety |
| 7 | [Bun Migration](./modernization/07-bun-migration.md) | **Complete** | #3, #5 | New runtime |
| 8 | [Turborepo Integration](./modernization/08-turborepo.md) | Not Started | #7 | Better DX |
| 9 | [Configer Merge](./modernization/09-configer-merge.md) | Not Started | #3 | Simplify architecture |
| 10 | [Backend Logic Migration](./modernization/10-backend-logic.md) | Not Started | #6, #9 | Better separation |
| 11 | [Automation & Monitoring](./modernization/11-automation.md) | Not Started | #10 | Reduce maintenance |

### Status Legend
- **Not Started** - Work has not begun
- **In Progress** - Currently being worked on
- **Blocked** - Waiting on dependency
- **Complete** - Finished and deployed
- **Deferred** - Postponed for later

## Quick Reference

### Branch
All work happens on: `migration/modernization-2026`

### Auto-Update Compatibility
All changes MUST work with the existing startup app update flow:
1. `git pull` - pulls changes
2. `pnpm run build` (later `bun run build`) - builds all apps  
3. Override phase - copies to production `dist/`
4. PM2 restart - restarts services

### Testing
Before merging any project:
1. Build succeeds locally
2. Tests pass (once we have them)
3. Manual test on staging babybox
4. Deploy to single hospital, monitor for issues
5. Roll out to remaining hospitals

### Production Environment
- **OS**: Ubuntu with GNOME
- **Runtime**: Node.js 18.12.1 (via `n`)
- **User**: `babybox`
- **Path**: `/home/babybox/babybox/`
- **Remote**: TeamViewer
- **Auto-start**: `~/.config/autostart/babybox.desktop`

## Development Ports

| Service | Port | URL |
|---------|------|-----|
| Backend | 3000 | http://localhost:3000/api/v1 |
| Configer | 3001 | http://localhost:3001/api/v1 |
| Panel | 3002 | http://localhost:3002 |

## Changelog

| Date | Project | Change |
|------|---------|--------|
| 2026-03-21 | #7 | Bun migration complete - updated dev/build scripts for backend, configer, panel; root package.json uses bun workspaces |
| 2026-03-15 | #6 | Zod validation complete - config schemas, request schemas, validation middleware, replaced manual type guards |
| 2026-03-15 | #5 | Dependency updates complete - TypeScript 5, Vite 5, axios 1.x, open 10.x, prettier 3, vitest 2 |
| 2026-03-15 | #4 | Testing foundation complete - added 69 panel tests, 30 configer tests, unified test setup across apps |
| 2026-03-15 | #4 | Testing foundation - migrated backend from Jest to Vitest, all 33 tests passing |
| 2026-03-15 | #3 | ESM migration - migrated backend and startup to ESM with NodeNext module resolution |
| 2026-03-15 | #2 | TypeScript completion - migrated startup app from JS to TS |
| 2026-03-15 | #1 | Cleanup complete - removed dead code, fixed bugs, migrated ConnectionTracker |
| 2026-03-14 | #0 | Local dev setup complete - fixed ports to 3xxx |
| 2026-03-13 | - | Initial plan created |

## Notes

- Each project file starts with a reference back to this document
- Projects can be worked on in parallel if they have no dependencies
- The order is a recommendation based on risk/reward analysis
- Camera types supported: dahua, avtech, vivotek, hikvision

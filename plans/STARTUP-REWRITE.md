# Startup Application Rewrite Tracker

This document tracks the progress of rewriting the startup application from scratch with modern architecture and best practices.

## Current State vs Target

| Aspect | Current | Target |
|--------|---------|--------|
| Language | JavaScript (CommonJS) | Strict TypeScript (ESM) |
| Runtime | Node.js | Bun |
| Architecture | Flat scripts | Layered (Domain/Application/Infrastructure) |
| Error Handling | try/catch with throws | Result types (neverthrow) |
| Type Safety | None | Strict + branded types + sum types |
| Validation | None | Zod schemas |
| Logging | Winston (unstructured) | Type-safe structured logs (Czech messages) |
| OS Support | Windows/Ubuntu (duplicated) | Windows/Ubuntu/Mac via adapters |
| Distribution | JS source | Compiled binary |
| Tooling | ESLint + Prettier | oxlint + oxfmt + ts-go |

## Design Principles

1. **Never throw** - All functions return `Result<T, E>` types
2. **No classes in domain** - Pure functions operating on immutable data
3. **No `any`** - Strictly prohibited throughout codebase
4. **No `as` casts** - Unless documented with safety explanation
5. **Branded types** - For nominal typing of paths, URLs, etc.
6. **Sum types** - Discriminated unions for all variant data
7. **Czech user messages** - All user-facing strings in Czech
8. **English code** - All identifiers, comments, enums in English

## Project Status

| # | Project | Status | Dependencies | Effort |
|---|---------|--------|--------------|--------|
| 0 | [Project Setup](./startup-rewrite/00-project-setup.md) | **Complete** | None | 1 day |
| 1 | [Domain Types](./startup-rewrite/01-domain-types.md) | **Complete** | #0 | 2 days |
| 2 | [Logging System](./startup-rewrite/02-logging-system.md) | **Complete** | #1 | 1 day |
| 3 | [Infrastructure Layer](./startup-rewrite/03-infrastructure.md) | **Complete** | #1, #2 | 2 days |
| 4 | [Domain Logic](./startup-rewrite/04-domain-logic.md) | **Complete** | #1, #2 | 2 days |
| 5 | [Application Layer](./startup-rewrite/05-application-layer.md) | **Complete** | #3, #4 | 2 days |
| 6 | [CLI Presentation](./startup-rewrite/06-presentation.md) | **Complete** | #5 | 1 day |
| 7 | [Build & Distribution](./startup-rewrite/07-build-distribution.md) | Not Started | #6 | 1 day |
| 8 | [Testing & Verification](./startup-rewrite/08-testing.md) | Not Started | #7 | 2 days |
| 9 | [Migration & Deployment](./startup-rewrite/09-migration.md) | Not Started | #8 | 1 day |

**Total estimated effort: 15 days**

### Status Legend
- **Not Started** - Work has not begun
- **In Progress** - Currently being worked on
- **Blocked** - Waiting on dependency
- **Complete** - Finished and verified
- **Deferred** - Postponed for later

## Architecture Overview

```
+-------------------------------------------------------------------+
|                      Presentation Layer                           |
|  +-------------------------------------------------------------+  |
|  |  CLI Entry Point (cli.ts)                                   |  |
|  |  - Parses arguments                                         |  |
|  |  - Creates context with dependencies                        |  |
|  |  - Invokes application orchestrator                         |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------------+
|                      Application Layer                            |
|  +-------------------------------------------------------------+  |
|  |  Orchestrator                                               |  |
|  |  - startup()      - Coordinates update/build/launch         |  |
|  |  - install()      - Coordinates first-time setup            |  |
|  +-------------------------------------------------------------+  |
|  +-------------------------------------------------------------+  |
|  |  Ports (Interfaces)                                         |  |
|  |  - GitPort        - FileSystemPort   - ProcessPort          |  |
|  |  - LoggerPort     - ConfigPort       - PackageManagerPort   |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
                               |
               +---------------+---------------+
               v                               v
+-------------------------------+ +-----------------------------+
|       Domain Layer            | |   Infrastructure Layer      |
|  +-------------------------+  | |  +------------------------+ |
|  | Types & Data            |  | |  | Adapters (per OS)      | |
|  | - UpdateResult          |  | |  | - UbuntuGitAdapter     | |
|  | - BuildResult           |  | |  | - WindowsGitAdapter    | |
|  | - RollbackState         |  | |  | - MacGitAdapter        | |
|  | - LogEntry              |  | |  | - UbuntuFsAdapter      | |
|  | - Suggestion            |  | |  | - UbuntuProcessAdapter | |
|  +-------------------------+  | |  | - ...                  | |
|  +-------------------------+  | |  +------------------------+ |
|  | Pure Functions          |  | |  +------------------------+ |
|  | - determineStrategy()   |  | |  | External Wrappers      | |
|  | - shouldRetry()         |  | |  | - BunShell             | |
|  | - createSuggestion()    |  | |  | - FsWrapper            | |
|  | - parseGitOutput()      |  | |  | - PM2Wrapper           | |
|  +-------------------------+  | |  +------------------------+ |
+-------------------------------+ +-----------------------------+
```

## Dependency Injection

All dependencies passed via context object:

```typescript
type AppContext = {
  readonly config: StartupConfig;
  readonly logger: LoggerPort;
  readonly git: GitPort;
  readonly fs: FileSystemPort;
  readonly process: ProcessPort;
  readonly packageManager: PackageManagerPort;
};

// Usage - context passed as first parameter to all functions
const result = await startup(context);
```

## Application Flow

### Startup Flow (Happy Path)

```
1. Parse CLI arguments
2. Detect OS and create appropriate adapters
3. Create context with all dependencies
4. Run startup orchestrator:
   a. Git pull (update)
      - If conflicts: stash local changes, pull again
      - If network error: continue with existing code
   b. If updated OR no dist exists:
      - Install dependencies (bun install)
      - Build project (bun run build)
      - If build fails: rollback to previous dist
   c. Override dist:
      - Backup current dist -> dist-backup
      - Copy new build -> dist
      - If fails: restore from dist-backup
   d. Start services via PM2
      - If fails: retry up to 5 times
5. Log result and exit
```

### Rollback Strategy

```
dist/           <- Current production (running)
dist-backup/    <- Previous version (for rollback)
source/         <- Git repository with latest code

On update failure:
1. Keep dist/ unchanged
2. Log error with suggestions
3. Start services from existing dist/

On build failure:
1. dist-backup/ remains valid
2. Restore dist/ from dist-backup/ if corrupted
3. Start services from restored dist/

On override failure:
1. Delete partial dist/
2. Rename dist-backup/ -> dist/
3. Start services from restored dist/
```

## Quick Reference

### Key Commands

```bash
# Development
bun run dev              # Run with watch mode
bun run check            # Type check + lint + format check
bun run test             # Run tests

# Build
bun run build            # Compile to binaries for all platforms

# Production
./startup --ubuntu       # Run on Ubuntu
./startup --windows      # Run on Windows
./startup --install      # First-time installation
```

### Directory Structure

```
source/apps/startup-v2/
├── src/
│   ├── domain/
│   │   ├── types/           # All type definitions
│   │   │   ├── branded.ts   # Branded types (AbsolutePath, etc.)
│   │   │   ├── results.ts   # Result sum types
│   │   │   ├── logging.ts   # Log entry types
│   │   │   ├── suggestion.ts # Suggestion sum types
│   │   │   ├── git.ts       # Git-related types
│   │   │   ├── build.ts     # Build-related types
│   │   │   ├── os.ts        # OS detection types
│   │   │   └── config.ts    # Configuration types
│   │   └── functions/       # Pure domain functions
│   │       ├── strategy.ts  # Decision logic
│   │       ├── git.ts       # Git output parsing
│   │       ├── suggestion.ts # Suggestion creation
│   │       └── retry.ts     # Retry logic
│   ├── application/
│   │   ├── ports/           # Port interfaces
│   │   │   ├── git.port.ts
│   │   │   ├── fs.port.ts
│   │   │   ├── process.port.ts
│   │   │   ├── logger.port.ts
│   │   │   └── package-manager.port.ts
│   │   ├── orchestrator.ts  # Main orchestration logic
│   │   └── context.ts       # Context type definition
│   ├── infrastructure/
│   │   ├── adapters/        # OS-specific implementations
│   │   │   ├── ubuntu/
│   │   │   │   ├── git.adapter.ts
│   │   │   │   ├── fs.adapter.ts
│   │   │   │   └── process.adapter.ts
│   │   │   ├── windows/
│   │   │   │   ├── git.adapter.ts
│   │   │   │   ├── fs.adapter.ts
│   │   │   │   └── process.adapter.ts
│   │   │   └── mac/
│   │   │       └── ... (if simple enough)
│   │   ├── wrappers/        # External API wrappers (never throw)
│   │   │   ├── shell.ts     # Bun.spawn wrapper
│   │   │   ├── fs.ts        # Node fs wrapper
│   │   │   └── pm2.ts       # PM2 wrapper
│   │   └── logging/         # Logger implementation
│   │       ├── console.ts   # Console output
│   │       └── file.ts      # File persistence
│   └── presentation/
│       ├── cli.ts           # CLI entry point
│       └── messages.ts      # Czech message strings
├── scripts/                 # Shell scripts for OS autostart
│   ├── ubuntu/
│   │   └── startup.sh
│   └── windows/
│       └── startup.bat
├── bunfig.toml
├── tsconfig.json
├── oxlint.json
└── package.json
```

## Prohibited Patterns

### Strictly Forbidden

```typescript
// FORBIDDEN: any
function bad(x: any) { }           // NO!
const y: any = something;          // NO!

// FORBIDDEN: as any
const z = something as any;        // NO!

// FORBIDDEN: as Type (without justification)
const a = something as SomeType;   // NO! (unless documented)

// FORBIDDEN: throwing errors
throw new Error("something");      // NO!
if (bad) throw new Error();        // NO!

// FORBIDDEN: classes in domain layer
class DomainEntity { }             // NO!
```

### Required Patterns

```typescript
// REQUIRED: Result types for all fallible operations
function goodOperation(): Result<Data, OperationError> { }

// REQUIRED: as Type with justification comment
// SAFETY: We verified via zod schema that this is a ValidConfig
const config = parsed.data as ValidConfig;

// REQUIRED: Pure functions in domain
function determineStrategy(state: AppState): UpdateStrategy { }

// REQUIRED: Branded types for special strings
type AbsolutePath = string & { readonly __brand: "AbsolutePath" };
```

## Changelog

| Date | Project | Change |
|------|---------|--------|
| 2026-03-15 | #6 | CLI presentation complete - OS detection, adapters factory, config loader, CLI entry point |
| 2026-03-15 | #5 | Application layer complete - context, orchestrators (startup, update, build, override, process) |
| 2026-03-15 | #4 | Domain logic complete - strategy, retry, suggestion, git parsing functions |
| 2026-03-15 | #3 | Infrastructure layer complete - shell, fs, pm2 wrappers, ports, git adapter |
| 2026-03-15 | #2 | Logging system complete - console, file, combined loggers with Czech messages |
| 2026-03-15 | #1 | Domain types complete - branded types, sum types, Zod schemas, logging types |
| 2026-03-15 | #0 | Project setup complete - created startup-v2 with Bun, TypeScript, oxlint, Biome |
| 2026-03-14 | - | Initial plan created |

## Notes

- The new startup app will live in `source/apps/startup-v2/` during development
- Once verified, it will replace `source/apps/startup/`
- Compiled binaries will be committed to the repo for easy deployment
- The app must be able to update itself (chicken-and-egg solved by compiled binary)

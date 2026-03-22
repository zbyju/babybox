# Babybox Startup v2

Deployment and process management utility for babybox systems. Compiled to a standalone Bun binary — handles auto-updating the repository, building apps, and starting services via PM2.

## What It Does

1. **Update** — pulls latest changes from git (handles merge conflicts, branch strategy)
2. **Build** — installs dependencies and builds all apps
3. **Override** — applies environment-specific config overrides
4. **Process Start** — launches the backend via PM2

Each phase has retry logic and produces structured suggestions if something fails.

## Tech Stack

- **Bun** — runtime, test runner, and binary compiler
- **TypeScript** (strict mode, ESNext)
- **Neverthrow** — type-safe error handling (`Result<T, E>`)
- **Zod** — config validation
- **Clean/Hexagonal Architecture** — ports & adapters pattern

## Build

Compiles to standalone binaries for each target platform:

```bash
bun run build:ubuntu      # dist/startup-ubuntu (Linux x64)
bun run build:windows     # dist/startup-windows.exe (Windows x64)
bun run build:mac         # dist/startup-mac (macOS ARM64)
bun run build:mac-intel   # dist/startup-mac-intel (macOS x64)
bun run build:all         # All platforms
```

## Usage

```bash
# Run directly (development)
bun run dev:ubuntu
bun run dev:windows
bun run dev:mac

# Run compiled binary
./dist/startup-ubuntu --ubuntu
./dist/startup-windows.exe --windows
./dist/startup-mac --mac
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `BABYBOX_REPO_PATH` | Path to the babybox repository |
| `BABYBOX_LOG_LEVEL` | Log verbosity (`debug`, `info`, `warn`, `error`) |
| `BABYBOX_MAX_RETRIES` | Max retry attempts for failed operations |

## Development

```bash
bun dev              # Watch mode (default OS)
bun run test         # Run tests
bun run test:watch   # Watch mode tests
bun run test:coverage # Coverage report
bun run typecheck    # Type-check
bun run lint         # Lint with oxlint
bun run format       # Format with oxfmt
bun run check        # Run typecheck + lint + format:check
```

## Architecture

Follows hexagonal (ports & adapters) architecture:

```
src/
├── domain/                 # Pure business logic, no external dependencies
│   ├── types/              # Domain types (branded types, results, config, OS, etc.)
│   └── functions/          # Pure functions (git strategy, retry logic, suggestions)
│
├── application/            # Use cases and orchestration
│   ├── orchestrators/      # Workflow implementations (startup, update, build, process)
│   ├── ports/              # Interface definitions (contracts for adapters)
│   └── context.ts          # Application context (injected dependencies)
│
├── infrastructure/         # External world implementations
│   ├── adapters/           # OS-specific implementations
│   │   ├── mac/            # macOS adapters (fs, git, process, package-manager)
│   │   ├── ubuntu/         # Ubuntu adapters
│   │   └── windows/        # Windows adapters
│   ├── wrappers/           # Low-level shell, fs, and PM2 wrappers
│   └── logging/            # Logger implementations (console, file, combined)
│
└── presentation/           # CLI entry point and configuration
    ├── cli.ts              # Main CLI (parses args, wires dependencies, runs startup)
    ├── adapter-factory.ts  # Creates OS-specific adapter set
    ├── config-loader.ts    # Loads and validates config
    ├── os-detection.ts     # OS detection from CLI flags
    └── messages.ts         # CLI output messages
```

### Key Design Decisions

- **Neverthrow Results** — all operations return `Result<T, E>` instead of throwing, making error paths explicit
- **Branded types** — `DirectoryPath`, `ShellCommand`, `ProcessName` etc. prevent mixing up string values at compile time
- **OS adapters** — each supported OS has its own adapter implementations, selected at runtime based on CLI flags
- **Suggestions** — when operations fail, the system generates human-readable suggestions for troubleshooting

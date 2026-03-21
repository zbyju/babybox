# Project 0: Project Setup

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Set up the project structure with strict TypeScript, Bun, and tooling |
| **Risk** | Low |
| **Effort** | 1 day |
| **Dependencies** | None |
| **Unlocks** | All subsequent development |

## Tasks

### 0.1 Create Project Directory

```bash
mkdir -p source/apps/startup-v2/src/{domain/{types,functions},application/ports,infrastructure/{adapters/{ubuntu,windows,mac},wrappers,logging},presentation}
mkdir -p source/apps/startup-v2/scripts/{ubuntu,windows}
```

### 0.2 Initialize Bun Project

```bash
cd source/apps/startup-v2
bun init
```

#### package.json

```json
{
  "name": "babybox-startup",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/presentation/cli.ts",
    "dev:ubuntu": "bun --watch src/presentation/cli.ts -- --ubuntu",
    "dev:windows": "bun --watch src/presentation/cli.ts -- --windows",
    "build": "bun run build:ubuntu && bun run build:windows && bun run build:mac",
    "build:ubuntu": "bun build src/presentation/cli.ts --compile --outfile dist/startup-ubuntu --target bun-linux-x64",
    "build:windows": "bun build src/presentation/cli.ts --compile --outfile dist/startup-windows.exe --target bun-windows-x64",
    "build:mac": "bun build src/presentation/cli.ts --compile --outfile dist/startup-mac --target bun-darwin-arm64",
    "check": "bun run typecheck && bun run lint && bun run format:check",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint .",
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check .",
    "test": "bun test"
  },
  "dependencies": {
    "neverthrow": "^7.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.4.0"
  }
}
```

### 0.3 TypeScript Configuration

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "lib": ["ESNext"],
    "outDir": "./dist",
    "rootDir": "./src",
    
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    
    "paths": {
      "@domain/*": ["./src/domain/*"],
      "@application/*": ["./src/application/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@presentation/*": ["./src/presentation/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 0.4 Oxlint Configuration

#### oxlint.json

```json
{
  "rules": {
    "no-explicit-any": "error",
    "no-unsafe-argument": "error",
    "no-unsafe-assignment": "error",
    "no-unsafe-call": "error",
    "no-unsafe-member-access": "error",
    "no-unsafe-return": "error",
    "no-throw-literal": "error",
    "no-unused-vars": "error",
    "prefer-const": "error",
    "eqeqeq": "error"
  },
  "ignorePatterns": ["dist", "node_modules"]
}
```

### 0.5 Bunfig Configuration

#### bunfig.toml

```toml
[install]
auto = "auto"

[test]
coverage = true
coverageDir = "./coverage"
```

### 0.6 Create Entry Point Skeleton

#### src/presentation/cli.ts

```typescript
/**
 * Babybox Startup Application
 * 
 * Automatically updates and starts the babybox panel application.
 * Handles git pull, build, deployment, and service management.
 */

import { parseArgs } from "util";

function main(): void {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      ubuntu: { type: "boolean", default: false },
      windows: { type: "boolean", default: false },
      mac: { type: "boolean", default: false },
      install: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`
Babybox Startup v2.0.0

Pouziti:
  startup [--ubuntu|--windows|--mac] [--install]

Prepinace:
  --ubuntu     Spustit v Ubuntu rezimu
  --windows    Spustit ve Windows rezimu  
  --mac        Spustit v macOS rezimu
  --install    Provest prvotni instalaci
  --help, -h   Zobrazit tuto napovedu
`);
    process.exit(0);
  }

  // TODO: Implement in subsequent projects
  console.log("Startup aplikace - v priprave");
  console.log("Konfigurace:", values);
}

main();
```

### 0.7 Create .gitignore

#### .gitignore

```gitignore
# Dependencies
node_modules/

# Build outputs (except committed binaries)
dist/*.js
dist/*.map
coverage/

# Logs
*.log

# Environment
.env.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

### 0.8 Install Dependencies

```bash
cd source/apps/startup-v2
bun install
```

### 0.9 Install Global Tooling

```bash
# Install oxlint and oxfmt
bun add -g oxlint
# Note: oxfmt is part of oxc toolchain
cargo install oxc_formatter  # or via npm if available
```

**Alternative if oxfmt not available:**

Use Biome as fallback:
```bash
bun add -D @biomejs/biome
```

Update package.json scripts:
```json
{
  "scripts": {
    "format": "bunx biome format --write .",
    "format:check": "bunx biome format ."
  }
}
```

### 0.10 Verify Setup

```bash
cd source/apps/startup-v2

# Check TypeScript compiles
bun run typecheck

# Check linting works
bun run lint

# Run the skeleton
bun run dev -- --help
```

## Files Created

| File | Purpose |
|------|---------|
| `package.json` | Project manifest with scripts |
| `tsconfig.json` | Strict TypeScript configuration |
| `oxlint.json` | Linting rules (no any, no throw) |
| `bunfig.toml` | Bun configuration |
| `.gitignore` | Git ignore patterns |
| `src/presentation/cli.ts` | Entry point skeleton |

## Verification Checklist

- [x] `bun run typecheck` passes with no errors
- [x] `bun run lint` passes with no errors
- [x] `bun run dev -- --help` shows help message in Czech
- [x] Directory structure matches specification
- [x] All dependencies installed (`neverthrow`, `zod`)

## Notes

- The project uses path aliases (`@domain/*`, etc.) for clean imports
- `noUncheckedIndexedAccess` is enabled - be explicit about undefined checks
- `exactOptionalPropertyTypes` is enabled - be explicit about optional vs undefined
- If oxfmt is not available, Biome is an acceptable alternative

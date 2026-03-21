# Project 8: Turborepo Integration

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Add Turborepo for improved monorepo management |
| **Risk** | Low |
| **Effort** | 1-2 days |
| **Dependencies** | #7 Bun Migration (recommended) |
| **Unlocks** | Faster builds, better caching, improved DX |

## Why Turborepo?

Current setup with pnpm workspaces works but lacks:
- Build caching (rebuilds everything every time)
- Dependency-aware task execution
- Parallel execution with proper ordering
- Remote caching (optional, for teams)

Turborepo adds:
- Smart caching - skip unchanged packages
- Topological task execution - respects dependencies
- Parallel builds - faster CI/local builds
- Incremental builds - only rebuild what changed

## Tasks

### 8.1 Install Turborepo

```bash
cd source
bun add -D turbo
```

### 8.2 Create Configuration

Create `source/turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "inputs": ["src/**", "package.json", "tsconfig.json"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "**/*.test.ts"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### 8.3 Update Package Scripts

Update `source/package.json`:

```json
{
  "name": "babybox-mono",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### 8.4 Configure Per-Package Scripts

Each package needs consistent script names.

#### Backend `package.json`:
```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

#### Panel `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "test": "vitest run",
    "typecheck": "vue-tsc --noEmit",
    "lint": "eslint src"
  }
}
```

#### Configer `package.json`:
```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

#### Startup `package.json`:
```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "start": "bun dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

### 8.5 Add .gitignore Entries

Update `source/.gitignore`:
```gitignore
# Turborepo
.turbo
```

### 8.6 Define Package Dependencies (Optional)

Turborepo infers dependencies from `package.json`, but for explicit control, you can add internal dependencies:

```json
// apps/backend/package.json
{
  "dependencies": {
    "@babybox/shared": "workspace:*"
  }
}
```

If you create shared packages later.

## Build Flow

With Turborepo, `turbo build` will:

```
1. Analyze dependency graph
2. Check cache for each package
3. Build packages in parallel (respecting dependencies)
4. Cache outputs for future builds
```

Example output:
```
$ turbo build

• Packages in scope: babybox-panel, babybox-panel-backend, babybox-panel-configer, startup
• Running build in 4 packages
• Remote caching disabled

babybox-panel-configer:build: cache hit, replaying logs
babybox-panel-backend:build: cache hit, replaying logs  
startup:build: cache miss, executing
babybox-panel:build: cache miss, executing

 Tasks:    4 successful, 4 total
Cached:    2 cached, 4 total
  Time:    3.2s
```

## Development Workflow

### Start All Services
```bash
turbo dev
```

This starts all `dev` scripts in parallel with streaming output.

### Build Only Changed Packages
```bash
turbo build --filter=...[HEAD~1]
```

Only builds packages changed since last commit.

### Build Specific Package
```bash
turbo build --filter=babybox-panel-backend
```

### Watch Mode for Tests
```bash
turbo test --filter=babybox-panel-backend -- --watch
```

## Caching

### Local Cache
By default, Turborepo caches in `.turbo/` directory.

### Clear Cache
```bash
turbo clean
# or
rm -rf .turbo
```

### Remote Cache (Optional - For Teams)
If you want to share cache across machines:

```bash
# Login to Vercel (free tier available)
bunx turbo login

# Link to project
bunx turbo link
```

## Verification

```bash
# First build (cache miss)
cd source && turbo build
# Note the time

# Second build (cache hit)
turbo build  
# Should be nearly instant

# After changing a file
echo "// comment" >> apps/backend/src/index.ts
turbo build
# Only backend should rebuild
```

## Integration with Startup App

Update the startup app's build command:

```typescript
async function build(): Promise<ResultType> {
  try {
    // Use turbo instead of bun run build
    const { stderr, stdout } = await exec("bunx turbo build", "../../");
    
    if (stderr && stderr.includes("error")) {
      buildLogger.error(`Build failed: ${stderr}`);
      return Result.Error;
    }
    
    buildLogger.info(`Build successful: ${stdout}`);
    return Result.Success;
  } catch (err) {
    buildLogger.error(`Build error: ${err}`);
    return Result.Error;
  }
}
```

## File Changes Summary

| Action | File |
|--------|------|
| Create | `source/turbo.json` |
| Update | `source/package.json` - Add turbo scripts and dep |
| Update | `source/.gitignore` - Add .turbo |
| Update | Each app's `package.json` - Standardize scripts |
| Update | Startup build logic - Use turbo |

## Benefits After Completion

1. **Faster builds**: Cache hit = instant
2. **Incremental**: Only rebuild what changed
3. **Parallel**: Better resource utilization
4. **Consistent**: Same scripts across all packages
5. **Visible**: Clear output showing what ran

## Rollback

Turborepo is additive:
1. Remove `turbo.json`
2. Remove `turbo` from devDependencies
3. Update root scripts back to pnpm filter commands
4. Remove `.turbo` directory

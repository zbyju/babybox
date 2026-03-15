# Project 7: Bun Migration

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Replace Node.js with Bun runtime |
| **Risk** | High |
| **Effort** | 5-7 days |
| **Dependencies** | #3 ESM, #5 Dependency Updates |
| **Unlocks** | Faster runtime, native TypeScript, modern tooling |

## Why Bun?

| Feature | Node.js | Bun |
|---------|---------|-----|
| TypeScript | Requires compilation | Native support |
| Package manager | npm/pnpm | Built-in (faster) |
| .env loading | Requires dotenv | Automatic |
| Hot reload | Requires nodemon | Built-in `--watch` |
| Test runner | Requires Jest/Vitest | Built-in |
| Startup time | ~100ms | ~10ms |

## Tasks

### 7.1 Update Install Scripts

#### Update `installAll.sh`

Replace Node.js installation with Bun:

```bash
# Remove Node.js installation section
# ----- Install Node.js (dependency: n, npm)
# echo "          ----- INSTALLING NODE.JS -----"
# n 18.12.1

# Replace with Bun
echo "          ----- INSTALLING BUN -----"
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

Remove npm global packages that Bun replaces:
```bash
# No longer needed:
# npm install -g pnpm@9
# npm install -g nodemon
# npm install -g typescript@5
# npm install -g ts-node@10

# Only need:
npm install -g pm2@latest  # Still use PM2 for process management
```

#### Update startup install logic

`source/apps/startup/src/logic/install/ubuntu.ts`:
```typescript
async function installDeps(): Promise<void> {
  // Bun handles package management, TypeScript, etc.
  // Only install PM2 for process management
  const { stderr } = await exec("bun add -g pm2");
  if (stderr && !stderr.includes("warning")) {
    throw new Error(`Failed to install pm2: ${stderr}`);
  }
}

async function checkInstalled(logger: winston.Logger): Promise<boolean> {
  try {
    await exec("bun --version");
  } catch (err) {
    logger.error(`${getFulltimeFormatted()} - Failed: missing bun (${err})`);
    return false;
  }
  try {
    await exec("git --version");
  } catch (err) {
    logger.error(`${getFulltimeFormatted()} - Failed: missing git (${err})`);
    return false;
  }
  return true;
}
```

### 7.2 Backend Migration

#### Update `package.json`

```json
{
  "name": "babybox-panel-backend",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "start": "bun src/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "morgan": "^1.10.0",
    "open": "^10.1.0",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/morgan": "^1.9.9",
    "typescript": "^5.4.0"
  }
}
```

**Removed dependencies:**
- `dotenv` - Bun loads `.env` automatically
- `nodemon` - Use `bun --watch`
- `axios` - Consider using Bun's native `fetch`

#### Replace axios with fetch (Optional)

```typescript
// Before (axios):
import axios from "axios";
export async function fetchFromUrl(url: string, timeout = 5000) {
  return axios.get(url, { timeout });
}

// After (native fetch):
export async function fetchFromUrl(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.text();
    return { data, status: response.status };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

#### Update environment variable access

```typescript
// Before (with dotenv):
import dotenv from "dotenv";
dotenv.config();
const port = process.env.PORT;

// After (Bun auto-loads .env):
const port = process.env.PORT;
// or use Bun.env for typed access:
const port = Bun.env.PORT;
```

### 7.3 Panel Migration

Panel uses Vite, which works well with Bun.

#### Update `package.json`

```json
{
  "scripts": {
    "dev": "bunx --bun vite",
    "build": "bunx vue-tsc -b && bunx --bun vite build",
    "preview": "bunx --bun vite preview",
    "test": "bunx vitest",
    "typecheck": "bunx vue-tsc --noEmit"
  }
}
```

### 7.4 Configer Migration

Similar to backend.

#### Update `package.json`

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "start": "bun src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

### 7.5 Startup App Migration

This is the most complex due to child process handling.

#### Key Changes

1. **Replace child_process with Bun.spawn**

```typescript
// Before:
import { promisify } from "util";
import { exec as execCallback, spawn } from "child_process";
const exec = promisify(execCallback);

const { stdout, stderr } = await exec("git pull", { cwd: "../../" });

// After:
async function exec(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  const parts = command.split(" ");
  const proc = Bun.spawn(parts, { cwd });
  
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  
  return { stdout, stderr };
}

const { stdout, stderr } = await exec("git pull", "../../");
```

2. **Handle detached processes**

Bun doesn't have `detached: true` like Node. Options:

```typescript
// Option A: Use nohup wrapper
Bun.spawn(["nohup", "bun", "start:configer"], {
  cwd: "../../",
  stdio: ["ignore", "ignore", "ignore"],
});

// Option B: Use PM2 (recommended - already used)
Bun.spawn(["pm2", "start", "bun", "--name", "configer", "--", "src/index.ts"], {
  cwd: "../configer",
});
```

3. **Replace fs-extra with native fs**

```typescript
// Before:
import fs from "fs-extra";
fs.copySync(src, dest);
fs.rmSync(path, { recursive: true });
fs.existsSync(path);

// After:
import { copyFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { cp, rm } from "fs/promises";

// For recursive copy, use shell or manual implementation
await Bun.spawn(["cp", "-r", src, dest]).exited;
```

4. **Handle sudo-prompt**

`sudo-prompt` may not work with Bun. Alternative approaches:

```typescript
// Option A: Shell script wrapper
// Create scripts/ubuntu/create-autostart.sh:
#!/bin/bash
# Run with: sudo ./create-autostart.sh
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/babybox.desktop << EOF
[Desktop Entry]
Type=Application
Name=Babybox
Exec=/home/babybox/babybox/source/apps/startup/scripts/ubuntu/startup.sh
EOF

// Then in TypeScript, just tell user to run it with sudo
console.log("Run: sudo ./scripts/ubuntu/create-autostart.sh");

// Option B: Check if already has permissions
try {
  await Bun.spawn(["test", "-w", "/path/to/check"]).exited;
  // Has permissions, proceed
} catch {
  console.log("Please run with sudo for initial setup");
}
```

### 7.6 Root Package Scripts

Update `source/package.json`:

```json
{
  "name": "babybox-mono",
  "scripts": {
    "dev": "bun run --filter babybox-panel-configer dev & bun run --filter babybox-panel dev & bun run --filter babybox-panel-backend dev",
    "dev:backend": "bun run --filter babybox-panel-backend dev",
    "dev:panel": "bun run --filter babybox-panel dev", 
    "dev:configer": "bun run --filter babybox-panel-configer dev",
    "build": "bun install && bun run --filter '*' build",
    "test": "bun run --filter '*' test",
    "typecheck": "bun run --filter '*' typecheck"
  }
}
```

### 7.7 PM2 Integration

PM2 works with Bun. Update how services are started:

```javascript
// PM2 ecosystem file (optional)
// source/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "babybox",
      script: "bun",
      args: "src/index.ts",
      cwd: "./apps/backend",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "configer",
      script: "bun", 
      args: "src/index.ts",
      cwd: "./apps/configer",
    },
  ],
};
```

Or continue using CLI:
```bash
pm2 start bun --name babybox -- src/index.ts
pm2 start bun --name configer -- src/index.ts
```

### 7.8 Update Startup Scripts

`scripts/ubuntu/startup.sh`:
```bash
#!/bin/bash
cd /home/babybox/babybox/source/apps/startup
bun src/index.ts
```

### 7.9 Update Build Process in Startup App

The startup app runs `pnpm run build`. Update to use Bun:

```typescript
async function build(): Promise<ResultType> {
  try {
    const { stderr, stdout } = await exec("bun run build", "../../");
    // Bun outputs some info to stderr that isn't errors
    if (stderr && stderr.includes("error")) {
      buildLogger.error(`Build failed: ${stderr}`);
      return Result.Error;
    }
    buildLogger.info(`Build successful!`);
    return Result.Success;
  } catch (err) {
    buildLogger.error(`Build error: ${err}`);
    return Result.Error;
  }
}
```

## Migration Order

1. **Backend first** - Most isolated, easy to test
2. **Configer second** - Similar to backend
3. **Panel third** - Vite handles most complexity
4. **Startup last** - Most complex, manages others

## Verification

### Per-App Testing

```bash
# Backend
cd source/apps/backend
bun src/index.ts
curl http://localhost:5000/api/v1/status

# Configer
cd source/apps/configer  
bun src/index.ts
curl http://localhost:5001/api/v1/status

# Panel
cd source/apps/panel
bunx --bun vite
# Open http://localhost:4000

# Startup
cd source/apps/startup
bun src/index.ts
```

### Full System Test

```bash
cd source
bun run dev

# Verify:
# - Panel loads at :4000
# - Backend responds at :5000
# - Configer responds at :5001
# - Data from hardware units appears
# - Camera feed works
```

### Production Simulation

```bash
# Build
cd source && bun run build

# Start via PM2 (like production)
pm2 start bun --name configer -- apps/configer/src/index.ts
pm2 start bun --name babybox -- apps/backend/src/index.ts

# Check status
pm2 status
pm2 logs
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| sudo-prompt incompatibility | Use shell script wrapper, document manual steps |
| Detached process issues | Rely on PM2 for process management |
| Express compatibility | Express works with Bun, well tested |
| Winston compatibility | Works with Bun |
| Vite compatibility | Vite works with Bun |

## Rollback

If Bun migration fails:
1. Revert `package.json` scripts to use `node`/`pnpm`
2. Restore `dotenv` dependency
3. Restore `nodemon` for dev
4. Update install scripts back to Node.js
5. The source code doesn't change (ESM works with both)

## Production Deployment

1. Update `installAll.sh` on staging machine
2. Run installation
3. Verify services start
4. Monitor for 24-48 hours
5. Roll out to other machines

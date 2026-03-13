# Project 2: TypeScript Completion

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Convert all JavaScript files to TypeScript |
| **Risk** | Low |
| **Effort** | 1-2 days |
| **Dependencies** | None (but #1 Cleanup recommended first) |
| **Unlocks** | Better IDE support, catch bugs early, required for strict typing |

## Why Early?

- TypeScript catches bugs at compile time
- Better IDE autocomplete and refactoring support
- Makes subsequent migrations safer (type errors caught immediately)
- Only one app (startup) needs conversion

## Current State

| App | Language | Status |
|-----|----------|--------|
| Panel | TypeScript | Complete |
| Backend | TypeScript | Complete |
| Configer | TypeScript | Complete |
| Startup | JavaScript | **Needs conversion** |

## Tasks

### 2.1 Add TypeScript Configuration to Startup

Create `source/apps/startup/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Note: Using CommonJS for now; ESM migration is Project #3.

### 2.2 Add Type Dependencies

Update `source/apps/startup/package.json`:
```json
{
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/fs-extra": "^11.0.0",
    "typescript": "^5.0.0"
  }
}
```

Note: `winston` and `moment` include their own type definitions.

### 2.3 Create Shared Type Definitions

Create `source/apps/startup/src/types/results.ts`:
```typescript
export const Result = {
  Error: "ResultError",
  Success: "ResultSuccess",
} as const;

export type ResultType = (typeof Result)[keyof typeof Result];

export const UpdateResult = {
  Error: "UpdateError",
  Updated: "UpdateSuccess",
  Unchanged: "UpdateUnchanged",
} as const;

export type UpdateResultType = (typeof UpdateResult)[keyof typeof UpdateResult];
```

### 2.4 Convert Files

#### `src/utils/time.js` → `src/utils/time.ts`

```typescript
// Before:
const moment = require("moment");

module.exports = {
  getFulltimeFormatted: () => {
    return moment().format("DD.MM.YYYY HH:mm:ss");
  },
};

// After:
import moment from "moment";

export function getFulltimeFormatted(): string {
  return moment().format("DD.MM.YYYY HH:mm:ss");
}
```

#### `src/index.js` → `src/index.ts`

```typescript
// Before:
const onStartup = require("./logic/start/ubuntu");
const install = require("./logic/install/ubuntu");
const args = process.argv;
// ...

// After:
import onStartup from "./logic/start/ubuntu";
import install from "./logic/install/ubuntu";

const args: string[] = process.argv;

async function main(): Promise<void> {
  if (args.includes("--install")) {
    await install();
  } else {
    const success = await onStartup();
    if (!success) {
      process.exit(1);
    }
  }
}

main();
```

#### `src/logic/start/ubuntu.js` → `src/logic/start/ubuntu.ts`

Key changes:
```typescript
import { promisify } from "util";
import { exec as execCallback, spawn, ChildProcess } from "child_process";
import fs from "fs-extra";
import winston from "winston";
import { getFulltimeFormatted } from "../../utils/time";
import { Result, ResultType, UpdateResult, UpdateResultType } from "../../types/results";

const exec = promisify(execCallback);

interface ExecResult {
  stdout: string;
  stderr: string;
}

async function update(): Promise<UpdateResultType> {
  try {
    const { stdout, stderr }: ExecResult = await exec("git pull", { cwd: "../../" });
    if (!stdout) {
      updateLogger.error(`${getFulltimeFormatted()} - stderror when updating (${stderr})`);
      return UpdateResult.Error;
    }
    if (stdout.toLowerCase().includes("already up to date")) {
      updateLogger.info(`${getFulltimeFormatted()} - Already up to date`);
      return UpdateResult.Unchanged;
    }
    updateLogger.info(`${getFulltimeFormatted()} - Update successful!`);
    return UpdateResult.Updated;
  } catch (err: unknown) {
    updateLogger.error(`${getFulltimeFormatted()} - Error when updating (${err})`);
    return UpdateResult.Error;
  }
}

async function build(): Promise<ResultType> {
  // ... similar typing
}

async function override(): Promise<ResultType> {
  // ... similar typing
}

async function startConfiger(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const pnpm: ChildProcess = spawn("pnpm", ["start:configer"], {
      cwd: "../../",
      detached: true,
    });
    // ...
  });
}

export default async function onStartup(): Promise<boolean> {
  // ...
}
```

#### `src/logic/start/windows.js` → `src/logic/start/windows.ts`
Same pattern as ubuntu.ts

#### `src/logic/install/ubuntu.js` → `src/logic/install/ubuntu.ts`

```typescript
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import path from "path";
import fs from "fs-extra";
import sudo from "sudo-prompt";
import winston from "winston";
import { getFulltimeFormatted } from "../../utils/time";

const exec = promisify(execCallback);

async function checkInstalled(logger: winston.Logger): Promise<boolean> {
  try {
    await exec("node -v");
  } catch (err) {
    logger.error(`${getFulltimeFormatted()} - Failed installation - missing node (${err})`);
    return false;
  }
  // ... rest of checks
  return true;
}

async function installDeps(): Promise<void> {
  await exec("npm install -g pnpm@9");
  await exec("npm install -g pm2@latest");
  await exec("npm install -g nodemon");
  await exec("npm install -g typescript@5");
  await exec("npm install -g ts-node@10");
}

export default async function install(): Promise<boolean> {
  const installLogger = winston.createLogger({
    // ...
  });
  
  const isInstalled = await checkInstalled(installLogger);
  if (!isInstalled) {
    installLogger.error(`${getFulltimeFormatted()} - Installation failed - dependencies missing`);
    return false;
  }

  await installDeps();
  return true;
}
```

#### `src/logic/install/windows.js` → `src/logic/install/windows.ts`
Same pattern as ubuntu.ts

### 2.5 Update Package Scripts

Update `source/apps/startup/package.json`:
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "nodemon --exec ts-node src/index.ts",
    "dev:install": "nodemon --exec ts-node src/index.ts --install",
    "start": "node dist/index.js",
    "start:install": "node dist/index.js --install",
    "start:ts": "ts-node src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2.6 Add Types for sudo-prompt

`sudo-prompt` doesn't have @types, create `src/types/sudo-prompt.d.ts`:
```typescript
declare module "sudo-prompt" {
  interface SudoOptions {
    name?: string;
    icns?: string;
    env?: Record<string, string>;
  }

  type ExecCallback = (
    error: Error | undefined,
    stdout: string | Buffer | undefined,
    stderr: string | Buffer | undefined
  ) => void;

  export function exec(
    command: string,
    options: SudoOptions,
    callback: ExecCallback
  ): void;
}
```

## File Mapping

| Before | After |
|--------|-------|
| `src/index.js` | `src/index.ts` |
| `src/utils/time.js` | `src/utils/time.ts` |
| `src/logic/start/ubuntu.js` | `src/logic/start/ubuntu.ts` |
| `src/logic/start/windows.js` | `src/logic/start/windows.ts` |
| `src/logic/install/ubuntu.js` | `src/logic/install/ubuntu.ts` |
| `src/logic/install/windows.js` | `src/logic/install/windows.ts` |
| (new) | `src/types/results.ts` |
| (new) | `src/types/sudo-prompt.d.ts` |
| (new) | `tsconfig.json` |

## Verification

1. **Type check passes**:
   ```bash
   cd source/apps/startup && pnpm typecheck
   ```

2. **Build succeeds**:
   ```bash
   cd source/apps/startup && pnpm build
   ```

3. **Startup works**:
   ```bash
   cd source/apps/startup && pnpm start
   ```

4. **Full monorepo build**:
   ```bash
   cd source && pnpm build
   ```

## Notes

- Keep CommonJS (`require`/`module.exports`) for now - ESM migration is separate project
- The conversion is mechanical - logic doesn't change
- Winston, moment, and fs-extra all have good TS support
- sudo-prompt needs manual type declaration

## Rollback

If issues arise:
- Rename `.ts` files back to `.js`
- Remove `tsconfig.json` and type files
- Revert package.json changes

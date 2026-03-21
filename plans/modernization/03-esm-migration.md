# Project 3: ESM Migration

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Convert all apps to ES Modules (ESM) |
| **Risk** | Medium |
| **Effort** | 2-3 days |
| **Dependencies** | #2 TypeScript Completion (recommended) |
| **Unlocks** | Required for Bun migration, modern tooling |

## Why Before Bun?

- Bun requires ESM
- ESM is the JavaScript standard going forward
- Better tree-shaking and static analysis
- Node.js fully supports ESM since v14

## Current State

| App | Module System | Status |
|-----|---------------|--------|
| Panel | ESM (via Vite) | No changes needed |
| Backend | CommonJS | **Needs migration** |
| Configer | ESM | Already done |
| Startup | CommonJS | **Needs migration** |

## Tasks

### 3.1 Backend ESM Migration

#### Update `package.json`
```json
{
  "type": "module"
}
```

#### Update `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

#### Fix Import Patterns

**Pattern 1: `import = require()` syntax**

Files: `src/index.ts`, `src/utils/time.ts`, `src/modules/restart.ts`

```typescript
// Before:
import moment = require("moment");
import open = require("open");
import winston = require("winston");

// After:
import moment from "moment";
import open from "open";
import winston from "winston";
```

**Pattern 2: Namespace imports**

Files: `src/index.ts`, all route files

```typescript
// Before:
import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import * as morgan from "morgan";

// After:
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
```

**Pattern 3: Add `.js` extensions to relative imports**

ESM requires explicit extensions. In TypeScript with `NodeNext`, you write `.js` even for `.ts` files:

```typescript
// Before:
import { fetchConfig } from "./fetch/fetchConfig";
import { engineRoute } from "./routes/engineRoute";

// After:
import { fetchConfig } from "./fetch/fetchConfig.js";
import { engineRoute } from "./routes/engineRoute.js";
```

#### Fix `__dirname` Usage

**File**: `src/index.ts`

```typescript
// Before:
app.use(express.static(__dirname + "/public/"));
res.sendFile(__dirname + "/public/index.html");

// After:
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(join(__dirname, "public")));
res.sendFile(join(__dirname, "public", "index.html"));
```

#### Fix Circular Dependency

The backend has a circular dependency through `index.ts`:

```
index.ts exports: { config }
    ↑
    └── url.ts imports config from ".."
    └── fetchFromUnits.ts imports config from ".."
    └── restart.ts imports config from ".."
```

**Solution**: Extract config to separate module

Create `src/state/config.ts`:
```typescript
import type { MainConfig } from "./types/config.types.js";

let _config: MainConfig | null = null;

export function getConfig(): MainConfig {
  if (!_config) {
    throw new Error("Config not initialized");
  }
  return _config;
}

export function setConfig(config: MainConfig): void {
  _config = config;
}
```

Update imports everywhere:
```typescript
// Before:
import { config } from "..";

// After:
import { getConfig } from "../state/config.js";
const config = getConfig();
```

Update `index.ts`:
```typescript
import { setConfig } from "./state/config.js";

async function main() {
  const response = await fetchConfig();
  setConfig(response.data);
  // ...
}
```

#### Files Requiring Changes

| File | Changes |
|------|---------|
| `src/index.ts` | Import syntax, `__dirname`, export config differently |
| `src/utils/time.ts` | `import moment = require` → `import moment from` |
| `src/modules/restart.ts` | Import syntax |
| `src/utils/url.ts` | Import config from new location |
| `src/fetch/fetchFromUnits.ts` | Import config from new location |
| `src/routes/engineRoute.ts` | Import syntax |
| `src/routes/thermalRoute.ts` | Import syntax |
| `src/routes/unitsRoute.ts` | Import syntax |
| `src/routes/restartRoute.ts` | Import syntax, modules import |
| All files | Add `.js` to relative imports |

### 3.2 Startup ESM Migration

#### Update `package.json`
```json
{
  "type": "module"
}
```

#### Update `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

#### Convert All Imports

```typescript
// Before:
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const spawn = require("child_process").spawn;
const fs = require("fs-extra");
const winston = require("winston");
const { getFulltimeFormatted } = require("../../utils/time");

// After:
import { promisify } from "util";
import { exec as execCallback, spawn } from "child_process";
import fs from "fs-extra";
import winston from "winston";
import { getFulltimeFormatted } from "../../utils/time.js";

const exec = promisify(execCallback);
```

#### Convert All Exports

```typescript
// Before:
module.exports = async function onStartup() { ... }

// After:
export default async function onStartup() { ... }
```

```typescript
// Before:
module.exports = {
  getFulltimeFormatted: () => { ... }
};

// After:
export function getFulltimeFormatted() { ... }
```

#### Handle `__dirname` (if used)

```typescript
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 3.3 Update Build Scripts

#### Backend `package.json`
```json
{
  "scripts": {
    "dev": "nodemon --experimental-specifier-resolution=node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

#### Startup `package.json`
```json
{
  "scripts": {
    "dev": "nodemon --loader ts-node/esm src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 3.4 Jest Configuration for ESM (if needed)

If tests exist, update Jest config:

```json
{
  "preset": "ts-jest/presets/default-esm",
  "extensionsToTreatAsEsm": [".ts"],
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  "transform": {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        "useESM": true
      }
    ]
  }
}
```

## Verification

### Per-App Testing

```bash
# Backend
cd source/apps/backend
pnpm build
pnpm start
# Test: curl http://localhost:5000/api/v1/status

# Startup  
cd source/apps/startup
pnpm build
pnpm start
```

### Full Monorepo

```bash
cd source
pnpm build
pnpm dev
```

### Integration Test

1. Start all services
2. Open panel in browser
3. Verify data loads from units
4. Verify camera feed works

## Common ESM Gotchas

1. **File extensions required**: All relative imports need `.js`
2. **No `require()`**: Use `import` or dynamic `import()`
3. **No `__dirname`**: Use `import.meta.url` pattern
4. **JSON imports**: Need `assert { type: "json" }` or use `fs.readFileSync`
5. **Top-level await**: Supported in ESM, useful for config loading

## Rollback

If issues arise:
1. Remove `"type": "module"` from package.json files
2. Revert tsconfig.json module settings
3. Revert import/export syntax changes
4. Git revert the commits

# Project 9: Configer Merge into Backend

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Merge configer service into backend |
| **Risk** | Medium |
| **Effort** | 2-3 days |
| **Dependencies** | #3 ESM Migration |
| **Unlocks** | Simpler architecture, fewer services to manage |

## Why Merge?

Current state:
- 4 separate services: panel, backend, configer, startup
- Backend depends on configer at startup (HTTP call with 2s delay)
- Types duplicated between backend and configer
- Extra PM2 process, extra port, extra failure point

After merge:
- 3 services: panel, backend (with config), startup
- No startup dependency on external service
- Single source of truth for types
- One less process to manage

## Current Configer Analysis

| Metric | Value |
|--------|-------|
| Source files | 8 |
| Total lines | ~300 |
| Dependencies | express, cors, lowdb, lodash.merge |
| Port | 5001 |
| Endpoints | 3 (status, config/main, config/version) |

All functionality can be absorbed into backend.

## Tasks

### 9.1 Move Config Service Code

Copy configer services to backend:

```bash
# Create directory
mkdir -p source/apps/backend/src/services/config

# Copy files
cp source/apps/configer/src/services/db/factory.ts source/apps/backend/src/services/config/
cp source/apps/configer/src/services/db/main.ts source/apps/backend/src/services/config/
cp source/apps/configer/src/services/db/version.ts source/apps/backend/src/services/config/
```

### 9.2 Move Config Files

```bash
# Move configs to backend
cp -r source/apps/configer/configs source/apps/backend/
```

New structure:
```
backend/
├── configs/
│   ├── main.json
│   ├── base.json
│   └── versions.json
├── src/
│   ├── services/
│   │   └── config/
│   │       ├── factory.ts
│   │       ├── main.ts
│   │       └── version.ts
```

### 9.3 Update Path References

Update `source/apps/backend/src/services/config/main.ts`:

```typescript
// Before (in configer):
const configPath = join(__dirname, "../../../configs/main.json");
const basePath = join(__dirname, "../../../configs/base.json");

// After (in backend):
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, "../../../configs/main.json");
const basePath = join(__dirname, "../../../configs/base.json");
```

### 9.4 Create Config Routes in Backend

Create `source/apps/backend/src/routes/configRoute.ts`:

```typescript
import { Router, Request, Response } from "express";
import { DbFactory } from "../services/config/factory.js";
import { MainConfigSchema } from "../schemas/config.schema.js";

const router = Router();

// GET /api/v1/config/main
router.get("/main", async (req: Request, res: Response) => {
  try {
    const db = await DbFactory.getMainDb();
    const config = db.data();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load config" });
  }
});

// PUT /api/v1/config/main
router.put("/main", async (req: Request, res: Response) => {
  try {
    const result = MainConfigSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid configuration",
        details: result.error.errors,
      });
    }

    const db = await DbFactory.getMainDb();
    const updated = await db.update(result.data);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update config" });
  }
});

// GET /api/v1/config/version
router.get("/version", async (req: Request, res: Response) => {
  try {
    const db = await DbFactory.getVersionDb();
    const versions = db.data();
    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load versions" });
  }
});

// Alias for backwards compatibility
router.get("/versions", async (req: Request, res: Response) => {
  // Same as /version
  try {
    const db = await DbFactory.getVersionDb();
    res.json({ success: true, data: db.data() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to load versions" });
  }
});

export { router as configRoute };
```

### 9.5 Register Config Routes in Backend

Update `source/apps/backend/src/index.ts`:

```typescript
import { configRoute } from "./routes/configRoute.js";

// Add route
app.use(`${API_PREFIX}/config`, configRoute);
```

### 9.6 Update Backend Config Loading

Currently backend fetches config via HTTP from configer. Change to direct loading:

```typescript
// Before (src/fetch/fetchConfig.ts):
export async function fetchConfig() {
  const url = `http://localhost:5001${API_PREFIX}/config/main`;
  await wait(2000); // Wait for configer to start
  return axios.get(url, { timeout: 10000 });
}

// After (src/services/config/loader.ts):
import { DbFactory } from "./factory.js";

export async function loadConfig(): Promise<MainConfig> {
  const db = await DbFactory.getMainDb();
  return db.data();
}
```

Update `src/index.ts`:
```typescript
// Before:
import { fetchConfig } from "./fetch/fetchConfig.js";
const response = await fetchConfig();
setConfig(response.data);

// After:
import { loadConfig } from "./services/config/loader.js";
const config = await loadConfig();
setConfig(config);
```

### 9.7 Add lowdb to Backend

```bash
cd source/apps/backend
bun add lowdb lodash.merge
bun add -D @types/lodash.merge
```

### 9.8 Update Panel Config Fetching

The panel currently fetches config from port 5001. Update to use backend:

Update `source/apps/panel/src/logic/panel/panelLoop.ts`:

```typescript
// Before:
const configUrl = `http://localhost:5001/api/v1/config/main`;
const versionUrl = `http://localhost:5001/api/v1/config/version`;

// After (use backend port):
const configUrl = `http://localhost:5000/api/v1/config/main`;
const versionUrl = `http://localhost:5000/api/v1/config/version`;
```

Or better, derive from config:
```typescript
const configStore = useConfigStore();
const baseUrl = `http://localhost:${configStore.backend.port}${configStore.backend.url}`;
const configUrl = `${baseUrl}/config/main`;
```

### 9.9 Update Panel API Functions

Update `source/apps/panel/src/api/config.ts` (if exists) or create:

```typescript
import { useConfigStore } from "../pinia/configStore";

export async function fetchMainConfig() {
  const configStore = useConfigStore();
  const url = `http://localhost:${configStore.backend.port}/api/v1/config/main`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch config");
  }
  return response.json();
}

export async function fetchVersions() {
  const configStore = useConfigStore();
  const url = `http://localhost:${configStore.backend.port}/api/v1/config/version`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch versions");
  }
  return response.json();
}
```

### 9.10 Update Startup App

Remove configer process management:

```typescript
// Before:
async function startConfiger(): Promise<number> {
  return new Promise((resolve, reject) => {
    const pnpm = spawn("pnpm", ["start:configer"], { ... });
    // ...
  });
}

export default async function onStartup(): Promise<boolean> {
  const configerCode = await startConfiger();
  if (configerCode !== 0) {
    startLogger.error("Configer failed to start");
    return false;
  }
  
  const mainCode = await start();
  // ...
}

// After:
export default async function onStartup(): Promise<boolean> {
  // No configer to start - backend handles config
  const mainCode = await start();
  // ...
}
```

### 9.11 Update Root Package Scripts

Update `source/package.json`:

```json
{
  "scripts": {
    "dev": "turbo dev --filter=!babybox-panel-configer",
    "build": "turbo build --filter=!babybox-panel-configer",
    "stop": "pm2 delete babybox"
  }
}
```

### 9.12 Delete Configer App

After verification:

```bash
rm -rf source/apps/configer
```

Update `pnpm-workspace.yaml` if it has explicit configer reference.

## Migration Diagram

```
Before:
┌─────────┐      ┌─────────┐      ┌──────────┐
│  Panel  │─────>│ Backend │      │ Configer │
│  :4000  │      │  :5000  │      │  :5001   │
└─────────┘      └─────────┘      └──────────┘
      │                                 │
      └─────────────────────────────────┘
           Fetches config at startup

After:
┌─────────┐      ┌──────────────────┐
│  Panel  │─────>│     Backend      │
│  :4000  │      │ :5000 + config   │
└─────────┘      └──────────────────┘
                        │
                 ┌──────┴──────┐
                 │   configs/  │
                 │  main.json  │
                 └─────────────┘
```

## Verification

### During Migration (Both Running)

1. Start old configer on 5001
2. Start new backend with config routes on 5000
3. Compare responses:
   ```bash
   curl http://localhost:5001/api/v1/config/main > old.json
   curl http://localhost:5000/api/v1/config/main > new.json
   diff old.json new.json
   ```

### After Migration

```bash
# Start only backend
cd source/apps/backend && bun src/index.ts

# Test config endpoints
curl http://localhost:5000/api/v1/config/main
curl http://localhost:5000/api/v1/config/version

# Test config update
curl -X PUT http://localhost:5000/api/v1/config/main \
  -H "Content-Type: application/json" \
  -d @configs/main.json

# Start panel, verify it loads
cd source/apps/panel && bun run dev
```

### Full System Test

```bash
cd source
turbo dev --filter=!babybox-panel-configer

# Verify panel loads and displays data
# Verify settings can be changed
# Verify hardware communication works
```

## Files Changed Summary

| Action | Files |
|--------|-------|
| Create | `backend/src/services/config/*.ts` |
| Create | `backend/src/routes/configRoute.ts` |
| Create | `backend/configs/*.json` |
| Update | `backend/src/index.ts` |
| Update | `backend/package.json` (add lowdb) |
| Update | `panel/src/logic/panel/panelLoop.ts` |
| Update | `panel/src/api/*.ts` (config URLs) |
| Update | `startup/src/logic/start/*.ts` (remove configer) |
| Update | `source/package.json` (scripts) |
| Delete | `apps/configer/` (entire directory) |

## Rollback

If issues arise:
1. Keep configer app (don't delete)
2. Revert panel to use port 5001
3. Restore startup to manage configer
4. Remove config routes from backend
5. Remove config services from backend

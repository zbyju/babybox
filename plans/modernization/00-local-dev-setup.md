# Project 0: Local Development Setup

> **Prerequisites**: Read [MODERNIZATION.md](../MODERNIZATION.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Ensure project builds and runs locally |
| **Risk** | None |
| **Effort** | 30 minutes |
| **Dependencies** | None |
| **Status** | **COMPLETE** |

## Changes Made

### Port Configuration

Updated all services to use 3xxx ports (avoiding macOS reserved 5xxx ports):

| Service | Old Port | New Port |
|---------|----------|----------|
| Backend | 5000 | 3000 |
| Configer | 5001 | 3001 |
| Panel (Vite) | 4000 | 3002 |

### Files Changed

1. **`apps/configer/configs/main.json`**
   - `backend.port`: 5000 → 3000
   - `configer.port`: 5001 → 3001

2. **`apps/configer/configs/base.json`**
   - `backend.port`: 5000 → 3000
   - `configer.port`: 5001 → 3001

3. **`apps/backend/src/fetch/fetchConfig.ts`**
   - Hardcoded configer URL: `localhost:5001` → `localhost:3001`

4. **`apps/backend/.env`**
   - `PORT`: 5000 → 3000
   - `NODE_ENV`: production → development

5. **`apps/configer/.env`**
   - `PORT`: 5001 → 3001

6. **`apps/panel/vite.config.ts`**
   - `server.port`: 4000 → 3002

## Verification

### Build
```bash
cd source && pnpm build
```
Expected: All three apps build successfully.

### Dev Mode
```bash
cd source && pnpm dev
```
Expected: All three services start:
- Configer responds at http://localhost:3001/api/v1/status
- Backend responds at http://localhost:3000/api/v1/status
- Panel serves at http://localhost:3002/

### Quick Test
```bash
curl http://localhost:3001/api/v1/status  # {"msg":"Alive."}
curl http://localhost:3000/api/v1/status  # {"msg":"Alive."}
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/  # 200
```

## Notes

- The startup app is NOT built/run locally - it's only for production deployment
- Backend waits 2 seconds for configer to start before fetching config
- Panel fetches config from backend, which fetches from configer

## Next Steps

With local dev working, proceed to:
1. [Project 1: Cleanup](./01-cleanup.md) - Remove dead code
2. [Project 2: TypeScript Completion](./02-typescript-completion.md) - Convert startup to TS

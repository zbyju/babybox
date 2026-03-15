# Babybox Panel

Hospital monitoring system for babybox devices. Runs 24/7 autonomously without user interaction - all controls are password-protected for remote maintenance only.

## Architecture

pnpm monorepo with 4 apps in `source/apps/`:

| App | Port | Purpose |
|-----|------|---------|
| `panel` | 3002 | Vue 3 frontend - realtime monitoring dashboard |
| `backend` | 3000 | Express API - communicates with hardware units |
| `configer` | 3001 | Configuration service - manages JSON configs |
| `startup` | - | Deployment utility - auto-update and process management |

## Key Commands

```bash
pnpm dev           # Start all services
pnpm build         # Build for production
```

## Hardware Units

The system monitors two physical units via IP:

- **Engine Unit** (default 10.1.1.5): Door control, motors, barriers, inspection timers
- **Thermal Unit** (default 10.1.1.6): Temperature sensors, heating/cooling, voltage monitoring
- **Camera** (default 10.1.1.7): Video feed (Dahua camera support)

## Configuration

Main config: `source/apps/configer/configs/main.json`

Key configurable values:
- `app.password` - UI access password
- `units.engine.ip` / `units.thermal.ip` - Hardware IPs
- `camera.ip`, `camera.cameraType` - Camera settings
- `units.requestDelay` - Polling interval
- `backend.requestTimeout` - API timeouts

## Panel Frontend (`apps/panel/src/`)

- `views/` - Main pages (MainView for monitoring, SettingsView, DataView)
- `components/panel/` - Dashboard widgets displaying unit data
- `pinia/` - State stores (config, connection, units data)
- `logic/panelLoop.ts` - Core polling loop (fetches data every ~2s)
- `composables/` - Camera feed, sound alerts, time utilities

## Backend (`apps/backend/src/`)

- `routes/` - API endpoints (engine, thermal, units, restart)
- `fetch/` - Hardware communication functions
- Serves static panel files in production

### API Routes

- `GET /api/v1/engine/data` - Engine unit readings
- `GET /api/v1/thermal/data` - Thermal unit readings
- `GET/PUT /api/v1/units/settings` - Unit configuration
- `GET /api/v1/units/actions/:action` - Trigger actions (e.g., open doors)

## Configer (`apps/configer/src/`)

- `routes/config.ts` - Config CRUD endpoints
- `configs/main.json` - Runtime configuration
- `configs/base.json` - Default values

## Domain Notes

- Panel polls backend continuously via watchdog pattern
- Sound alerts trigger on state changes (door open, temperature warnings)
- Navigation/settings locked behind password for autonomous operation

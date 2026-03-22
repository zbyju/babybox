# Babybox Panel

Hospital monitoring system for babybox devices. Runs 24/7 autonomously without user interaction - all controls are password-protected for remote maintenance only.

## Architecture

Bun monorepo with Turborepo, 3 apps in `source/apps/`:

| App | Port | Purpose |
|-----|------|---------|
| `panel` | 3002 | Vue 3 frontend - realtime monitoring dashboard |
| `backend` | 3000 | Express API - communicates with hardware units + config service |
| `startup-v2` | - | Deployment utility - auto-update and process management (Bun binary) |

> Note: `startup` (old JS version) coexists during migration. `configer` was merged into `backend`.

## Key Commands

```bash
bun dev            # Start all services (via Turborepo)
bun run build      # Build for production
bun run test       # Run all tests
bun run typecheck  # Type check all apps
bun run lint       # Lint all apps
```

## Hardware Units

The system monitors two physical units via IP:

- **Engine Unit** (default 10.1.1.5): Door control, motors, barriers, inspection timers
- **Thermal Unit** (default 10.1.1.6): Temperature sensors, heating/cooling, voltage monitoring
- **Camera** (default 10.1.1.7): Video feed (Dahua camera support)

## Configuration

### Config Files

- **`base.json`** - Tracked in git, contains default values and template structure
- **`main.json`** - Environment-specific, NOT tracked in git (local-only)
- **`versions.json`** - Deployment metadata, NOT tracked in git (local-only)

On first setup:
```bash
cd source/apps/backend/configs
cp base.json main.json  # Create local config from template
# Edit main.json with your environment-specific values (passwords, IPs, etc.)
```

### Key Configurable Values

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

- `routes/` - API endpoints (engine, thermal, units, restart, config, health)
- `fetch/` - Hardware communication functions
- `middleware/` - Zod validation middleware, error handling
- `modules/config/` - Merged config service (replaces configer app)
- `schemas/` - Zod schemas for request/response validation
- Serves static panel files in production

### API Routes

- `GET /api/v1/engine/data` - Engine unit readings
- `GET /api/v1/thermal/data` - Thermal unit readings
- `GET/PUT /api/v1/units/settings` - Unit configuration
- `GET /api/v1/units/actions/:action` - Trigger actions (e.g., open doors)
- `GET/PUT /api/v1/config` - Config read/write (merged from configer)
- `GET /api/v1/health` - Health check endpoint

## Domain Notes

- Panel polls backend continuously via watchdog pattern
- Sound alerts trigger on state changes (door open, temperature warnings)
- Navigation/settings locked behind password for autonomous operation

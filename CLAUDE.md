# Babybox Panel

Hospital monitoring system for babybox devices. Runs 24/7 autonomously without user interaction - all controls are password-protected for remote maintenance only.

## Architecture

pnpm monorepo with 4 apps in `source/apps/`:

| App | Port | Purpose |
|-----|------|---------|
| `panel` | 4000 | Vue 3 frontend - realtime monitoring dashboard |
| `backend` | 5000 | Express API - communicates with hardware units |
| `configer` | 5001 | Configuration service - manages JSON configs |
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

### The config page

`/config` in the panel, reached from the top nav as "Konfigurace". It is behind the
same password gate as "Nastavení" (`app.password`), and it bounces back to the panel
after 10 minutes. It edits every field of `main.json` through a form, so the file
does not have to be hand-edited over a remote session any more.

Save sends one `PATCH /api/v1/config/main` with the whole config, then asks the
backend to re-read it, then reloads the panel. What that reaches:

| Tier | What the maintainer has to do |
|---|---|
| Panel reload | Nothing. The save reloads the panel itself. |
| Backend reload | Nothing. The save calls `POST <prefix>/reload`. Covers the unit IPs and `pc.os`. |
| Backend restart | Restart the backend. Only `backend.port` and `backend.url`, which are bound when it starts listening. The page says so in a banner after the save. |
| Configer restart | Edit `main.json` by hand and restart configer. Only `configer.port` and `configer.url`; the API refuses to write them. |

Before saving, the form asks once about the fields that can cut a maintainer off
from the box — `app.password`, `backend.port`, `backend.url` and the two unit IPs —
naming each one that changed with its old and new value. The metadata is `confirm`
in `packages/config-schema/src/form.ts`.

### Network exposure

The config endpoints have **no authentication**, and neither do the backend's. Both
servers bind every interface and answer `Access-Control-Allow-Origin: *`, so
anything that can route to the box can read the config — `app.password` included —
and write it. The same caller can open the doors with
`GET <prefix>/units/actions/opendoors`.

This is a deliberate, recorded decision, not an oversight: see
`docs/decisions.md`, "No auth on the configer write endpoint". It holds only while
the box is on a network we trust. The password gate in the nav is a guard against a
mis-tap, not a security control — it is compared in the browser.

Key configurable values:
- `app.password` - UI access password
- `units.engine.ip` / `units.thermal.ip` - Hardware IPs
- `camera.ip`, `camera.cameraType` - Camera settings
- `units.requestDelay` - Polling interval
- `backend.requestTimeout` - API timeouts

## Panel Frontend (`apps/panel/src/`)

- `views/` - Main pages (MainView for monitoring, SettingsView, ConfigView, DataView)
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

- `routes/configRoute.ts` - Config endpoints
- `configs/main.json` - Runtime configuration
- `configs/base.json` - Default values

### API Routes

- `GET /api/v1/config/main` - Current config
- `PUT /api/v1/config/main` - Full replace; a key left out returns to its `base.json` default
- `PATCH /api/v1/config/main` - Partial update; a key left out keeps its stored value
- `GET /api/v1/config/versions` - Installed versions

Backend, used by the config page:

- `POST <prefix>/reload` - Re-read the config from configer into the running process.
  Answers which fields it could not apply (`backend.port`, `backend.url`)

## Domain Notes

- Panel polls backend continuously via watchdog pattern
- Sound alerts trigger on state changes (door open, temperature warnings)
- Navigation/settings locked behind password for autonomous operation

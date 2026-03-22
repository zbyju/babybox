# Babybox Panel

Hospital monitoring system for babybox devices. The system runs 24/7 autonomously in hospitals — all controls are password-protected for remote maintenance only.

## Architecture

Bun monorepo orchestrated with Turborepo. All apps live in `source/apps/`:

| App | Port | Tech | Purpose |
|-----|------|------|---------|
| [`backend`](source/apps/backend/) | 3000 | Express + TypeScript | REST API — communicates with hardware units, serves config, serves panel static files in production |
| [`panel`](source/apps/panel/) | 3002 | Vue 3 + Vite | Realtime monitoring dashboard — polls backend every ~2s, displays sensor data, triggers sound alerts |
| [`startup-v2`](source/apps/startup-v2/) | — | Bun compiled binary | Deployment utility — auto-updates repo, builds apps, starts processes via PM2 |

> `startup` (legacy JS version) coexists during migration to `startup-v2`.

## Prerequisites

- [Bun](https://bun.sh/) >= 1.2.21
- [PM2](https://pm2.keymetrics.io/) (for production process management)
- Git

## Quick Start

```bash
# Install dependencies
bun install

# Create local config (required for backend)
cp source/apps/backend/configs/base.json source/apps/backend/configs/main.json
# Edit main.json with your environment-specific values

# Start all services in development
bun dev
```

The panel will be available at `http://localhost:3002` and the backend API at `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start all services (Turborepo) |
| `bun dev:backend` | Start only the backend |
| `bun dev:panel` | Start only the panel |
| `bun run build` | Build all apps for production |
| `bun run test` | Run all tests |
| `bun run typecheck` | Type-check all apps |
| `bun run lint` | Lint all apps (oxlint) |
| `bun run format` | Format all apps (oxfmt) |
| `bun run clean` | Remove all build artifacts and node_modules |
| `bun start:main` | Start backend with PM2 (production) |
| `bun stop` | Stop all PM2 processes |

## Hardware

The system monitors physical units via IP over the local network:

- **Engine Unit** (default `10.1.1.5`) — door control, motors, barriers, inspection timers
- **Thermal Unit** (default `10.1.1.6`) — temperature sensors, heating/cooling, voltage monitoring
- **Camera** (default `10.1.1.7`) — RTSP video feed (supports Dahua, Hikvision, Avtech, Vivotek)

## Configuration

The backend uses a layered JSON config system in `source/apps/backend/configs/`:

- **`base.json`** — default template (tracked in git)
- **`main.json`** — environment-specific overrides (not tracked, create from base.json)
- **`versions.json`** — deployment metadata (not tracked, created by startup-v2)

Key settings in `main.json`:

| Key | Description |
|-----|-------------|
| `babybox.name` | Display name of this babybox installation |
| `app.password` | Password for accessing settings UI |
| `units.engine.ip` | Engine unit IP address |
| `units.thermal.ip` | Thermal unit IP address |
| `camera.ip` | Camera IP address |
| `camera.cameraType` | Camera type: `dahua`, `hikvision`, `avtech`, `vivotek` |
| `units.requestDelay` | Polling interval in ms (default 2000) |
| `backend.requestTimeout` | API timeout in ms (default 5000) |
| `pc.os` | Operating system: `windows` or `ubuntu` |

## Tech Stack

- **Runtime:** Bun 1.2.21
- **Monorepo:** Turborepo 2.8.20
- **Language:** TypeScript 5.9.3 (strict mode)
- **Frontend:** Vue 3, Vite, Pinia, Vue Router
- **Backend:** Express 4, Axios, Winston (logging), LowDB (JSON persistence)
- **Validation:** Zod 4
- **Linting:** oxlint, oxfmt
- **Testing:** Vitest (panel, backend), Bun test (startup-v2)

## Project Structure

```
babybox/
├── source/
│   └── apps/
│       ├── backend/        # Express REST API
│       ├── panel/          # Vue 3 monitoring dashboard
│       ├── startup-v2/     # Bun binary deployment tool
│       └── startup/        # Legacy deployment tool (deprecated)
├── plans/                  # Development plans and migration tracking
├── turbo.json              # Turborepo task configuration
├── package.json            # Root workspace config
└── CLAUDE.md               # AI assistant instructions
```

## Plans

- [`plans/MODERNIZATION.md`](plans/MODERNIZATION.md) — 2026 modernization tracker
- [`plans/STARTUP-REWRITE.md`](plans/STARTUP-REWRITE.md) — startup-v2 rewrite tracker

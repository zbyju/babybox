# Babybox Panel

Hospital monitoring system for babybox devices. Runs 24/7 autonomously without user interaction.

## Architecture

Bun monorepo with Turborepo. Apps in `source/apps/`:

| App | Port | Purpose |
|-----|------|---------|
| `backend` | 3000 | Express API + config service. Communicates with hardware units and serves the panel. |
| `panel` | 3002 | Vue 3 frontend - realtime monitoring dashboard |
| `startup-v2` | - | Auto-update and process management (compiled Bun binary) |

## Quick Start

```bash
cd source
bun install
bun dev        # Start all services
```

## Hardware

The system monitors two physical units:

- **Engine Unit** (default `10.1.1.5`): Door control, motors, barriers, inspection timers
- **Thermal Unit** (default `10.1.1.6`): Temperature sensors, heating/cooling, voltage monitoring
- **Camera** (default `10.1.1.7`): RTSP video feed

## Plans

Development plans and migration tracking are in `plans/`:

- [`plans/MODERNIZATION.md`](plans/MODERNIZATION.md) - 2026 modernization tracker (Bun, ESM, Zod, Turborepo, etc.)
- [`plans/STARTUP-REWRITE.md`](plans/STARTUP-REWRITE.md) - startup-v2 rewrite tracker

## Branch

Active development: `migration/modernization-2026`

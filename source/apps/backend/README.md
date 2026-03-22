# Babybox Panel Backend

Express REST API that communicates with babybox hardware units (engine, thermal) over HTTP and provides data to the panel frontend. Also serves the panel's static files in production and manages configuration.

## Tech Stack

- **Express 4** + **TypeScript** (ESM)
- **Bun** — runtime and bundler
- **Axios** — HTTP client for hardware unit communication
- **Zod** — request/response validation
- **Winston** — structured logging to `logs/` directory
- **LowDB** — JSON file persistence for config
- **Vitest** — unit testing

## Development

```bash
# From the monorepo root:
bun dev:backend

# Or from this directory:
bun dev          # Starts with file watching on port 3000
bun run build    # Build to dist/ with bun build
bun run test     # Run unit tests
bun run typecheck  # Type-check with tsc
bun run lint     # Lint with oxlint
bun run format   # Format with oxfmt
```

### Configuration Setup

Before running, create a local config file:

```bash
cd configs
cp base.json main.json
# Edit main.json with your environment-specific values
```

Key fields to configure:

- `units.engine.ip` / `units.thermal.ip` — hardware unit IP addresses
- `camera.ip`, `camera.cameraType` — camera settings
- `app.password` — UI access password
- `babybox.name` — display name for this installation

## API Routes

Base URL: `/api/v1`

| Method | Path                     | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | `/engine/data`           | Engine unit sensor readings                  |
| PUT    | `/engine/watchdog`       | Refresh engine watchdog timer                |
| GET    | `/thermal/data`          | Thermal unit sensor readings                 |
| GET    | `/units/settings`        | Get unit settings                            |
| PUT    | `/units/settings`        | Update unit settings                         |
| GET    | `/units/actions/:action` | Trigger actions (`open`, `openServiceDoors`) |
| GET    | `/config`                | Read application config                      |
| PUT    | `/config`                | Update application config                    |
| GET    | `/health`                | Health check endpoint                        |

Postman collections for API testing are in `src/routes/__postman__/`.

## Project Structure

```
src/
├── index.ts                # Express app setup, route registration, server start
├── fetch/                  # Hardware communication
│   ├── fetch.ts            # Generic HTTP fetch wrapper with timeout
│   └── fetch-from-units.ts # Unit-specific request functions
├── middleware/
│   └── validate.ts         # Zod validation middleware
├── modules/
│   ├── init.ts             # App initialization (load config, setup logging)
│   └── restart.ts          # System restart logic
├── routes/                 # Express route handlers
│   ├── engine-route.ts     # Engine unit endpoints
│   ├── thermal-route.ts    # Thermal unit endpoints
│   ├── units-route.ts      # Combined units endpoints
│   ├── config-route.ts     # Config read/write endpoints
│   ├── restart-route.ts    # Restart endpoints
│   ├── health-route.ts     # Health check
│   └── __postman__/        # Postman test collections
├── schemas/                # Zod schemas for validation
├── services/
│   └── config/             # Config management service
│       ├── main.ts         # Config CRUD operations
│       ├── loader.ts       # Load config from disk
│       ├── factory.ts      # Create config instances
│       └── version.ts      # Version tracking
├── state/
│   └── config.ts           # Global config state
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
    ├── actions.ts           # Action execution helpers
    ├── response.ts          # Response formatting
    ├── url.ts               # URL building for hardware units
    ├── time.ts              # Time utilities
    └── wait.ts              # Async delay helpers
```

## Config Files

Located in `configs/`:

| File            | Tracked | Description                                         |
| --------------- | ------- | --------------------------------------------------- |
| `base.json`     | Yes     | Default template with all possible keys             |
| `main.json`     | No      | Environment-specific config (create from base.json) |
| `versions.json` | No      | Deployment metadata (managed by startup-v2)         |

The config service merges `base.json` with `main.json` at startup — `main.json` overrides take precedence.

## Logging

Winston logs are written to `logs/` (gitignored). Each module creates its own logger instance with file-specific log files.

## Production

In production, the backend serves the panel's built static files from the panel's `dist/` directory. The backend is managed by PM2:

```bash
# From the monorepo root:
bun start:main     # Start with PM2
bun stop           # Stop all PM2 processes
```

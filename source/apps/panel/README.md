# Babybox Panel (Frontend)

Vue 3 real-time monitoring dashboard for babybox devices. Displays sensor data from the backend API, shows camera feeds, and triggers sound alerts on state changes.

## Tech Stack

- **Vue 3** (Composition API) + **TypeScript**
- **Vite** — dev server and build tool
- **Pinia** — state management
- **Vue Router** — client-side routing
- **Stylus** — CSS preprocessor
- **Howler** — sound alert playback
- **Axios** — HTTP requests to backend
- **Zod** — runtime validation
- **Vitest** — unit testing

## Development

```bash
# From the monorepo root:
bun dev:panel

# Or from this directory:
bun dev          # Starts Vite dev server on port 3002
bun run build    # Type-check + production build to dist/
bun run test     # Run unit tests
bun run typecheck  # Type-check only
bun run lint     # Lint with oxlint
bun run format   # Format with oxfmt
```

The dev server runs at `http://localhost:3002` and proxies API requests to the backend at port 3000.

## Project Structure

```
src/
├── api/                    # HTTP calls to backend API
│   ├── restart.ts
│   └── units.ts
├── components/
│   ├── panel/              # Dashboard widgets
│   │   ├── containers/     # Layout containers for widget groups
│   │   ├── elements/       # Individual data display elements
│   │   ├── HTMLElements/   # Reusable HTML building blocks
│   │   └── table/          # Data table components
│   ├── settings/           # Settings page components
│   │   └── form/           # Settings form inputs
│   ├── AppState.vue        # App state indicator
│   └── TheNav.vue          # Navigation bar
├── composables/            # Vue composables (reusable reactive logic)
│   ├── use-camera.ts       # Camera feed management
│   ├── use-sounds.ts       # Sound alert triggers
│   ├── use-active-time.ts  # Active time tracking
│   └── ...
├── defaults/               # Default values and templates
│   ├── config.default.ts
│   ├── units.defaults.ts
│   └── ...
├── logic/
│   └── panel/
│       ├── panel-loop.ts   # Core polling loop (~2s interval)
│       ├── state.ts        # Panel state management
│       └── tables.ts       # Table data transformation
├── pinia/                  # Pinia state stores
│   ├── config-store.ts     # Backend configuration
│   ├── connection-store.ts # Connection status tracking
│   ├── units-store.ts      # Engine/thermal unit data
│   ├── panel-state-store.ts # UI state
│   └── app-state-store.ts  # App lifecycle
├── router/
│   └── index.ts            # Route definitions
├── types/                  # TypeScript type definitions
│   ├── panel/              # Panel-specific types
│   ├── base/               # Base/shared types
│   ├── app/                # App-level types
│   └── settings/           # Settings types
├── utils/                  # Utility functions
│   ├── panel/              # Panel-specific utilities
│   ├── settings/           # Settings utilities
│   ├── fetch-with-timeout.ts
│   ├── time.ts
│   └── ...
├── views/                  # Page-level components
│   ├── MainView.vue        # Main monitoring dashboard
│   ├── DataView.vue        # Historical data display
│   └── SettingsView.vue    # Configuration interface (password-protected)
├── App.vue                 # Root component
└── main.ts                 # Application entry point
```

## Key Concepts

### Panel Loop

The core of the application is `panel-loop.ts` — a watchdog-style polling loop that fetches data from the backend every ~2 seconds. It updates the Pinia stores, which reactively update all dashboard components.

### Sound Alerts

The `use-sounds.ts` composable monitors unit data for state changes (door opening, temperature warnings) and plays audio alerts via Howler. Sound files are in `public/sounds/`.

### Settings

All settings and navigation are password-protected since the panel runs unattended in hospital environments. The password is configured in the backend's `main.json`.

## Build

```bash
bun run build
```

Produces a `dist/` directory with static files. In production, these are served by the backend's Express static file middleware.

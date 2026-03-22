# Babybox Dependency Versions

This document centralizes dependency versions across the monorepo.
For reproducible builds, all version constraints use exact versions (no `^` or `~`).

## TypeScript & Types

- `typescript`: 5.9.3
- `@types/node`: 20.10.0
- `@types/cors`: 2.8.13
- `@types/express`: 4.17.21
- `@types/lodash.merge`: 4.3.2
- `@types/morgan`: 1.9.9
- `@types/jest`: 29.5.11
- `@types/howler`: 2.2.11
- `@types/jsdom`: 21.1.6
- `@types/lodash`: 4.14.202
- `@types/bun`: latest

## Runtime - Core Dependencies

- `axios`: 1.13.6
- `cors`: 2.8.5
- `dotenv`: 16.6.1
- `express`: 4.22.1
- `zod`: 4.3.6

## Runtime - Utilities

- `lodash`: 4.17.21
- `lodash.merge`: 4.6.2
- `moment`: 2.29.3
- `morgan`: 1.10.0
- `open`: 10.2.0
- `fs-extra`: 11.3.4
- `sudo-prompt`: 9.2.1
- `neverthrow`: 7.0.0

## Runtime - Frontend

- `howler`: 2.2.3
- `pinia`: 2.3.1
- `vue`: 3.5.30
- `vue-router`: 4.6.4
- `vue-tsc`: 2.2.12

## Build Tools

- `vite`: 5.4.21
- `@vitejs/plugin-vue`: 5.2.4
- `bun`: 1.2.21
- `turbo`: 2.8.20

## Logging & Database

- `winston`: 3.19.0
- `lowdb`: 3.0.0

## Linting & Formatting

- `oxlint`: 0.7.0
- `oxfmt`: 0.1.0

## Testing

- `vitest`: 2.1.9
- `jest`: 29.7.0
- `ts-jest`: 29.1.1
- `jsdom`: 26.1.0
- `newman`: 5.3.2

## Other

- `stylus`: 0.57.0
- `@rushstack/eslint-patch`: 1.3.2
- `@vue/tsconfig`: 0.1.3
- `ts-node`: 10.9.1

## Notes

- Exact versions ensure reproducible builds across all environments
- When upgrading a dependency, update BOTH this file and the package.json files
- No semver ranges (`^`, `~`) are used to avoid version skew between environments
- This file serves as the single source of truth for dependency versions

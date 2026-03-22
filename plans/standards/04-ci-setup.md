# Project 4: CI/CD Pipeline Setup - GitHub Actions

> **Prerequisites**: Read [STANDARDS.md](../STANDARDS.md) first for context and status tracking. **Should complete [Project 3](./03-tooling-standardization.md) first** so lint/format scripts are ready.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Create GitHub Actions CI pipeline enforcing lint, format, typecheck, and tests |
| **Risk** | Low (CI is non-blocking, only provides feedback) |
| **Effort** | 2 hours |
| **Dependencies** | Project 3 (for lint/format scripts) |
| **Unlocks** | Automated quality gates on all PRs |

## Why This Matters

**Current state**: No CI pipeline exists
- Code quality not enforced
- Tests not run before merge
- Formatting inconsistencies not caught
- Type errors may slip through

**Target**: GitHub Actions with 4 parallel jobs:
1. **Format Check** - Verify code style with oxfmt
2. **Lint** - Run oxlint on all code
3. **Typecheck** - Verify TypeScript compilation
4. **Test** - Run vitest and bun test suites

Each job fails the PR if issues found.

## Files to Create

### 4.1 Create GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, feat/**, fix/**, refactor/**]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  format:
    name: Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install
      - name: Check formatting
        run: bun run format:check

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install
      - name: Run linter
        run: bun run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install
      - name: Check types
        run: bun run typecheck

  test:
    name: Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install
      - name: Run tests
        run: bun run test
      - name: Upload coverage (optional)
        if: always()
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [format, lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install
      - name: Build all apps
        run: bun run build
```

### 4.2 Create .github Directory Structure

If `.github/` doesn't exist, create it:

```
.github/
└── workflows/
    └── ci.yml
```

### 4.3 Update turbo.json for CI

**File**: `source/turbo.json`

Ensure scripts are defined and pipeline is set:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*.local"],
  "globalEnv": ["CI"],
  "pipeline": {
    "format:check": {
      "outputs": [],
      "cache": false
    },
    "lint": {
      "outputs": [],
      "cache": false
    },
    "typecheck": {
      "outputs": [],
      "cache": false
    },
    "test": {
      "outputs": ["coverage/**"],
      "cache": false
    },
    "build": {
      "outputs": ["dist/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 4.4 Add Branch Protection Rule (Optional but Recommended)

In GitHub repository settings:

**Settings > Branches > Branch protection rules**

- Create a rule for `main` branch:
  - ✅ Require status checks to pass before merging
  - Select: `format`, `lint`, `typecheck`, `test`, `build`
  - ✅ Require branches to be up to date before merging
  - ✅ Require code reviews (1 approval)

### 4.5 Verify Workflow Locally (Optional)

To test the workflow before pushing:

```bash
cd source

# Format check
bun run format:check

# Lint
bun run lint

# Typecheck
bun run typecheck

# Test
bun run test

# Build
bun run build
```

All should pass with no errors.

### 4.6 Push and Test

1. **Create a feature branch**:
   ```bash
   git checkout -b test/ci-workflow
   ```

2. **Make a small change** (e.g., add a comment):
   ```bash
   echo "// Test CI" >> source/apps/backend/src/index.ts
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "test: verify ci workflow"
   git push origin test/ci-workflow
   ```

4. **Open a PR** in GitHub
   - Workflow should automatically trigger
   - Watch the "Checks" section
   - All 5 jobs should complete (format, lint, typecheck, test, build)

5. **Verify each job**:
   - Click each job to see logs
   - Should see passing checks or useful error messages

## CI Job Details

### Format Check Job

```yaml
- name: Check formatting
  run: bun run format:check
```

- Runs `oxfmt --check` on all code
- Non-blocking but catches style issues
- Use `bun run format` locally to auto-fix

### Lint Job

```yaml
- name: Run linter
  run: bun run lint
```

- Runs `oxlint` on all code
- Catches common errors, unused variables, type issues
- Use `bun run lint:fix` to auto-fix some issues

### Typecheck Job

```yaml
- name: Check types
  run: bun run typecheck
```

- Runs `tsc --noEmit` via turbo (delegates to each app)
- Catches TypeScript compilation errors
- Critical for type safety

### Test Job

```yaml
- name: Run tests
  run: bun run test
```

- Runs all vitest suites (backend, panel)
- Runs bun tests (startup-v2)
- Fails if any test fails
- Coverage upload is optional (to codecov.io)

### Build Job

```yaml
- name: Build all apps
  run: bun run build
```

- Compiles all apps (`backend`, `panel`, `startup-v2`)
- Only runs after all other checks pass
- Final validation that code is production-ready

## Verification Checklist

- [x] `.github/workflows/ci.yml` exists and is valid YAML
- [x] `turbo.json` has pipeline configuration
- [x] `bun run format:check` passes locally
- [x] `bun run lint` passes locally
- [x] `bun run typecheck` passes locally
- [x] `bun run test` passes locally
- [x] `bun run build` succeeds locally
- [x] Push to feature branch triggers workflow
- [x] All 5 CI jobs pass in GitHub Actions
- [x] PR shows green checkmarks for all status checks

**Check workflow syntax**:
```bash
# Download actionlint (optional, to validate workflow locally)
brew install actionlint

# Validate workflow file
actionlint .github/workflows/ci.yml
```

## Files Created/Changed

| Action | Files |
|--------|-------|
| Create | `.github/workflows/ci.yml` |
| Edit (optional) | `source/turbo.json` - add pipeline config |

## Troubleshooting

### Workflow not triggering
- Verify branch name matches trigger rules (main, feat/**, fix/**)
- Check `.github/workflows/ci.yml` is on the branch you pushed

### Jobs failing with "command not found"
- Ensure `bun run format:check`, `bun run lint`, etc. exist in app package.json files
- Verify Project 3 (tooling) was completed

### Coverage upload fails
- Codecov is optional — remove that step if not needed
- Or create a codecov.com account and add token

### Turbo cache issues
- Add `--no-cache` flag to scripts if needed
- Or run `bun run clean && bun run build`

## Notes

- **Concurrency**: The workflow uses `concurrency` to cancel previous runs on new pushes (faster feedback)
- **Branch patterns**: Adjust `branches: [main, feat/**, ...]` to match your workflow
- **Status checks**: All 5 jobs must pass before merging (if branch protection enabled)
- **Logs**: View full job logs by clicking the job name in GitHub Actions tab
- **Performance**: All jobs run in parallel except `build` (waits for others)

## Next Steps

After CI is working:

1. Run Project 5 (Dependency Updates) to clean up unused packages
2. Merge all standards projects to `main`
3. Celebrate! Codebase is now at modern standards 🎉

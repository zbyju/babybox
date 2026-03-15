# Project 7: Build & Distribution

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Configure build process to create standalone binaries for all platforms |
| **Risk** | Low |
| **Effort** | 1 day |
| **Dependencies** | #6 CLI Presentation |
| **Unlocks** | Testing & Migration |

## Design Principles

1. **Self-contained** - Binaries include everything needed to run
2. **Cross-platform** - Build for Ubuntu, Windows, and macOS
3. **Reproducible** - Same source always produces same binary
4. **Versioned** - Binaries include version information

## Tasks

### 7.1 Build Scripts

#### package.json (updated scripts section)

```json
{
  "name": "babybox-startup",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/presentation/cli.ts",
    "dev:ubuntu": "bun --watch src/presentation/cli.ts -- --ubuntu",
    "dev:windows": "bun --watch src/presentation/cli.ts -- --windows",
    "dev:mac": "bun --watch src/presentation/cli.ts -- --mac",
    
    "build": "bun run build:all",
    "build:all": "bun run build:ubuntu && bun run build:windows && bun run build:mac",
    "build:ubuntu": "bun build src/presentation/cli.ts --compile --outfile dist/startup-ubuntu --target bun-linux-x64",
    "build:windows": "bun build src/presentation/cli.ts --compile --outfile dist/startup-windows.exe --target bun-windows-x64",
    "build:mac": "bun build src/presentation/cli.ts --compile --outfile dist/startup-mac --target bun-darwin-arm64",
    "build:mac-intel": "bun build src/presentation/cli.ts --compile --outfile dist/startup-mac-intel --target bun-darwin-x64",
    
    "check": "bun run typecheck && bun run lint && bun run format:check",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint .",
    "format": "bunx biome format --write .",
    "format:check": "bunx biome format .",
    
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    
    "clean": "rm -rf dist coverage"
  },
  "dependencies": {
    "neverthrow": "^7.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@biomejs/biome": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

### 7.2 Build Configuration

#### bunfig.toml

```toml
[install]
auto = "auto"

[build]
# Minify output for smaller binaries
minify = true

[test]
coverage = true
coverageDir = "./coverage"
timeout = 30000

[run]
# Enable source maps for better error messages
sourcemap = "external"
```

### 7.3 Version Management

#### src/version.ts

```typescript
/**
 * Version information.
 * Updated during release process.
 */

export const VERSION = "2.0.0";
export const BUILD_DATE = "2026-03-14";
export const GIT_COMMIT = process.env.GIT_COMMIT ?? "development";

export function getVersionInfo(): string {
  return `v${VERSION} (${BUILD_DATE}, ${GIT_COMMIT.slice(0, 7)})`;
}
```

### 7.4 Build Script for CI

#### scripts/build.sh

```bash
#!/bin/bash
set -e

# Build script for CI/CD
# Creates binaries for all platforms

cd "$(dirname "$0")/.."

echo "Building Babybox Startup..."
echo "Version: $(grep '"version"' package.json | head -1 | awk -F'"' '{print $4}')"

# Clean previous builds
echo "Cleaning..."
rm -rf dist
mkdir -p dist

# Get git commit for version info
export GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Build for all platforms
echo "Building for Ubuntu (Linux x64)..."
bun build src/presentation/cli.ts \
  --compile \
  --outfile dist/startup-ubuntu \
  --target bun-linux-x64 \
  --define "process.env.GIT_COMMIT='$GIT_COMMIT'"

echo "Building for Windows (x64)..."
bun build src/presentation/cli.ts \
  --compile \
  --outfile dist/startup-windows.exe \
  --target bun-windows-x64 \
  --define "process.env.GIT_COMMIT='$GIT_COMMIT'"

echo "Building for macOS (ARM64)..."
bun build src/presentation/cli.ts \
  --compile \
  --outfile dist/startup-mac \
  --target bun-darwin-arm64 \
  --define "process.env.GIT_COMMIT='$GIT_COMMIT'"

echo "Building for macOS (Intel x64)..."
bun build src/presentation/cli.ts \
  --compile \
  --outfile dist/startup-mac-intel \
  --target bun-darwin-x64 \
  --define "process.env.GIT_COMMIT='$GIT_COMMIT'"

# Make Unix binaries executable
chmod +x dist/startup-ubuntu dist/startup-mac dist/startup-mac-intel

# Show build results
echo ""
echo "Build complete!"
echo "Binaries:"
ls -lh dist/

# Create checksums
echo ""
echo "Creating checksums..."
cd dist
sha256sum startup-* > checksums.sha256 2>/dev/null || shasum -a 256 startup-* > checksums.sha256
cat checksums.sha256
```

### 7.5 Platform-Specific Startup Scripts

These scripts are used by the OS autostart mechanism to launch the compiled binary.

#### scripts/ubuntu/startup.sh

```bash
#!/bin/bash
# Babybox Startup Script for Ubuntu
# Placed in ~/.config/autostart/ or run manually

set -e

# Change to the script directory
cd "$(dirname "$0")"

# Path to the compiled binary
STARTUP_BIN="../../dist/startup-ubuntu"

# Fallback to source if binary doesn't exist
if [ ! -f "$STARTUP_BIN" ]; then
    echo "Binary not found, running from source..."
    cd ../..
    exec bun src/presentation/cli.ts --ubuntu
fi

# Run the compiled binary
exec "$STARTUP_BIN" --ubuntu
```

#### scripts/ubuntu/babybox.desktop

```ini
[Desktop Entry]
Type=Application
Name=Babybox Panel
Comment=Babybox monitoring panel startup
Exec=/home/babybox/babybox/source/apps/startup-v2/scripts/ubuntu/startup.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
```

#### scripts/windows/startup.bat

```batch
@echo off
REM Babybox Startup Script for Windows
REM Place shortcut in shell:startup folder

cd /d "%~dp0"

set STARTUP_BIN=..\..\dist\startup-windows.exe

if exist "%STARTUP_BIN%" (
    "%STARTUP_BIN%" --windows
) else (
    echo Binary not found, running from source...
    cd ..\..
    bun src/presentation/cli.ts --windows
)
```

#### scripts/windows/startup.ps1

```powershell
# Babybox Startup Script for Windows (PowerShell)
# Alternative to batch script

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$startupBin = "..\..\dist\startup-windows.exe"

if (Test-Path $startupBin) {
    & $startupBin --windows
} else {
    Write-Host "Binary not found, running from source..."
    Set-Location "..\..\"
    & bun src/presentation/cli.ts --windows
}
```

### 7.6 Docker Build (Optional)

For consistent cross-platform builds, use Docker.

#### Dockerfile.build

```dockerfile
# Multi-platform build container
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY src/ src/
COPY tsconfig.json ./

# Build for all platforms
RUN bun build src/presentation/cli.ts --compile --outfile dist/startup-ubuntu --target bun-linux-x64
RUN bun build src/presentation/cli.ts --compile --outfile dist/startup-windows.exe --target bun-windows-x64
RUN bun build src/presentation/cli.ts --compile --outfile dist/startup-mac --target bun-darwin-arm64

# Output stage - just the binaries
FROM scratch as binaries
COPY --from=builder /app/dist/ /
```

Build with:
```bash
# Build and extract binaries
docker build -f Dockerfile.build --target binaries -o ./dist .
```

### 7.7 GitHub Actions Workflow (Optional)

#### .github/workflows/build.yml

```yaml
name: Build Startup Binaries

on:
  push:
    tags:
      - 'startup-v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
        working-directory: source/apps/startup-v2
      
      - name: Run tests
        run: bun test
        working-directory: source/apps/startup-v2
      
      - name: Build binaries
        run: ./scripts/build.sh
        working-directory: source/apps/startup-v2
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: startup-binaries
          path: source/apps/startup-v2/dist/startup-*
```

### 7.8 Gitignore Updates

#### .gitignore (additions)

```gitignore
# Keep compiled binaries in git for easy deployment
# But ignore intermediate build files
!dist/startup-*
!dist/checksums.sha256
dist/*.js
dist/*.map

# Don't ignore the startup scripts
!scripts/
```

## Binary Distribution Strategy

The compiled binaries should be committed to the repository for easy deployment:

```
source/apps/startup-v2/
├── dist/
│   ├── startup-ubuntu          # ~50MB standalone binary
│   ├── startup-windows.exe     # ~50MB standalone binary
│   ├── startup-mac             # ~50MB standalone binary (ARM)
│   ├── startup-mac-intel       # ~50MB standalone binary (Intel)
│   └── checksums.sha256        # Verification checksums
├── scripts/
│   ├── ubuntu/
│   │   ├── startup.sh
│   │   └── babybox.desktop
│   └── windows/
│       ├── startup.bat
│       └── startup.ps1
└── ...
```

### Why Commit Binaries?

1. **Chicken-and-egg problem**: The startup app updates itself via git pull. If binaries aren't in git, it can't update the startup app.

2. **No build dependencies on production**: Production machines don't need Bun installed to run the startup app.

3. **Atomic updates**: Git pull brings both code and updated binary together.

4. **Rollback capability**: Git history includes previous working binaries.

### Size Considerations

- Each binary is ~50MB (Bun runtime bundled)
- Total ~200MB for all platforms
- Git LFS could be used if size becomes a problem
- Consider only committing production platform (Ubuntu) and building others on-demand

## Verification Checklist

- [ ] `bun run build` creates all binaries
- [ ] Ubuntu binary runs on Linux
- [ ] Windows binary runs on Windows
- [ ] macOS binary runs on Mac (ARM and Intel)
- [ ] Binaries show correct version with `--version`
- [ ] Startup scripts work on each platform
- [ ] Checksums match binaries

## Test Commands

```bash
# Build all
cd source/apps/startup-v2
bun run build

# Verify Ubuntu binary
./dist/startup-ubuntu --version
./dist/startup-ubuntu --help

# Test Ubuntu binary (dry run style)
./dist/startup-ubuntu --ubuntu 2>&1 | head -20

# Verify checksums
cd dist && sha256sum -c checksums.sha256
```

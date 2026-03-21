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
chmod +x dist/startup-ubuntu dist/startup-mac dist/startup-mac-intel 2>/dev/null || true

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

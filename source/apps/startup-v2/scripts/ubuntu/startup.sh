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

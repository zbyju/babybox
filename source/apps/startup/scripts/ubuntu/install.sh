#!/bin/bash
set -euo pipefail

STARTUP_DIR="$(cd -- "$(dirname -- "$0")/../.." && pwd)"
export npm_config_prefix="$HOME/.npm-global"
export PATH="$npm_config_prefix/bin:$PATH"
exec node "$STARTUP_DIR/fresh-install.js"

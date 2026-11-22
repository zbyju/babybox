#!/bin/bash
set -e
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
node install-workspace.js
node src/index.js --install --ubuntu

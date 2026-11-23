#!/bin/bash
set -e
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
node install-workspace.js
if [ -t 0 ] && command -v sudo >/dev/null && ! sudo -n true 2>/dev/null; then
  echo "Oprávnění správce umožní panelu připravit příjem SMTP na portu 25."
  sudo -v || true
fi
node src/index.js --install --ubuntu

#!/bin/bash
set -e

# Rollback script - reverts to old startup
# Use if migration causes issues

REPO_ROOT="/home/babybox/babybox"
AUTOSTART_FILE="$HOME/.config/autostart/babybox.desktop"

echo "=== Babybox Startup Rollback ==="
echo ""

# Find latest backup
LATEST_BACKUP=$(ls -t "${AUTOSTART_FILE}.backup."* 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backup found. Creating default old configuration..."
    cat > "$AUTOSTART_FILE" << 'EOF'
[Desktop Entry]
Type=Application
Name=Babybox Panel
Comment=Babybox monitoring panel startup
Exec=/home/babybox/babybox/source/apps/startup/scripts/ubuntu/startup.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF
else
    echo "Restoring from: $LATEST_BACKUP"
    cp "$LATEST_BACKUP" "$AUTOSTART_FILE"
fi

echo ""
echo "Current autostart configuration:"
grep "Exec=" "$AUTOSTART_FILE"

echo ""
echo "=== Rollback Complete ==="
echo ""
echo "Restart the machine or manually start the old startup:"
echo "  $REPO_ROOT/source/apps/startup/scripts/ubuntu/startup.sh"

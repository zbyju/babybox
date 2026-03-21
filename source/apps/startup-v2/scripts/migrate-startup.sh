#!/bin/bash
set -e

# Migration script for startup-v2
# Run this on each production machine to switch from old startup to new binary

REPO_ROOT="/home/babybox/babybox"
OLD_STARTUP="$REPO_ROOT/source/apps/startup"
NEW_STARTUP="$REPO_ROOT/source/apps/startup-v2"
AUTOSTART_FILE="$HOME/.config/autostart/babybox.desktop"

echo "=== Babybox Startup Migration ==="
echo "Repository: $REPO_ROOT"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if [ ! -f "$NEW_STARTUP/dist/startup-ubuntu" ]; then
    echo "ERROR: New startup binary not found at $NEW_STARTUP/dist/startup-ubuntu"
    echo "Run: cd $NEW_STARTUP && bun run build:ubuntu"
    exit 1
fi

if [ ! -x "$NEW_STARTUP/dist/startup-ubuntu" ]; then
    echo "Making binary executable..."
    chmod +x "$NEW_STARTUP/dist/startup-ubuntu"
fi

# Test new binary
echo "Testing new startup binary..."
if ! "$NEW_STARTUP/dist/startup-ubuntu" --version > /dev/null 2>&1; then
    echo "ERROR: New startup binary failed to run!"
    echo "Try rebuilding: cd $NEW_STARTUP && bun run build:ubuntu"
    exit 1
fi

echo "New binary works: $($NEW_STARTUP/dist/startup-ubuntu --version)"

# Backup current autostart
echo ""
echo "Backing up current autostart configuration..."
mkdir -p "$(dirname "$AUTOSTART_FILE")"
if [ -f "$AUTOSTART_FILE" ]; then
    BACKUP_FILE="${AUTOSTART_FILE}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$AUTOSTART_FILE" "$BACKUP_FILE"
    echo "Backed up to $BACKUP_FILE"
else
    echo "No existing autostart file found, creating new one."
fi

# Update autostart
echo ""
echo "Updating autostart configuration..."
cat > "$AUTOSTART_FILE" << 'EOF'
[Desktop Entry]
Type=Application
Name=Babybox Panel
Comment=Babybox monitoring panel startup
Exec=/home/babybox/babybox/source/apps/startup-v2/scripts/ubuntu/startup.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

echo "Autostart updated."

# Verify
echo ""
echo "Verifying configuration..."
grep "Exec=" "$AUTOSTART_FILE"

echo ""
echo "=== Migration Complete ==="
echo ""
echo "Next steps:"
echo "1. Stop current services:  pm2 stop all"
echo "2. Test new startup:       $NEW_STARTUP/dist/startup-ubuntu --ubuntu"
echo "3. Or reboot to test autostart"
echo ""
echo "To rollback:"
if [ -f "${AUTOSTART_FILE}.backup."* 2>/dev/null ]; then
    echo "  $NEW_STARTUP/scripts/rollback-startup.sh"
else
    echo "  cp ${AUTOSTART_FILE}.backup.* $AUTOSTART_FILE"
fi

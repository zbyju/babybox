#!/bin/bash

# Define a lock file path and log file path
LOCK_FILE="/var/restart_lock"
LOG_FILE="/var/log/internet_check.log"

# Function to write to the log
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Get the default gateway
GW_IP=$(ip route | grep default | awk '{print $3}')

# If lock file exists, check its age
if [ -f "$LOCK_FILE" ]; then
    # Get the current time and the file's modification time
    CURRENT_TIME=$(date +%s)
    FILE_TIME=$(stat -c %Y "$LOCK_FILE")

    # If less than 10 minutes (600 seconds) passed since last restart, just exit
    if [ $(($CURRENT_TIME - $FILE_TIME)) -lt 600 ]; then
        exit 0
    fi
fi

# First, ping the default gateway
ping -c 1 -W 2 $GW_IP > /dev/null 2>&1

# If ping to gateway failed, restart the computer
if [ $? -ne 0 ]; then
    log_message "Couldn't connect to the default gateway. Restarting the computer..."
    touch "$LOCK_FILE"  # Create or update the timestamp of the lock file
    sudo shutdown -r now
    exit 0
fi

# Host to ping for internet connectivity check (for example, Google's public DNS server)
HOST_TO_PING="8.8.8.8"

# Next, ping the host to check for internet connectivity
ping -c 1 -W 2 $HOST_TO_PING > /dev/null 2>&1

# If ping command failed, restart the computer
if [ $? -ne 0 ]; then
    log_message "No internet connection detected. Restarting the computer..."
    touch "$LOCK_FILE"  # Create or update the timestamp of the lock file
    sudo shutdown -r now
fi

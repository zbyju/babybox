#!/bin/bash

# Define a lock file path and log file path
LOCK_FILE="/var/restart_lock"
LOG_FILE="/var/log/internet_check.log"

# Function to write to the log
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check if this is Monday at 12:00 PM (scheduled weekly restart)
CURRENT_HOUR=$(date +%H)
CURRENT_MINUTE=$(date +%M)
CURRENT_DAY=$(date +%u)  # 1=Monday, 7=Sunday

# If it's Monday at 12:00 PM, force restart regardless of connectivity
if [ "$CURRENT_DAY" -eq 1 ] && [ "$CURRENT_HOUR" -eq 12 ] && [ "$CURRENT_MINUTE" -eq 0 ]; then
    log_message "Weekly scheduled restart - Monday 12:00 PM. Restarting the computer..."
    sudo touch "$LOCK_FILE"  # Create or update the timestamp of the lock file
    sudo shutdown -r now
    exit 0
fi

# Get the default gateway
GW_IP=$(ip route | grep default | awk '{print $3}')

# If lock file exists, check its age
if [ -f "$LOCK_FILE" ]; then
    # Get the current time and the file's modification time
    CURRENT_TIME=$(date +%s)
    FILE_TIME=$(stat -c %Y "$LOCK_FILE")

    # If less than 60 minutes passed since last restart, just exit
    if [ $(($CURRENT_TIME - $FILE_TIME)) -lt 3600 ]; then
        exit 0
    fi
fi

# Initialize a counter for successful ping attempts
SUCCESS_COUNT=0

# Loop to check connection 5 times with 5 seconds delay
for i in {1..5}; do
    ping -c 1 -W 2 $GW_IP > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        SUCCESS_COUNT=$(($SUCCESS_COUNT + 1))
        break # Exit the loop if there's a successful ping
    else
        sleep 5 # Wait for 5 seconds before next attempt
    fi
done

# If all pings failed (SUCCESS_COUNT is 0), restart the computer
if [ $SUCCESS_COUNT -eq 0 ]; then
    log_message "Couldn't connect to the default gateway after 5 attempts. Restarting the computer..."
    sudo touch "$LOCK_FILE"  # Create or update the timestamp of the lock file
    sudo shutdown -r now
    exit 0
fi

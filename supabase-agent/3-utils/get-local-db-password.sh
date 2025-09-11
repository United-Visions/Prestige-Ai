#!/bin/bash
# get-local-db-password.sh
# Securely retrieves the password for the local development database.

set -e

# Get the full status output
STATUS_OUTPUT=$(sh "$(dirname "$0")/../1-context/get-local-status.sh")

# Parse the output to extract the password
DB_URL=$(echo "$STATUS_OUTPUT" | grep 'DB URL' | awk '{print $3}')
PASSWORD=$(echo "$DB_URL" | awk -F'[:@]' '{print $3}')

if [ -z "$PASSWORD" ]; then
  echo "Error: Could not parse database password." >&2
  exit 1
fi

echo "$PASSWORD"

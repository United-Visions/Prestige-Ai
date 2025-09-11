#!/bin/bash
# /supabase-agent/3-utils/get-service-role-key.sh
# Securely retrieves the project's service_role key.

# This script checks for the key in the following order of priority:
# 1. An existing environment variable: SUPABASE_SERVICE_ROLE_KEY
# 2. A .env file in the project root.
# 3. The output of `supabase status` for the local development key.

set -e

# 1. Prioritize the secure environment variable (for production, CI/CD)
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "$SUPABASE_SERVICE_ROLE_KEY"
  exit 0
fi

# 2. Check for a .env file in the project root
if [ -f ".env" ]; then
  # Use grep to find the key, and cut to get the value
  SERVICE_KEY_FROM_ENV=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d '=' -f2-)
  if [ -n "$SERVICE_KEY_FROM_ENV" ]; then
    echo "$SERVICE_KEY_FROM_ENV"
    exit 0
  fi
fi

# 3. If still not found, fall back to the key for the LOCAL dev environment.
STATUS_OUTPUT=$(sh "$(dirname "$0")/../1-context/get-local-status.sh")
SERVICE_KEY_FROM_STATUS=$(echo "$STATUS_OUTPUT" | grep 'service_role key' | awk '{$1=$2=""; print $0}' | xargs)

if [ -z "$SERVICE_KEY_FROM_STATUS" ]; then
  echo "Error: Could not retrieve service_role key." >&2
  echo "To fix, either:" >&2
  echo "  - Set the SUPABASE_SERVICE_ROLE_KEY environment variable." >&2
  echo "  - Add SUPABASE_SERVICE_ROLE_KEY to a .env file in the root." >&2
  echo "  - Ensure 'supabase start' is running." >&2
  exit 1
fi

echo "$SERVICE_KEY_FROM_STATUS"

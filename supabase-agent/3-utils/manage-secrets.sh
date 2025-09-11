#!/bin/bash
# manage-secrets.sh
# Lists, sets, or unsets secrets for the Supabase project.

set -e

COMMAND=$1
SECRET_NAME=$2
SECRET_VALUE=$3

case "$COMMAND" in
  list)
    npx supabase secrets list
    ;;
  set)
    if [ -z "$SECRET_NAME" ] || [ -z "$SECRET_VALUE" ]; then
      echo "Error: Secret name and value are required for 'set'." >&2
      exit 1
    fi
    npx supabase secrets set "$SECRET_NAME=$SECRET_VALUE"
    ;;
  unset)
    if [ -z "$SECRET_NAME" ]; then
      echo "Error: Secret name is required for 'unset'." >&2
      exit 1
    fi
    npx supabase secrets unset "$SECRET_NAME"
    ;;
  *)
    echo "Error: Invalid command. Use 'list', 'set', or 'unset'." >&2
    exit 1
    ;;
esac

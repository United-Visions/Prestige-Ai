#!/bin/bash
# get-function-logs.sh
# Retrieves runtime logs for a specific deployed Edge Function.

set -e

FUNCTION_NAME=$1

if [ -z "$FUNCTION_NAME" ]; then
  echo "Error: Function name not provided." >&2
  exit 1
fi

npx supabase functions logs "$FUNCTION_NAME"

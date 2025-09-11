#!/bin/bash
# deploy-function.sh
# Deploys a specific Edge Function to the Supabase cloud.

set -e

FUNCTION_NAME=$1

if [ -z "$FUNCTION_NAME" ]; then
  echo "Error: Function name not provided." >&2
  exit 1
fi

npx supabase functions deploy "$FUNCTION_NAME"

echo "Function deployed successfully."

#!/bin/bash
# /supabase-agent/7-code-quality/create-feature-branch.sh
# Creates a new Git branch.

set -e

BRANCH_NAME=$1

if [ -z "$BRANCH_NAME" ]; then
  echo "Error: Branch name not provided." >&2
  exit 1
fi

# Sanitize branch name (simple version)
SANITIZED_NAME=$(echo "$BRANCH_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9\-]//g')

echo "Creating new branch: $SANITIZED_NAME"
git checkout -b "$SANITIZED_NAME"

echo "Switched to new branch '$SANITIZED_NAME'."

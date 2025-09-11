#!/bin/bash
# apply-migration.sh
# Creates and applies a new database migration.

set -e

MIGRATION_NAME=$1
SQL_CONTENT=$2

if [ -z "$MIGRATION_NAME" ]; then
  echo "Error: Migration name not provided." >&2
  exit 1
fi

if [ -z "$SQL_CONTENT" ]; then
  echo "Error: SQL content not provided." >&2
  exit 1
fi

# Create the new migration file
MIGRATION_PATH=$(npx supabase migration new "$MIGRATION_NAME" | grep -o 'supabase/migrations/.*\.sql')

# Check if migration file was created
if [ -z "$MIGRATION_PATH" ]; then
    echo "Error: Failed to create migration file." >&2
    exit 1
fi

# Write the SQL content to the new migration file
echo "$SQL_CONTENT" > "$MIGRATION_PATH"

# Apply the migration
npx supabase db push

echo "Migration applied successfully."

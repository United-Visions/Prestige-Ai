#!/bin/bash
# get-db-schema.sh
# Dumps the schema to a file and prints the path.

set -e

# Define the output file path
OUTPUT_FILE="supabase/schema.sql"

# Ensure the directory exists
mkdir -p supabase

# Execute the Supabase CLI command
npx supabase db dump --schema-only > "$OUTPUT_FILE"

# Print the absolute path to the output file
echo "$(pwd)/$OUTPUT_FILE"

#!/bin/bash
# get-db-types.sh
# Generates TS types and prints the path.

set -e

# Define the output file path
OUTPUT_FILE="src/types/supabase.ts"

# Ensure the directory exists
mkdir -p src/types

# Execute the Supabase CLI command
npx supabase gen types typescript --local > "$OUTPUT_FILE"

# Print the absolute path to the output file
echo "$(pwd)/$OUTPUT_FILE"

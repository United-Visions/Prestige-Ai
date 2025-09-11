#!/bin/bash
# /supabase-agent/5-data-management/revert-migration.sh
# Reverts the most recently applied local migration.

set -e

echo "Reverting last migration..."
npx supabase db revert

echo "Migration reverted successfully."

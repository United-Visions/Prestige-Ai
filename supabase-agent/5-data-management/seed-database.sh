#!/bin/bash
# /supabase-agent/5-data-management/seed-database.sh
# Resets the local database and applies the seed data from supabase/seed.sql.

set -e

echo "Seeding database..."
# The --recreate-db flag is often needed for a clean seed
npx supabase db reset --local
# The seed is automatically applied by `db reset`, but we can be explicit if needed.
# npx supabase db seed

echo "Database seeded successfully."

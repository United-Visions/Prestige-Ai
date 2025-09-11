#!/bin/bash
# /supabase-agent/4-testing/run-db-tests.sh
# Executes database tests using pg_prove.

set -e

echo "Running database tests..."
npx supabase test db

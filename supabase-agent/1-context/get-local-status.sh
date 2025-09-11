#!/bin/bash
# get-local-status.sh
# Runs `supabase status` and prints the output.

set -e

npx supabase status

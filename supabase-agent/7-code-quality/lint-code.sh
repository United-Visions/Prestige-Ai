#!/bin/bash
# /supabase-agent/7-code-quality/lint-code.sh
# Runs the project's linter and formatter.

set -e

echo "Linting and formatting code..."

if [ -f "package.json" ]; then
    # Assuming Prettier and ESLint with npm scripts
    npm run format
    npm run lint
else
    echo "No package.json found. Skipping linting."
fi

echo "Code quality checks completed."

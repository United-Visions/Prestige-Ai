#!/bin/bash
# execute-query.sh
# Executes a read-only SQL query against the local database.

set -e

QUERY_STRING=$1

if [ -z "$QUERY_STRING" ]; then
  echo "Error: Query string not provided." >&2
  exit 1
fi

# Get the database connection string
DB_URL=$(sh "$(dirname "$0")/../1-context/get-local-status.sh" | grep 'DB URL' | awk '{print $3}')

if [ -z "$DB_URL" ]; then
  echo "Error: Could not retrieve database URL." >&2
  exit 1
fi

# Create a temporary Node.js script to execute the query
cat > /tmp/exec_query.js << EOL
const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DB_URL });
  try {
    await client.connect();
    const res = await client.query(process.env.QUERY_STRING);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
EOL

# Ensure pg is installed
npm install pg --silent

# Execute the script with the necessary environment variables
DB_URL=$DB_URL QUERY_STRING="$QUERY_STRING" node /tmp/exec_query.js

# Clean up the temporary script
rm /tmp/exec_query.js

#!/bin/bash

# Script to fix all Rule 4 violations by replacing direct neon imports with getSql()

echo "Starting Rule 4 violation fixes..."

# Find all files with direct neon imports in app/api
files=$(grep -rl 'from "@neondatabase/serverless"' app/api)

for file in $files; do
  echo "Fixing $file..."
  
  # Replace the import line
  sed -i 's/import { neon } from "@neondatabase\/serverless"/import { getSql } from "@\/lib\/db"/g' "$file"
  
  # Replace singleton sql instance with function calls
  # Remove: const sql = neon(process.env.DATABASE_URL!)
  sed -i '/^const sql = neon(process\.env\.DATABASE_URL.*$/d' "$file"
  
  # Add await getSql() at the start of each handler function
  # This is more complex and might need manual review
  echo "  - Replaced import in $file (manual review needed for getSql() calls)"
done

echo "Done! Please review the changes and add 'const sql = await getSql()' to each handler function."

#!/bin/bash

# Script to run database migrations
# Usage: ./scripts/run-migration.sh <migration_file.sql>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[INFO] Running database migration...${NC}"

# Check if migration file is provided
if [ -z "$1" ]; then
    echo -e "${RED}[ERROR] Please provide a migration file${NC}"
    echo "Usage: ./scripts/run-migration.sh <migration_file.sql>"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}[ERROR] Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

# Load database credentials from .env.local
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Use DATABASE_URL if available, otherwise construct from individual variables
if [ -n "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
else
    DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PGHOST}/${POSTGRES_DATABASE}"
fi

echo -e "${YELLOW}[INFO] Executing migration: $MIGRATION_FILE${NC}"

# Run the migration
psql "$DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS] Migration completed successfully${NC}"
else
    echo -e "${RED}[ERROR] Migration failed${NC}"
    exit 1
fi

#!/bin/bash

# ============================================================
# Script to run database migrations
# Usage: ./scripts/run-migration.sh <migration_file.sql>
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         ISP System - Database Migration            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if migration file is provided
if [ -z "$1" ]; then
    print_error "Please provide a migration file"
    echo "Usage: ./scripts/run-migration.sh <migration_file.sql>"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# ============================================================
# Step 1: Fix file permissions before running migration
# ============================================================
print_info "Fixing file permissions..."

# Get the directory of the migration file
MIGRATION_DIR="$(dirname "$MIGRATION_FILE")"

# Fix directory permissions (make traversable)
chmod a+rx "$MIGRATION_DIR" 2>/dev/null || sudo chmod a+rx "$MIGRATION_DIR" 2>/dev/null || print_warning "Could not fix directory permissions"

# Fix file permissions (make readable)
chmod a+r "$MIGRATION_FILE" 2>/dev/null || sudo chmod a+r "$MIGRATION_FILE" 2>/dev/null || print_warning "Could not fix file permissions"

# Fix parent directories if needed
PARENT_DIR="$(dirname "$MIGRATION_DIR")"
while [[ "$PARENT_DIR" != "/" && "$PARENT_DIR" != "." ]]; do
    chmod a+x "$PARENT_DIR" 2>/dev/null || sudo chmod a+x "$PARENT_DIR" 2>/dev/null || true
    PARENT_DIR="$(dirname "$PARENT_DIR")"
done

print_info "Permissions fixed"

# ============================================================
# Step 2: Load database credentials
# ============================================================
print_info "Loading database configuration..."

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

# ============================================================
# Step 3: Copy to temp location if permission issues persist
# ============================================================
TEMP_DIR="/tmp/isp-migrations"
mkdir -p "$TEMP_DIR" 2>/dev/null || true
chmod 777 "$TEMP_DIR" 2>/dev/null || true

# Copy file to temp location for postgres user access
TEMP_FILE="$TEMP_DIR/$(basename "$MIGRATION_FILE")"
cp "$MIGRATION_FILE" "$TEMP_FILE" 2>/dev/null || true
chmod 644 "$TEMP_FILE" 2>/dev/null || true

# ============================================================
# Step 4: Run the migration
# ============================================================
print_info "Executing migration: $MIGRATION_FILE"
echo ""

# Try running from temp location first, fallback to original
if [ -f "$TEMP_FILE" ]; then
    psql "$DB_URL" -f "$TEMP_FILE"
    RESULT=$?
    # Clean up temp file
    rm -f "$TEMP_FILE" 2>/dev/null || true
else
    psql "$DB_URL" -f "$MIGRATION_FILE"
    RESULT=$?
fi

echo ""

if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Migration Completed Successfully!          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
else
    print_error "Migration failed"
    exit 1
fi

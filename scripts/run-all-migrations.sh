#!/bin/bash

# ============================================================
# ISP Management System - Run All Migrations
# ============================================================
# This script fixes permissions and runs all SQL migrations
# in the correct order.
#
# Usage: sudo bash scripts/run-all-migrations.sh
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     ISP System - Run All Database Migrations       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_header

# ============================================================
# Step 1: Detect directories
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_info "Script directory: $SCRIPT_DIR"
print_info "Project root: $PROJECT_ROOT"

# ============================================================
# Step 2: Fix ALL file permissions first
# ============================================================
print_info "Step 1: Fixing all file permissions..."

# Fix directory traversal
chmod a+rx "$SCRIPT_DIR" 2>/dev/null || sudo chmod a+rx "$SCRIPT_DIR" 2>/dev/null || true
chmod a+rx "$PROJECT_ROOT" 2>/dev/null || sudo chmod a+rx "$PROJECT_ROOT" 2>/dev/null || true

# Fix home directory if needed
HOME_DIR=$(dirname "$PROJECT_ROOT")
if [[ "$HOME_DIR" == /home/* ]]; then
    chmod a+x "$HOME_DIR" 2>/dev/null || sudo chmod a+x "$HOME_DIR" 2>/dev/null || true
fi

# Fix all SQL files
for sql_file in "$SCRIPT_DIR"/*.sql; do
    if [ -f "$sql_file" ]; then
        chmod a+r "$sql_file" 2>/dev/null || sudo chmod a+r "$sql_file" 2>/dev/null || true
    fi
done

# Fix all shell scripts
for sh_file in "$SCRIPT_DIR"/*.sh; do
    if [ -f "$sh_file" ]; then
        chmod a+rx "$sh_file" 2>/dev/null || sudo chmod a+rx "$sh_file" 2>/dev/null || true
    fi
done

print_success "File permissions fixed"

# ============================================================
# Step 3: Setup temp directory for migrations
# ============================================================
print_info "Step 2: Setting up temporary migration directory..."

TEMP_DIR="/tmp/isp-migrations"
mkdir -p "$TEMP_DIR"
chmod 777 "$TEMP_DIR"

# Copy all SQL files to temp directory for postgres access
cp "$SCRIPT_DIR"/*.sql "$TEMP_DIR/" 2>/dev/null || true
chmod 644 "$TEMP_DIR"/*.sql 2>/dev/null || true

print_success "Temporary directory ready: $TEMP_DIR"

# ============================================================
# Step 4: Load database configuration
# ============================================================
print_info "Step 3: Loading database configuration..."

cd "$PROJECT_ROOT"

# Load database credentials from .env.local
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    print_success "Loaded .env.local"
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_success "Loaded .env"
else
    print_error "No .env.local or .env file found!"
    exit 1
fi

# Use DATABASE_URL if available
if [ -n "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
else
    DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PGHOST}/${POSTGRES_DATABASE}"
fi

# ============================================================
# Step 5: Run migrations in order
# ============================================================
print_info "Step 4: Running migrations..."
echo ""

# Define migration order (critical tables first, then numbered migrations)
MIGRATIONS=(
    # Core schema migrations
    "000_complete_schema.sql"
    "001_initial_schema.sql"
    "001_create_core_tables.sql"
    "001_create_network_tables.sql"
    "002_create_customer_tables.sql"
    "002_create_network_tables.sql"
    "003_create_payment_tables.sql"
    "003_create_billing_accounting_tables.sql"
)

SUCCESS_COUNT=0
FAIL_COUNT=0
SKIPPED_COUNT=0

run_migration() {
    local file="$1"
    local temp_file="$TEMP_DIR/$file"
    local original_file="$SCRIPT_DIR/$file"
    
    # Prefer temp file, fallback to original
    if [ -f "$temp_file" ]; then
        migration_path="$temp_file"
    elif [ -f "$original_file" ]; then
        migration_path="$original_file"
    else
        return 1  # File not found
    fi
    
    echo -e "${YELLOW}Running: $file${NC}"
    
    if psql "$DB_URL" -f "$migration_path" 2>&1; then
        echo -e "${GREEN}  ✓ Success${NC}"
        return 0
    else
        echo -e "${RED}  ✗ Failed${NC}"
        return 1
    fi
}

# Run specified migrations
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$SCRIPT_DIR/$migration" ] || [ -f "$TEMP_DIR/$migration" ]; then
        if run_migration "$migration"; then
            ((SUCCESS_COUNT++))
        else
            ((FAIL_COUNT++))
        fi
    else
        ((SKIPPED_COUNT++))
    fi
done

# ============================================================
# Step 6: Run remaining numbered migrations
# ============================================================
print_info "Running additional numbered migrations..."

for sql_file in "$TEMP_DIR"/*.sql; do
    if [ -f "$sql_file" ]; then
        filename=$(basename "$sql_file")
        
        # Skip if already processed
        skip=false
        for processed in "${MIGRATIONS[@]}"; do
            if [ "$processed" == "$filename" ]; then
                skip=true
                break
            fi
        done
        
        if [ "$skip" = false ]; then
            if psql "$DB_URL" -f "$sql_file" 2>&1 | head -5; then
                ((SUCCESS_COUNT++))
            else
                ((FAIL_COUNT++))
            fi
        fi
    fi
done

# ============================================================
# Step 7: Cleanup
# ============================================================
print_info "Step 5: Cleaning up..."
rm -rf "$TEMP_DIR" 2>/dev/null || true

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║               Migration Summary                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
print_success "Successful migrations: $SUCCESS_COUNT"
if [ $FAIL_COUNT -gt 0 ]; then
    print_error "Failed migrations: $FAIL_COUNT"
fi
if [ $SKIPPED_COUNT -gt 0 ]; then
    print_warning "Skipped (not found): $SKIPPED_COUNT"
fi
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All migrations completed successfully!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some migrations failed. Check the output above for details.${NC}"
    exit 1
fi

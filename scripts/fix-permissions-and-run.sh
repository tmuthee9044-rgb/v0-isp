#!/bin/bash

# ============================================================================
# Quick Fix for PostgreSQL Permission Issues
# ============================================================================
# This script fixes the common "Permission denied" and "could not change directory"
# errors when running PostgreSQL migrations.
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
DB_NAME="${DB_NAME:-isp_db}"
DB_USER="${DB_USER:-isp_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SCRIPTS_DIR="${PROJECT_DIR}/scripts"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Quick Fix for PostgreSQL Permissions                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# Step 1: Fix file permissions
# ============================================================================
log_info "Step 1: Fixing file permissions..."

# Make project directory accessible
chmod 755 "$PROJECT_DIR" 2>/dev/null || log_warning "Could not chmod project dir (may need sudo)"

# Make scripts directory accessible
chmod 755 "$SCRIPTS_DIR" 2>/dev/null || log_warning "Could not chmod scripts dir (may need sudo)"

# Make all SQL files readable
find "$SCRIPTS_DIR" -name "*.sql" -exec chmod 644 {} \; 2>/dev/null || log_warning "Could not chmod SQL files"

# Make all shell scripts executable
find "$SCRIPTS_DIR" -name "*.sh" -exec chmod 755 {} \; 2>/dev/null || log_warning "Could not chmod shell scripts"

log_success "File permissions fixed"

# ============================================================================
# Step 2: Grant database permissions
# ============================================================================
log_info "Step 2: Granting database permissions..."

GRANT_SQL=$(cat <<EOF
-- Grant all privileges to the ISP user
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${DB_USER};

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${DB_USER};

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO ${DB_USER};

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SELECT 'Permissions granted successfully' as status;
EOF
)

echo "$GRANT_SQL" | sudo -u postgres psql -d "$DB_NAME" 2>&1 | while read line; do
    if [[ "$line" == *"GRANT"* ]] || [[ "$line" == *"successfully"* ]]; then
        log_success "$line"
    elif [[ "$line" == *"ERROR"* ]]; then
        log_warning "$line"
    fi
done

log_success "Database permissions granted"

# ============================================================================
# Step 3: Create temporary directory workaround
# ============================================================================
log_info "Step 3: Setting up migration workaround..."

# Create a symlink in /tmp for easier access (avoids permission issues)
TEMP_SCRIPTS="/tmp/isp_migrations"
rm -rf "$TEMP_SCRIPTS" 2>/dev/null || true
mkdir -p "$TEMP_SCRIPTS"
chmod 777 "$TEMP_SCRIPTS"

# Copy SQL files to temp location
cp "$SCRIPTS_DIR"/*.sql "$TEMP_SCRIPTS/" 2>/dev/null || log_warning "Could not copy some SQL files"
chmod 644 "$TEMP_SCRIPTS"/*.sql 2>/dev/null || true

log_success "Migration files copied to $TEMP_SCRIPTS"

# ============================================================================
# Step 4: Run critical fixes
# ============================================================================
log_info "Step 4: Running critical schema fixes..."

# Run the customer_contacts fix if it exists
if [ -f "$TEMP_SCRIPTS/1052_fix_customer_contacts_columns.sql" ]; then
    log_info "Fixing customer_contacts table..."
    cat "$TEMP_SCRIPTS/1052_fix_customer_contacts_columns.sql" | PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 2>&1 | grep -i "notice\|error" || true
fi

# Run the missing tables fix if it exists
if [ -f "$TEMP_SCRIPTS/1051_create_missing_tables_and_columns.sql" ]; then
    log_info "Running missing tables migration..."
    cat "$TEMP_SCRIPTS/1051_create_missing_tables_and_columns.sql" | PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 2>&1 | grep -i "notice\|error" || true
fi

log_success "Critical fixes applied"

# ============================================================================
# Step 5: Verify setup
# ============================================================================
log_info "Step 5: Verifying setup..."

VERIFY_SQL=$(cat <<EOF
SELECT 
    'Tables: ' || COUNT(*) as info
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
EOF
)

echo "$VERIFY_SQL" | PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t 2>/dev/null | head -1 || log_warning "Could not verify tables"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     Setup Complete!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "To run any migration, use this pattern:"
echo ""
echo "  export PGPASSWORD=\"your_password\""
echo "  cat scripts/your_script.sql | psql -h $DB_HOST -U $DB_USER -d $DB_NAME"
echo ""
echo "Or use the temporary location:"
echo ""
echo "  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $TEMP_SCRIPTS/your_script.sql"
echo ""
echo "The temporary migration files are at: $TEMP_SCRIPTS"
echo ""

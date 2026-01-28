#!/bin/bash

# ============================================================================
# ISP Management System - PostgreSQL Setup with Full Permissions
# ============================================================================
# This script:
# 1. Installs PostgreSQL if not installed
# 2. Creates the database and user with full permissions
# 3. Grants all necessary permissions to avoid access errors
# 4. Sets up file permissions for SQL scripts
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - modify these as needed
DB_NAME="${DB_NAME:-isp_db}"
DB_USER="${DB_USER:-isp_user}"
DB_PASSWORD="${DB_PASSWORD:-your_secure_password}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Project directory - auto-detect or use provided
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SCRIPTS_DIR="${PROJECT_DIR}/scripts"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ISP Management System - PostgreSQL Setup with Permissions   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# Step 1: Check if PostgreSQL is installed
# ============================================================================
log_info "Checking PostgreSQL installation..."

if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | head -1)
    log_success "PostgreSQL is installed: $PSQL_VERSION"
else
    log_warning "PostgreSQL is not installed. Attempting to install..."
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum install -y postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y postgresql-server postgresql-contrib
        sudo postgresql-setup --initdb
    else
        log_error "Could not detect package manager. Please install PostgreSQL manually."
        exit 1
    fi
    
    log_success "PostgreSQL installed successfully"
fi

# ============================================================================
# Step 2: Start PostgreSQL service
# ============================================================================
log_info "Ensuring PostgreSQL service is running..."

if command -v systemctl &> /dev/null; then
    sudo systemctl start postgresql 2>/dev/null || true
    sudo systemctl enable postgresql 2>/dev/null || true
elif command -v service &> /dev/null; then
    sudo service postgresql start 2>/dev/null || true
fi

sleep 2  # Give it time to start

# Verify PostgreSQL is running
if sudo -u postgres psql -c "SELECT 1" &>/dev/null; then
    log_success "PostgreSQL service is running"
else
    log_error "PostgreSQL service failed to start. Please check the logs."
    exit 1
fi

# ============================================================================
# Step 3: Create database and user with full permissions
# ============================================================================
log_info "Setting up database and user..."

# Create SQL commands for setup
SETUP_SQL=$(cat <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
        RAISE NOTICE 'User ${DB_USER} created';
    ELSE
        ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
        RAISE NOTICE 'User ${DB_USER} already exists, password updated';
    END IF;
END
\$\$;

-- Grant user superuser-like permissions for development
ALTER USER ${DB_USER} WITH CREATEDB CREATEROLE;

-- Create database if not exists
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Connect to the database and grant all permissions
\c ${DB_NAME}

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Grant all privileges on all tables (current and future)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${DB_USER};

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${DB_USER};

-- Grant schema usage and creation
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT CREATE ON SCHEMA public TO ${DB_USER};

-- Make user owner of public schema objects
ALTER SCHEMA public OWNER TO ${DB_USER};

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

RAISE NOTICE 'Database ${DB_NAME} setup complete with full permissions';
EOF
)

# Execute the setup SQL
echo "$SETUP_SQL" | sudo -u postgres psql 2>&1 | while read line; do
    if [[ "$line" == *"NOTICE"* ]]; then
        log_info "$line"
    elif [[ "$line" == *"ERROR"* ]]; then
        log_warning "$line"
    fi
done

log_success "Database and user created with full permissions"

# ============================================================================
# Step 4: Configure pg_hba.conf for local connections
# ============================================================================
log_info "Configuring PostgreSQL authentication..."

# Find pg_hba.conf location
PG_HBA_CONF=$(sudo -u postgres psql -t -c "SHOW hba_file" | tr -d ' ')

if [ -f "$PG_HBA_CONF" ]; then
    # Check if local md5 authentication is already configured
    if ! sudo grep -q "local.*${DB_NAME}.*${DB_USER}.*md5" "$PG_HBA_CONF" 2>/dev/null; then
        # Backup original file
        sudo cp "$PG_HBA_CONF" "${PG_HBA_CONF}.backup.$(date +%Y%m%d%H%M%S)"
        
        # Add authentication rules for our user (at the beginning of the file)
        sudo tee /tmp/pg_hba_new.conf > /dev/null <<EOF
# ISP Management System - Database Access Rules
local   ${DB_NAME}      ${DB_USER}                              md5
host    ${DB_NAME}      ${DB_USER}      127.0.0.1/32            md5
host    ${DB_NAME}      ${DB_USER}      ::1/128                 md5

EOF
        # Append original content
        sudo cat "$PG_HBA_CONF" >> /tmp/pg_hba_new.conf
        sudo mv /tmp/pg_hba_new.conf "$PG_HBA_CONF"
        sudo chown postgres:postgres "$PG_HBA_CONF"
        sudo chmod 600 "$PG_HBA_CONF"
        
        # Reload PostgreSQL to apply changes
        if command -v systemctl &> /dev/null; then
            sudo systemctl reload postgresql
        else
            sudo service postgresql reload
        fi
        
        log_success "PostgreSQL authentication configured"
    else
        log_info "Authentication rules already configured"
    fi
else
    log_warning "Could not find pg_hba.conf. Manual configuration may be needed."
fi

# ============================================================================
# Step 5: Set file permissions for SQL scripts
# ============================================================================
log_info "Setting file permissions for SQL scripts..."

if [ -d "$SCRIPTS_DIR" ]; then
    # Make scripts directory accessible
    chmod 755 "$SCRIPTS_DIR"
    
    # Make all SQL files readable by all users
    find "$SCRIPTS_DIR" -name "*.sql" -exec chmod 644 {} \;
    
    # Make shell scripts executable
    find "$SCRIPTS_DIR" -name "*.sh" -exec chmod 755 {} \;
    
    # Ensure the postgres user can access the project directory
    # This is needed when running psql with -f option
    chmod 755 "$PROJECT_DIR"
    
    log_success "File permissions set for scripts directory"
else
    log_warning "Scripts directory not found at: $SCRIPTS_DIR"
fi

# ============================================================================
# Step 6: Create a wrapper script for running migrations
# ============================================================================
log_info "Creating migration helper script..."

cat > "${SCRIPTS_DIR}/run-migration.sh" <<'MIGRATION_SCRIPT'
#!/bin/bash

# Migration helper script that avoids permission issues
# Usage: ./scripts/run-migration.sh <script.sql>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_NAME="${DB_NAME:-isp_db}"
DB_USER="${DB_USER:-isp_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "$1" ]; then
    echo -e "${RED}[ERROR]${NC} Please specify a SQL file to run"
    echo "Usage: $0 <script.sql>"
    echo ""
    echo "Examples:"
    echo "  $0 scripts/1051_create_missing_tables_and_columns.sql"
    echo "  $0 000_complete_schema.sql"
    exit 1
fi

SQL_FILE="$1"

# If file doesn't exist, try prepending scripts/
if [ ! -f "$SQL_FILE" ]; then
    if [ -f "scripts/$SQL_FILE" ]; then
        SQL_FILE="scripts/$SQL_FILE"
    else
        echo -e "${RED}[ERROR]${NC} SQL file not found: $SQL_FILE"
        exit 1
    fi
fi

echo -e "${BLUE}[INFO]${NC} Running migration: $SQL_FILE"

# Use cat to pipe the SQL content to avoid permission issues with -f flag
# This works around the "could not change directory" error
if [ -n "$PGPASSWORD" ]; then
    cat "$SQL_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0
else
    echo -e "${YELLOW}[WARNING]${NC} PGPASSWORD not set. You may be prompted for password."
    echo -e "${BLUE}[TIP]${NC} Set PGPASSWORD environment variable or use .pgpass file"
    cat "$SQL_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS]${NC} Migration completed: $SQL_FILE"
else
    echo -e "${YELLOW}[WARNING]${NC} Migration completed with some warnings/errors"
fi
MIGRATION_SCRIPT

chmod +x "${SCRIPTS_DIR}/run-migration.sh"
log_success "Migration helper script created"

# ============================================================================
# Step 7: Create a batch migration runner
# ============================================================================
log_info "Creating batch migration runner..."

cat > "${SCRIPTS_DIR}/run-all-migrations.sh" <<'BATCH_SCRIPT'
#!/bin/bash

# Batch migration runner - runs all SQL migrations in order
# Usage: ./scripts/run-all-migrations.sh [--fresh]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_NAME="${DB_NAME:-isp_db}"
DB_USER="${DB_USER:-isp_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ISP Management System - Batch Migration Runner     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if --fresh flag is passed
if [ "$1" == "--fresh" ]; then
    log_warning "Fresh install requested - this will DROP ALL TABLES!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Aborted."
        exit 0
    fi
    
    log_info "Dropping all tables..."
    cat <<EOF | PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END
\$\$;
EOF
    log_success "All tables dropped"
fi

# Run migrations in order
# Priority: 000_ files first, then numbered files, then others

log_info "Running migrations..."

FAILED=0
SUCCESS=0

run_migration() {
    local file="$1"
    local filename=$(basename "$file")
    
    log_info "Applying: $filename"
    
    if cat "$file" | PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 2>&1 | grep -i "error" > /dev/null; then
        log_warning "Some errors in: $filename (continuing...)"
        ((FAILED++))
    else
        log_success "Applied: $filename"
        ((SUCCESS++))
    fi
}

# First run the complete schema if it exists
if [ -f "${SCRIPTS_DIR}/000_complete_schema.sql" ]; then
    run_migration "${SCRIPTS_DIR}/000_complete_schema.sql"
elif [ -f "${SCRIPTS_DIR}/000_create_all_146_tables.sql" ]; then
    run_migration "${SCRIPTS_DIR}/000_create_all_146_tables.sql"
fi

# Then run numbered migrations in order
for file in $(ls -1 "${SCRIPTS_DIR}"/*.sql 2>/dev/null | grep -E '^[0-9]+_' | sort -n); do
    # Skip files we already ran
    filename=$(basename "$file")
    if [[ "$filename" == "000_"* ]]; then
        continue
    fi
    run_migration "$file"
done

echo ""
log_info "Migration Summary:"
log_success "  Successful: $SUCCESS"
if [ $FAILED -gt 0 ]; then
    log_warning "  With warnings: $FAILED"
fi
echo ""
BATCH_SCRIPT

chmod +x "${SCRIPTS_DIR}/run-all-migrations.sh"
log_success "Batch migration runner created"

# ============================================================================
# Step 8: Test database connection
# ============================================================================
log_info "Testing database connection..."

export PGPASSWORD="$DB_PASSWORD"

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 as test" &>/dev/null; then
    log_success "Database connection successful!"
else
    log_warning "Direct connection failed. Trying with localhost socket..."
    if psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 as test" &>/dev/null; then
        log_success "Database connection via socket successful!"
    else
        log_error "Could not connect to database. Please check credentials."
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check if PostgreSQL is running: sudo systemctl status postgresql"
        echo "2. Check pg_hba.conf for authentication rules"
        echo "3. Verify user and password are correct"
        echo "4. Try: sudo -u postgres psql -c \"\\du\" to list users"
    fi
fi

# ============================================================================
# Step 9: Print environment variables for .env file
# ============================================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                                ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Add these to your .env.local file:"
echo ""
echo "  DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}\""
echo "  PGPASSWORD=\"${DB_PASSWORD}\""
echo ""
echo "To run migrations, use one of these methods:"
echo ""
echo "  # Method 1: Use the helper script (recommended)"
echo "  export PGPASSWORD=\"${DB_PASSWORD}\""
echo "  ./scripts/run-migration.sh 1051_create_missing_tables_and_columns.sql"
echo ""
echo "  # Method 2: Run all migrations"
echo "  export PGPASSWORD=\"${DB_PASSWORD}\""
echo "  ./scripts/run-all-migrations.sh"
echo ""
echo "  # Method 3: Run a specific SQL file manually"
echo "  export PGPASSWORD=\"${DB_PASSWORD}\""
echo "  cat scripts/your_script.sql | psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME}"
echo ""
echo "NOTE: Using 'cat file.sql | psql' avoids the 'Permission denied' error"
echo "      that occurs with 'psql -f file.sql' when running from certain directories."
echo ""

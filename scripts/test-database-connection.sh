#!/bin/bash

# Database Connection Test Script
# Tests offline PostgreSQL database connectivity and operations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[TEST]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_error() { echo -e "${RED}[FAIL]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "========================================"
echo "Database Connection Test"
echo "========================================"
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
    source .env.local
    print_success "Loaded .env.local"
else
    print_error ".env.local not found"
    exit 1
fi

# Extract database credentials
DB_USER=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $4}')
DB_PASS=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $5}')
DB_HOST=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $6}')
DB_PORT=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $7}')
DB_NAME=$(echo "$DATABASE_URL" | awk -F'[/:@?]' '{print $8}')

print_info "Database: $DB_NAME"
print_info "User: $DB_USER"
print_info "Host: $DB_HOST:$DB_PORT"
echo ""

# Test 1: PostgreSQL service
print_info "Test 1: Checking PostgreSQL service..."
if systemctl is-active --quiet postgresql 2>/dev/null || pgrep -x postgres > /dev/null; then
    print_success "PostgreSQL service is running"
else
    print_error "PostgreSQL service is not running"
    print_info "Start it with: sudo systemctl start postgresql"
    exit 1
fi

# Test 2: Database connection
print_info "Test 2: Testing database connection..."
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Cannot connect to database"
    print_info "Check credentials in .env.local"
    exit 1
fi

# Test 3: Check tables exist
print_info "Test 3: Checking required tables..."
REQUIRED_TABLES=(
    "customers" "service_plans" "customer_services" "payments" 
    "invoices" "network_devices" "ip_addresses" "employees" 
    "payroll" "leave_requests" "activity_logs" "schema_migrations"
)

MISSING_TABLES=()
for table in "${REQUIRED_TABLES[@]}"; do
    if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | grep -q "t"; then
        echo "  ✓ $table"
    else
        echo "  ✗ $table (missing)"
        MISSING_TABLES+=("$table")
    fi
done

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    print_success "All 12 required tables exist"
else
    print_error "Missing ${#MISSING_TABLES[@]} tables: ${MISSING_TABLES[*]}"
    print_info "Run: ./install.sh --fix-db"
    exit 1
fi

# Test 4: Test CRUD operations
print_info "Test 4: Testing database operations..."

# INSERT
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO activity_logs (action, entity_type, details) VALUES ('connection_test', 'system', '{\"test\": true}') RETURNING id;" > /dev/null 2>&1; then
    print_success "INSERT operation works"
else
    print_error "INSERT operation failed"
    exit 1
fi

# SELECT
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM activity_logs WHERE action = 'connection_test';" > /dev/null 2>&1; then
    print_success "SELECT operation works"
else
    print_error "SELECT operation failed"
    exit 1
fi

# UPDATE
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "UPDATE activity_logs SET details = '{\"test\": true, \"verified\": true}' WHERE action = 'connection_test';" > /dev/null 2>&1; then
    print_success "UPDATE operation works"
else
    print_error "UPDATE operation failed"
    exit 1
fi

# DELETE
if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM activity_logs WHERE action = 'connection_test';" > /dev/null 2>&1; then
    print_success "DELETE operation works"
else
    print_error "DELETE operation failed"
    exit 1
fi

# Test 5: Check neon-wrapper detection
print_info "Test 5: Checking neon-wrapper configuration..."
if echo "$DATABASE_URL" | grep -q "localhost\|127.0.0.1"; then
    print_success "Configured for local PostgreSQL (correct)"
else
    print_warning "DATABASE_URL points to cloud database"
    print_info "For offline operation, use: postgresql://user:pass@localhost:5432/dbname"
fi

echo ""
echo "========================================"
print_success "All database tests passed!"
echo "========================================"
echo ""
print_info "Database is ready for use"
print_info "Start the application with: npm run dev"
echo ""

#!/bin/bash

# ISP Management System - System Health Check Script
# This script verifies all prerequisites, database setup, and system functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Function to print colored output
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

print_fail() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

print_warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
    CHECKS_WARNING=$((CHECKS_WARNING + 1))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_solution() {
    echo -e "${YELLOW}[SOLUTION]${NC} $1"
}

# Check if we're in the project directory
check_project_directory() {
    print_header "Checking Project Directory"
    
    print_check "Verifying project files..."
    
    if [ ! -f "package.json" ]; then
        print_fail "package.json not found"
        print_solution "Navigate to the project directory: cd /path/to/isp-system"
        return 1
    fi
    
    print_pass "package.json found"
    
    if [ ! -f "next.config.mjs" ]; then
        print_warning "next.config.mjs not found (may be optional)"
    else
        print_pass "next.config.mjs found"
    fi
    
    if [ ! -d "app" ]; then
        print_fail "app directory not found"
        print_solution "This doesn't appear to be a Next.js project directory"
        return 1
    fi
    
    print_pass "app directory found"
    
    return 0
}

# Check Node.js installation
check_nodejs() {
    print_header "Checking Node.js"
    
    print_check "Checking if Node.js is installed..."
    
    if ! command -v node &> /dev/null; then
        print_fail "Node.js is not installed"
        print_solution "Install Node.js 18+ from: https://nodejs.org/"
        print_solution "Or run: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
        return 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    print_pass "Node.js is installed: v$NODE_VERSION"
    
    if [[ $MAJOR_VERSION -lt 18 ]]; then
        print_fail "Node.js version is too old (need 18+)"
        print_solution "Upgrade Node.js: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
        return 1
    fi
    
    print_pass "Node.js version is compatible (18+)"
    
    # Check npm
    print_check "Checking npm..."
    
    if ! command -v npm &> /dev/null; then
        print_fail "npm is not installed"
        print_solution "npm should come with Node.js. Reinstall Node.js"
        return 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_pass "npm is installed: v$NPM_VERSION"
    
    return 0
}

# Check PostgreSQL installation
check_postgresql() {
    print_header "Checking PostgreSQL"
    
    print_check "Checking if PostgreSQL is installed..."
    
    if ! command -v psql &> /dev/null; then
        print_fail "PostgreSQL is not installed"
        print_solution "Install PostgreSQL: sudo apt update && sudo apt install -y postgresql postgresql-contrib"
        return 1
    fi
    
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    print_pass "PostgreSQL is installed: v$PSQL_VERSION"
    
    # Check if PostgreSQL service is running
    print_check "Checking if PostgreSQL service is running..."
    
    if systemctl is-active --quiet postgresql; then
        print_pass "PostgreSQL service is running"
    else
        print_fail "PostgreSQL service is not running"
        print_solution "Start PostgreSQL: sudo systemctl start postgresql"
        print_solution "Enable on boot: sudo systemctl enable postgresql"
        return 1
    fi
    
    return 0
}

# Check database existence and connection
check_database() {
    print_header "Checking Database"
    
    # Check for .env.local file
    print_check "Checking for environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        print_fail ".env.local file not found"
        print_solution "Run the installation script: ./install.sh"
        return 1
    fi
    
    print_pass ".env.local file exists"
    
    # Extract database credentials
    if grep -q "DATABASE_URL" .env.local; then
        print_pass "DATABASE_URL found in .env.local"
        
        # Extract database name from connection string
        DB_URL=$(grep DATABASE_URL .env.local | cut -d'=' -f2 | tr -d '"')
        DB_NAME=$(echo $DB_URL | sed 's/.*\/$$[^?]*$$$/\1/')
        DB_USER=$(echo $DB_URL | sed 's/.*:\/\/$$[^:]*$$:.*/\1/')
        
        print_info "Database: $DB_NAME"
        print_info "User: $DB_USER"
    else
        print_fail "DATABASE_URL not found in .env.local"
        print_solution "Run the installation script: ./install.sh"
        return 1
    fi
    
    # Check if database exists
    print_check "Checking if database exists..."
    
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_pass "Database '$DB_NAME' exists"
    else
        print_fail "Database '$DB_NAME' does not exist"
        print_solution "Run the installation script: ./install.sh"
        return 1
    fi
    
    # Test database connection
    print_check "Testing database connection..."
    
    export $(grep DATABASE_URL .env.local | xargs)
    
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        print_pass "Database connection successful"
    else
        print_fail "Cannot connect to database"
        print_solution "Check database credentials in .env.local"
        print_solution "Ensure PostgreSQL is running: sudo systemctl status postgresql"
        return 1
    fi
    
    return 0
}

# Check database tables
check_database_tables() {
    print_header "Checking Database Tables"
    
    export $(grep DATABASE_URL .env.local | xargs)
    
    # List of required tables
    REQUIRED_TABLES=(
        "users"
        "customers"
        "service_plans"
        "customer_services"
        "payments"
        "invoices"
        "support_tickets"
        "employees"
        "network_devices"
        "ip_addresses"
        "subnets"
        "system_config"
    )
    
    print_check "Checking for required tables..."
    
    MISSING_TABLES=0
    
    for table in "${REQUIRED_TABLES[@]}"; do
        if psql "$DATABASE_URL" -c "\dt $table" 2>/dev/null | grep -q "$table"; then
            print_pass "Table '$table' exists"
        else
            print_fail "Table '$table' is missing"
            MISSING_TABLES=$((MISSING_TABLES + 1))
        fi
    done
    
    if [ $MISSING_TABLES -gt 0 ]; then
        print_fail "$MISSING_TABLES required tables are missing"
        print_solution "Run database migrations: sudo -u postgres psql -d isp_system -f scripts/complete-database-setup.sql"
        return 1
    fi
    
    print_pass "All required tables exist"
    
    # Check table row counts
    print_check "Checking table data..."
    
    USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
    CONFIG_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM system_config;" 2>/dev/null | xargs)
    PLAN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM service_plans;" 2>/dev/null | xargs)
    
    print_info "Users: $USER_COUNT"
    print_info "System configs: $CONFIG_COUNT"
    print_info "Service plans: $PLAN_COUNT"
    
    if [ "$USER_COUNT" -eq 0 ]; then
        print_warning "No users found in database"
        print_solution "Run database setup: sudo -u postgres psql -d isp_system -f scripts/complete-database-setup.sql"
    fi
    
    return 0
}

# Check project dependencies
check_dependencies() {
    print_header "Checking Project Dependencies"
    
    print_check "Checking if node_modules exists..."
    
    if [ ! -d "node_modules" ]; then
        print_fail "node_modules directory not found"
        print_solution "Install dependencies: npm install"
        return 1
    fi
    
    print_pass "node_modules directory exists"
    
    # Check for key dependencies
    print_check "Checking key dependencies..."
    
    KEY_DEPS=("next" "react" "react-dom" "pg" "@neondatabase/serverless")
    
    for dep in "${KEY_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            print_pass "$dep is installed"
        else
            print_fail "$dep is missing"
            print_solution "Install dependencies: npm install"
            return 1
        fi
    done
    
    return 0
}

# Check environment variables
check_environment_variables() {
    print_header "Checking Environment Variables"
    
    if [ ! -f ".env.local" ]; then
        print_fail ".env.local file not found"
        print_solution "Run the installation script: ./install.sh"
        return 1
    fi
    
    REQUIRED_VARS=(
        "DATABASE_URL"
        "POSTGRES_URL"
        "NEXT_PUBLIC_APP_URL"
    )
    
    print_check "Checking required environment variables..."
    
    MISSING_VARS=0
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env.local; then
            print_pass "$var is set"
        else
            print_fail "$var is missing"
            MISSING_VARS=$((MISSING_VARS + 1))
        fi
    done
    
    if [ $MISSING_VARS -gt 0 ]; then
        print_fail "$MISSING_VARS required environment variables are missing"
        print_solution "Run the installation script: ./install.sh"
        return 1
    fi
    
    return 0
}

# Check if application can build
check_application_build() {
    print_header "Checking Application Build"
    
    print_check "Attempting to build the application..."
    print_info "This may take a few minutes..."
    
    if npm run build &> /tmp/build-check.log; then
        print_pass "Application builds successfully"
        
        if [ -d ".next" ]; then
            print_pass ".next build directory created"
        fi
        
        return 0
    else
        print_fail "Application build failed"
        print_info "Build errors:"
        tail -20 /tmp/build-check.log | while read line; do
            echo "  $line"
        done
        print_solution "Check the full build log: cat /tmp/build-check.log"
        print_solution "Fix any TypeScript or build errors in your code"
        return 1
    fi
}

# Check if server can start
check_server_start() {
    print_header "Checking Server Startup"
    
    print_check "Testing if server can start..."
    print_info "Starting server in background (will stop after 10 seconds)..."
    
    # Start server in background
    npm run dev > /tmp/server-check.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 10
    
    # Check if process is still running
    if ps -p $SERVER_PID > /dev/null; then
        print_pass "Server started successfully (PID: $SERVER_PID)"
        
        # Try to connect to server
        if curl -s http://localhost:3000 > /dev/null; then
            print_pass "Server is responding on http://localhost:3000"
        else
            print_warning "Server is running but not responding yet"
        fi
        
        # Stop the server
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
        
        print_info "Test server stopped"
        return 0
    else
        print_fail "Server failed to start"
        print_info "Server errors:"
        tail -20 /tmp/server-check.log | while read line; do
            echo "  $line"
        done
        print_solution "Check the full server log: cat /tmp/server-check.log"
        print_solution "Ensure port 3000 is not already in use: lsof -i :3000"
        return 1
    fi
}

# Generate summary report
generate_summary() {
    print_header "System Check Summary"
    
    TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))
    
    echo ""
    echo -e "${GREEN}Passed:${NC}   $CHECKS_PASSED"
    echo -e "${RED}Failed:${NC}   $CHECKS_FAILED"
    echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNING"
    echo -e "${CYAN}Total:${NC}    $TOTAL_CHECKS"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ System is ready to run!${NC}"
        echo ""
        echo "Start the system with:"
        echo "  npm run dev    (development mode)"
        echo "  npm start      (production mode)"
        echo ""
        echo "Access at: http://localhost:3000"
        return 0
    else
        echo -e "${RED}✗ System has issues that need to be fixed${NC}"
        echo ""
        echo "Review the errors above and follow the suggested solutions."
        echo "After fixing issues, run this check again: ./check-system.sh"
        return 1
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ISP Management System Health Check   ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    check_project_directory || true
    check_nodejs || true
    check_postgresql || true
    check_database || true
    check_database_tables || true
    check_dependencies || true
    check_environment_variables || true
    
    # Optional checks (don't fail if these don't pass)
    echo ""
    print_info "Running optional checks..."
    
    # Uncomment to enable build check (takes time)
    check_application_build || true
    
    # Uncomment to enable server start check (takes time)
    check_server_start || true
    
    generate_summary
}

# Run main function
main "$@"

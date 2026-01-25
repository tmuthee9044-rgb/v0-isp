#!/bin/bash
# FreeRADIUS Startup Fix Script
# Diagnoses and automatically fixes common FreeRADIUS startup failures

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Detect FreeRADIUS version and directories
detect_freeradius_paths() {
    if [ -d "/etc/freeradius/3.0" ]; then
        FREERADIUS_DIR="/etc/freeradius/3.0"
        FREERADIUS_VERSION="3.0"
    elif [ -d "/etc/raddb" ]; then
        FREERADIUS_DIR="/etc/raddb"
        FREERADIUS_VERSION="raddb"
    else
        print_error "FreeRADIUS directory not found!"
        exit 1
    fi
    
    print_info "Detected FreeRADIUS directory: $FREERADIUS_DIR"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "This script must be run as root"
        print_info "Run: sudo $0"
        exit 1
    fi
}

# Stop FreeRADIUS service
stop_freeradius() {
    print_info "Stopping FreeRADIUS service..."
    systemctl stop freeradius 2>/dev/null || true
    killall freeradius 2>/dev/null || true
    sleep 2
    print_success "FreeRADIUS stopped"
}

# Check database connection
check_database() {
    print_header "Checking Database Connection"
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set"
        print_info "Please set DATABASE_URL in your environment or .env file"
        return 1
    fi
    
    print_info "Testing database connection..."
    if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Failed to connect to database"
        return 1
    fi
    
    # Check for required RADIUS tables
    print_info "Checking for FreeRADIUS tables..."
    
    TABLES_NEEDED=("radcheck" "radreply" "radacct" "nas")
    MISSING_TABLES=()
    
    for table in "${TABLES_NEEDED[@]}"; do
        if psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | grep -q "t"; then
            print_success "Table exists: $table"
        else
            print_warning "Table missing: $table"
            MISSING_TABLES+=("$table")
        fi
    done
    
    if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
        print_warning "Missing ${#MISSING_TABLES[@]} FreeRADIUS tables"
        print_info "Running schema creation script..."
        
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "$SCRIPT_DIR/create_standard_radius_schema.sql" ]; then
            psql "$DATABASE_URL" -f "$SCRIPT_DIR/create_standard_radius_schema.sql"
            print_success "FreeRADIUS schema created"
        else
            print_error "Schema file not found: create_standard_radius_schema.sql"
            return 1
        fi
    fi
}

# Fix SQL module configuration
fix_sql_module() {
    print_header "Fixing SQL Module Configuration"
    
    SQL_CONF="$FREERADIUS_DIR/mods-available/sql"
    
    if [ ! -f "$SQL_CONF" ]; then
        print_error "SQL module config not found: $SQL_CONF"
        return 1
    fi
    
    print_info "Backing up SQL configuration..."
    cp "$SQL_CONF" "${SQL_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Extract database connection details from DATABASE_URL
    if [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL: postgresql://user:pass@host:port/dbname
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*@.*/\1/p')
        DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
        
        # Use defaults if parsing failed
        DB_USER=${DB_USER:-postgres}
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-5432}
        DB_NAME=${DB_NAME:-isp_system}
        
        print_info "Configuring SQL module for database: $DB_NAME @ $DB_HOST:$DB_PORT"
        
        # Create new SQL configuration
        cat > "$SQL_CONF" <<EOF
sql {
    driver = "rlm_sql_postgresql"
    dialect = "postgresql"
    
    server = "$DB_HOST"
    port = $DB_PORT
    login = "$DB_USER"
    password = "$DB_PASS"
    radius_db = "$DB_NAME"
    
    acct_table1 = "radacct"
    acct_table2 = "radacct"
    postauth_table = "radpostauth"
    authcheck_table = "radcheck"
    groupcheck_table = "radgroupcheck"
    authreply_table = "radreply"
    groupreply_table = "radgroupreply"
    usergroup_table = "radusergroup"
    
    read_clients = yes
    client_table = "nas"
    
    pool {
        start = 5
        min = 3
        max = 32
        spare = 10
        uses = 0
        retry_delay = 30
        lifetime = 0
        idle_timeout = 60
    }
    
    read_groups = yes
    
    # Use standard FreeRADIUS queries
    \$INCLUDE \${modconfdir}/\${.:name}/main/\${.:dialect}/queries.conf
}
EOF
        
        print_success "SQL module configuration updated"
    else
        print_error "DATABASE_URL not set, cannot configure SQL module"
        return 1
    fi
    
    # Enable SQL module
    print_info "Enabling SQL module..."
    ln -sf "$FREERADIUS_DIR/mods-available/sql" "$FREERADIUS_DIR/mods-enabled/sql" 2>/dev/null || true
    print_success "SQL module enabled"
}

# Fix permissions
fix_permissions() {
    print_header "Fixing File Permissions"
    
    print_info "Setting correct ownership..."
    chown -R freerad:freerad "$FREERADIUS_DIR" 2>/dev/null || chown -R radiusd:radiusd "$FREERADIUS_DIR" 2>/dev/null || true
    
    print_info "Setting correct file permissions..."
    find "$FREERADIUS_DIR" -type f -exec chmod 640 {} \;
    find "$FREERADIUS_DIR" -type d -exec chmod 750 {} \;
    
    # Make sure clients.conf is readable
    if [ -f "$FREERADIUS_DIR/clients.conf" ]; then
        chmod 640 "$FREERADIUS_DIR/clients.conf"
    fi
    
    print_success "Permissions fixed"
}

# Fix common configuration issues
fix_configuration() {
    print_header "Fixing Configuration Issues"
    
    # Disable EAP module (not needed for ISP)
    print_info "Disabling EAP module..."
    if [ -L "$FREERADIUS_DIR/mods-enabled/eap" ]; then
        rm -f "$FREERADIUS_DIR/mods-enabled/eap"
        print_success "EAP module disabled"
    fi
    
    # Disable inner-tunnel site to avoid port conflicts
    print_info "Disabling inner-tunnel site..."
    if [ -L "$FREERADIUS_DIR/sites-enabled/inner-tunnel" ]; then
        rm -f "$FREERADIUS_DIR/sites-enabled/inner-tunnel"
        print_success "Inner-tunnel site disabled"
    fi
    
    # Ensure default site is enabled
    print_info "Enabling default site..."
    ln -sf "$FREERADIUS_DIR/sites-available/default" "$FREERADIUS_DIR/sites-enabled/default" 2>/dev/null || true
    print_success "Default site enabled"
    
    # Check for port conflicts
    print_info "Checking for port conflicts on 1812..."
    if netstat -ulnp 2>/dev/null | grep -q ":1812" || ss -ulnp 2>/dev/null | grep -q ":1812"; then
        print_warning "Port 1812 is already in use"
        print_info "Killing processes on port 1812..."
        fuser -k 1812/udp 2>/dev/null || true
        sleep 1
        print_success "Port 1812 cleared"
    fi
}

# Test configuration syntax
test_configuration() {
    print_header "Testing FreeRADIUS Configuration"
    
    print_info "Running configuration test..."
    if freeradius -C > /tmp/freeradius-config-test.log 2>&1; then
        print_success "Configuration syntax is valid"
        return 0
    else
        print_error "Configuration test failed!"
        print_info "Error details:"
        cat /tmp/freeradius-config-test.log
        return 1
    fi
}

# Debug mode check
run_debug_mode() {
    print_header "Running FreeRADIUS in Debug Mode"
    
    print_info "Starting FreeRADIUS in debug mode (press Ctrl+C to stop)..."
    print_warning "Watch for errors in the output below:"
    echo ""
    
    timeout 10 freeradius -X || true
}

# Start FreeRADIUS service
start_freeradius() {
    print_header "Starting FreeRADIUS Service"
    
    print_info "Enabling FreeRADIUS service..."
    systemctl enable freeradius
    
    print_info "Starting FreeRADIUS service..."
    systemctl start freeradius
    
    sleep 3
    
    if systemctl is-active --quiet freeradius; then
        print_success "FreeRADIUS service started successfully!"
        
        # Show status
        print_info "Service status:"
        systemctl status freeradius --no-pager --lines=10
        
        # Check if listening on port
        if netstat -ulnp 2>/dev/null | grep -q ":1812" || ss -ulnp 2>/dev/null | grep -q ":1812"; then
            print_success "FreeRADIUS is listening on port 1812"
        else
            print_warning "FreeRADIUS may not be listening on port 1812"
        fi
        
        return 0
    else
        print_error "FreeRADIUS service failed to start!"
        print_info "Checking system logs..."
        journalctl -xeu freeradius.service --no-pager -n 50
        return 1
    fi
}

# Main execution
main() {
    print_header "FreeRADIUS Startup Fix Script"
    
    check_root
    detect_freeradius_paths
    stop_freeradius
    check_database || print_warning "Database check failed, continuing anyway..."
    fix_sql_module || print_warning "SQL module fix failed, continuing anyway..."
    fix_permissions
    fix_configuration
    
    if test_configuration; then
        start_freeradius
    else
        print_error "Configuration test failed! Running debug mode for diagnosis..."
        run_debug_mode
        
        print_info ""
        print_info "Common fixes:"
        print_info "1. Check database connection: psql \$DATABASE_URL -c 'SELECT 1'"
        print_info "2. Verify SQL module: cat $FREERADIUS_DIR/mods-available/sql"
        print_info "3. Check logs: journalctl -xeu freeradius.service"
        print_info "4. Run debug mode: sudo freeradius -X"
        exit 1
    fi
}

# Run main function
main "$@"

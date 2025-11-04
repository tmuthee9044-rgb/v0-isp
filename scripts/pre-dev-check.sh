#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}[Pre-Dev Check]${NC} Starting database verification..."

# Check if PostgreSQL is running
if command -v systemctl &> /dev/null; then
    if ! systemctl is-active --quiet postgresql 2>/dev/null; then
        echo -e "${YELLOW}[Warning]${NC} PostgreSQL is not running. Attempting to start..."
        if sudo systemctl start postgresql 2>/dev/null; then
            sleep 2
            echo -e "${GREEN}[Success]${NC} PostgreSQL service started"
        else
            echo -e "${YELLOW}[Warning]${NC} Could not start PostgreSQL automatically"
            echo -e "${YELLOW}[Info]${NC} Run './install.sh' to set up the database"
        fi
    else
        echo -e "${GREEN}[Success]${NC} PostgreSQL service is running"
    fi
elif command -v brew &> /dev/null; then
    # macOS with Homebrew
    if ! brew services list 2>/dev/null | grep postgresql | grep started > /dev/null; then
        echo -e "${YELLOW}[Warning]${NC} PostgreSQL is not running. Attempting to start..."
        brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null
        sleep 2
    fi
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}[Warning]${NC} .env.local not found. Creating with default values..."
    cat > .env.local << 'EOF'
# Database Configuration (Offline PostgreSQL)
DATABASE_URL=postgresql://isp_admin:isp_password@localhost:5432/isp_system
POSTGRES_URL=postgresql://isp_admin:isp_password@localhost:5432/isp_system
POSTGRES_PRISMA_URL=postgresql://isp_admin:isp_password@localhost:5432/isp_system

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
EOF
    echo -e "${GREEN}[Success]${NC} Created .env.local with default PostgreSQL configuration"
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs) 2>/dev/null || true
fi

if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    # Extract database details from DATABASE_URL properly
    # Format: postgresql://user:password@host:port/database
    DB_USER=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $4}')
    DB_PASS=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $5}')
    DB_HOST=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $6}')
    DB_PORT=$(echo "$DATABASE_URL" | awk -F'[/:@]' '{print $7}')
    DB_NAME=$(echo "$DATABASE_URL" | awk -F'[/?]' '{print $4}')
    
    echo -e "${BLUE}[Info]${NC} Database Host: $DB_HOST | Port: $DB_PORT | Database: $DB_NAME"
    
    if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
        # Only test local PostgreSQL connections
        echo -e "${BLUE}[Info]${NC} Using LOCAL PostgreSQL database"
        echo -e "${BLUE}[Info]${NC} Testing connection to local database: $DB_NAME"
        
        if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
            echo -e "${YELLOW}[Warning]${NC} Database '$DB_NAME' does not exist. Creating..."
            
            # Check if user exists, create if missing
            if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1; then
                echo -e "${BLUE}[Info]${NC} Creating database user '$DB_USER'..."
                sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null
                echo -e "${GREEN}[Success]${NC} Database user created"
            fi
            
            # Create database
            sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
            
            if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
                echo -e "${GREEN}[Success]${NC} Database '$DB_NAME' created successfully"
                echo -e "${YELLOW}[Info]${NC} Run './install.sh --fix-db' to create database tables"
            else
                echo -e "${RED}[Error]${NC} Failed to create database"
                echo -e "${YELLOW}[Info]${NC} Run './install.sh' for full setup"
            fi
        fi
        
        if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null 2>&1; then
            echo -e "${GREEN}[Success]${NC} Database connection verified"
            
            echo -e "${BLUE}[Info]${NC} Verifying database tables..."
            
            REQUIRED_TABLES=("customers" "service_plans" "customer_services" "payments" "invoices" "network_devices" "ip_addresses" "employees" "payroll" "leave_requests" "activity_logs" "schema_migrations")
            
            MISSING_TABLES=()
            EXISTING_COUNT=0
            
            for table in "${REQUIRED_TABLES[@]}"; do
                if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | grep -q "t"; then
                    EXISTING_COUNT=$((EXISTING_COUNT + 1))
                else
                    MISSING_TABLES+=("$table")
                fi
            done
            
            if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
                echo -e "${GREEN}[Success]${NC} All 12 required tables exist"
            else
                echo -e "${YELLOW}[Warning]${NC} Missing ${#MISSING_TABLES[@]} tables: ${MISSING_TABLES[*]}"
                echo -e "${YELLOW}[Info]${NC} Run './install.sh --fix-db' to create missing tables"
            fi
            
            # Show total table count
            TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
            echo -e "${BLUE}[Info]${NC} Total tables in database: $TABLE_COUNT"
            
        else
            echo -e "${YELLOW}[Warning]${NC} Could not connect to database '$DB_NAME'"
            echo -e "${BLUE}[Info]${NC} User: $DB_USER | Host: $DB_HOST:$DB_PORT"
            echo -e "${YELLOW}[Info]${NC} Run './install.sh' for complete database setup"
        fi
    else
        echo -e "${RED}[Error]${NC} DATABASE_URL is pointing to cloud database: $DB_HOST"
        echo -e "${YELLOW}[Info]${NC} This system requires LOCAL PostgreSQL"
        echo -e "${YELLOW}[Info]${NC} Update .env.local to use: postgresql://isp_admin:isp_password@localhost:5432/isp_system"
        echo -e "${YELLOW}[Info]${NC} Then run './install.sh' to set up local database"
    fi
else
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}[Warning]${NC} DATABASE_URL not configured"
        echo -e "${YELLOW}[Info]${NC} Run './install.sh' to set up the database"
    fi
fi

echo -e "${GREEN}[Pre-Dev Check]${NC} Complete. Starting Next.js dev server..."
echo ""

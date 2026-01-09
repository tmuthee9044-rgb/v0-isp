#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verifying RADIUS Database Tables..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

echo "📊 Checking for existing RADIUS tables..."

# Check if tables exist
TABLES_EXIST=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('radius_users', 'radius_nas', 'radius_sessions_active', 'radius_sessions_archive', 'radius_accounting', 'bandwidth_usage');
")

echo "Found $TABLES_EXIST of 6 required tables"

if [ "$TABLES_EXIST" -eq 6 ]; then
    echo -e "${GREEN}✅ All RADIUS tables already exist!${NC}"
    echo ""
    echo "📋 Displaying table structures..."
    
    for table in radius_users radius_nas radius_sessions_active radius_sessions_archive radius_accounting bandwidth_usage; do
        echo ""
        echo "Table: $table"
        psql "$DATABASE_URL" -c "\d $table" 2>/dev/null || echo "  (Could not describe table)"
    done
    
else
    echo -e "${YELLOW}⚠️  Creating missing RADIUS tables...${NC}"
    echo ""
    
    # Create RADIUS infrastructure tables
    echo "Creating RADIUS infrastructure..."
    psql "$DATABASE_URL" -f scripts/create_radius_infrastructure.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ RADIUS infrastructure created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create RADIUS infrastructure${NC}"
        exit 1
    fi
    
    # Create bandwidth_usage table
    echo ""
    echo "Creating bandwidth_usage table..."
    psql "$DATABASE_URL" -f scripts/create_bandwidth_usage_table.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Bandwidth usage table created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create bandwidth_usage table${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ RADIUS database verification complete!${NC}"
echo ""
echo "📊 Summary of RADIUS tables:"
psql "$DATABASE_URL" -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('radius_users', 'radius_nas', 'radius_sessions_active', 'radius_sessions_archive', 'radius_accounting', 'bandwidth_usage')
ORDER BY tablename;
"

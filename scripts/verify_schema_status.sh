#!/bin/bash

# Schema Verification Script
# Checks current database state and reports issues

echo "==================================================="
echo "Database Schema Verification"
echo "==================================================="

# Database configuration
DB_NAME="${POSTGRES_DATABASE:-isp_system}"
DB_USER="${POSTGRES_USER:-isp_admin}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_PASSWORD="${POSTGRES_PASSWORD:-SecurePass123!}"

run_query() {
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A <<< "$1" 2>/dev/null
}

echo ""
echo "[INFO] Checking critical tables..."
echo ""

# Check for critical tables
critical_tables=("customers" "customer_services" "service_plans" "invoices" "payments" "users" "network_devices" "company_profiles" "locations" "routers" "radius_users" "radius_sessions_active" "radius_nas" "audit_logs" "tax_records")

for table in "${critical_tables[@]}"; do
    exists=$(run_query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}');")
    if [ "$exists" = "t" ]; then
        count=$(run_query "SELECT COUNT(*) FROM ${table};")
        echo "[OK] ${table} exists (${count} rows)"
    else
        echo "[MISSING] ${table} does not exist"
    fi
done

echo ""
echo "[INFO] Checking critical columns..."
echo ""

# Check critical columns
check_column() {
    local table=$1
    local column=$2
    exists=$(run_query "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}');")
    if [ "$exists" = "t" ]; then
        echo "[OK] ${table}.${column} exists"
    else
        echo "[MISSING] ${table}.${column}"
    fi
}

check_column "customers" "name"
check_column "customers" "first_name"
check_column "customers" "last_name"
check_column "customers" "phone_primary"
check_column "customer_services" "mac_address"
check_column "customer_services" "pppoe_username"
check_column "company_profiles" "name"
check_column "company_profiles" "currency"
check_column "network_devices" "location_id"
check_column "network_devices" "monitoring_enabled"
check_column "network_devices" "last_seen"
check_column "invoices" "total_amount"
check_column "invoices" "invoice_number"

echo ""
echo "[INFO] Checking table ownership..."
echo ""

# Check if tables are owned by the correct user
wrong_owner=$(run_query "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tableowner != '${DB_USER}';")
if [ "$wrong_owner" = "0" ]; then
    echo "[OK] All tables owned by ${DB_USER}"
else
    echo "[WARNING] ${wrong_owner} tables not owned by ${DB_USER}"
    run_query "SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tableowner != '${DB_USER}' LIMIT 10;"
fi

echo ""
echo "[INFO] Total table count..."
total_tables=$(run_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Total tables in public schema: ${total_tables}"

echo ""
echo "==================================================="
echo "Verification Complete"
echo "==================================================="

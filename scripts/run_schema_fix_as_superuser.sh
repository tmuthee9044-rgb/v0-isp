#!/bin/bash

# This script must be run as PostgreSQL superuser
# Usage: sudo -u postgres ./scripts/run_schema_fix_as_superuser.sh

echo "Running schema fix with superuser privileges..."

# Execute the SQL script as postgres superuser
PGPASSWORD="${POSTGRES_PASSWORD:-your_password}" psql -h "${PGHOST:-localhost}" -U postgres -d "${POSTGRES_DATABASE:-isp_db}" -f scripts/fix_all_missing_columns.sql

echo "Schema fix completed!"

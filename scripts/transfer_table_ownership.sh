#!/bin/bash

# Script to transfer ownership of all tables to isp_admin
# Must be run as postgres superuser

set -e

echo "🔧 Transferring ownership of all tables to isp_admin..."

# Database configuration
DB_NAME="${DB_NAME:-isp_system}"
DB_USER="${DB_USER:-isp_admin}"

# Run as postgres superuser
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Transfer ownership of all tables
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO $DB_USER';
        RAISE NOTICE 'Transferred ownership of table % to $DB_USER', r.tablename;
    END LOOP;
END \$\$;

-- Transfer ownership of all sequences
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO $DB_USER';
        RAISE NOTICE 'Transferred ownership of sequence % to $DB_USER', r.sequence_name;
    END LOOP;
END \$\$;

-- Transfer ownership of the schema
ALTER SCHEMA public OWNER TO $DB_USER;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

EOF

echo "✅ Ownership transfer completed!"
echo "You can now run the schema fix to add missing columns."

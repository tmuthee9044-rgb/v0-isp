#!/bin/bash

echo "=========================================="
echo "Fixing Database - Adding Missing Tables & Columns"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database credentials
DB_NAME="isp_management"
DB_USER="postgres"

echo -e "${YELLOW}[INFO]${NC} Applying all database fixes..."

# Execute the fix script
sudo -u postgres psql -d "$DB_NAME" << 'EOF'

-- Add missing columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add missing columns to company_profiles table  
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'ISP Company';

-- Add missing columns to customer_services table
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100);
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE customer_services ADD COLUMN IF NOT EXISTS location_id INTEGER;

-- Fix locations ID sequence
CREATE SEQUENCE IF NOT EXISTS locations_id_seq;
SELECT setval('locations_id_seq', COALESCE((SELECT MAX(id) FROM locations), 0) + 1, false);
ALTER TABLE locations ALTER COLUMN id SET DEFAULT nextval('locations_id_seq');

-- Create bandwidth_usage table
CREATE TABLE IF NOT EXISTS bandwidth_usage (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    device_id INTEGER,
    ip_address INET,
    date_hour TIMESTAMP,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    packets_in BIGINT DEFAULT 0,
    packets_out BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_customer ON bandwidth_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_date ON bandwidth_usage(date_hour);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    ip_address INET,
    location_id INTEGER REFERENCES locations(id),
    status VARCHAR(50) DEFAULT 'online',
    cpu_usage DECIMAL(5,2) DEFAULT 0,
    memory_usage DECIMAL(5,2) DEFAULT 0,
    disk_usage DECIMAL(5,2) DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 100,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_location ON servers(location_id);

EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK]${NC} Database fixes applied successfully"
    
    # Verify critical columns exist
    echo -e "${YELLOW}[INFO]${NC} Verifying fixes..."
    
    TABLES_CHECK=$(sudo -u postgres psql -d "$DB_NAME" -tAc "
        SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='name') THEN 'customers.name: OK' ELSE 'customers.name: MISSING' END,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_profiles' AND column_name='name') THEN 'company_profiles.name: OK' ELSE 'company_profiles.name: MISSING' END,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_services' AND column_name='mac_address') THEN 'customer_services.mac_address: OK' ELSE 'customer_services.mac_address: MISSING' END,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bandwidth_usage') THEN 'bandwidth_usage table: OK' ELSE 'bandwidth_usage table: MISSING' END,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='servers') THEN 'servers table: OK' ELSE 'servers table: MISSING' END
    ")
    
    echo "$TABLES_CHECK"
    echo -e "${GREEN}[OK]${NC} Database is now ready!"
else
    echo -e "${RED}[ERROR]${NC} Failed to apply database fixes"
    exit 1
fi

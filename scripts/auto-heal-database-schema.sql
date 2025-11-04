-- Trust Waves ISP Management System - Auto-Healing Database Schema
-- This script ensures all core tables exist and creates missing ones with minimal schema
-- Safe to run multiple times (idempotent)

-- Enable logging function
CREATE OR REPLACE FUNCTION log_table_creation(table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    RAISE NOTICE 'System Migration: Created missing table %', table_name;
END;
$$ LANGUAGE plpgsql;

-- 1. CUSTOMERS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        CREATE TABLE customers (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            status TEXT DEFAULT 'ACTIVE',
            address TEXT,
            city TEXT,
            state TEXT,
            gps_coordinates TEXT,
            installation_address TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_customers_status ON customers(status);
        CREATE INDEX idx_customers_phone ON customers(phone);
        CREATE UNIQUE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
        
        PERFORM log_table_creation('customers');
    END IF;
END $$;

-- 2. SERVICES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'services') THEN
        CREATE TABLE services (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            bandwidth TEXT,
            price NUMERIC(12,2) NOT NULL DEFAULT 0,
            tax_inclusive BOOLEAN DEFAULT false,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_services_name ON services(name);
        
        PERFORM log_table_creation('services');
    END IF;
END $$;

-- 3. CUSTOMER_SERVICES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_services') THEN
        CREATE TABLE customer_services (
            id BIGSERIAL PRIMARY KEY,
            customer_id BIGINT NOT NULL,
            service_id BIGINT NOT NULL,
            status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
            next_billing_date DATE,
            start_date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign keys only if referenced tables exist
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
            ALTER TABLE customer_services ADD CONSTRAINT fk_customer_services_customer 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'services') THEN
            ALTER TABLE customer_services ADD CONSTRAINT fk_customer_services_service 
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_customer_services_customer ON customer_services(customer_id);
        CREATE INDEX idx_customer_services_status ON customer_services(status);
        CREATE INDEX idx_customer_services_billing_date ON customer_services(next_billing_date);
        
        PERFORM log_table_creation('customer_services');
    END IF;
END $$;

-- 4. INVOICES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
        CREATE TABLE invoices (
            id BIGSERIAL PRIMARY KEY,
            customer_id BIGINT NOT NULL,
            amount NUMERIC(12,2) NOT NULL DEFAULT 0,
            status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
            due_date DATE NOT NULL,
            invoice_number TEXT UNIQUE,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign key only if customers table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
            ALTER TABLE invoices ADD CONSTRAINT fk_invoices_customer 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_invoices_customer ON invoices(customer_id);
        CREATE INDEX idx_invoices_status ON invoices(status);
        CREATE INDEX idx_invoices_due_date ON invoices(due_date);
        
        PERFORM log_table_creation('invoices');
    END IF;
END $$;

-- 5. ACCOUNT_BALANCES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'account_balances') THEN
        CREATE TABLE account_balances (
            id BIGSERIAL PRIMARY KEY,
            customer_id BIGINT NOT NULL UNIQUE,
            balance NUMERIC(12,2) DEFAULT 0,
            last_updated TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign key only if customers table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
            ALTER TABLE account_balances ADD CONSTRAINT fk_account_balances_customer 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_account_balances_customer ON account_balances(customer_id);
        
        PERFORM log_table_creation('account_balances');
    END IF;
END $$;

-- 6. MPESA_TRANSACTIONS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mpesa_transactions') THEN
        CREATE TABLE mpesa_transactions (
            id BIGSERIAL PRIMARY KEY,
            customer_id BIGINT,
            mpesa_receipt TEXT UNIQUE NOT NULL,
            phone_number TEXT NOT NULL,
            amount NUMERIC(12,2) NOT NULL,
            status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
            transaction_date TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign key only if customers table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
            ALTER TABLE mpesa_transactions ADD CONSTRAINT fk_mpesa_transactions_customer 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
        END IF;
        
        CREATE INDEX idx_mpesa_transactions_customer ON mpesa_transactions(customer_id);
        CREATE INDEX idx_mpesa_transactions_status ON mpesa_transactions(status);
        CREATE INDEX idx_mpesa_transactions_phone ON mpesa_transactions(phone_number);
        
        PERFORM log_table_creation('mpesa_transactions');
    END IF;
END $$;

-- 7. WALLET_TRANSACTIONS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
        CREATE TABLE wallet_transactions (
            id BIGSERIAL PRIMARY KEY,
            customer_id BIGINT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT', 'BONUS', 'REFUND')),
            amount NUMERIC(12,2) NOT NULL,
            description TEXT,
            reference_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign key only if customers table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
            ALTER TABLE wallet_transactions ADD CONSTRAINT fk_wallet_transactions_customer 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_wallet_transactions_customer ON wallet_transactions(customer_id);
        CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
        
        PERFORM log_table_creation('wallet_transactions');
    END IF;
END $$;

-- 8. INVENTORY_ITEMS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
        CREATE TABLE inventory_items (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT UNIQUE,
            category TEXT,
            serial_number TEXT UNIQUE,
            status TEXT DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'ASSIGNED', 'RETIRED', 'MAINTENANCE')),
            stock_quantity INTEGER DEFAULT 0,
            unit_cost NUMERIC(12,2) DEFAULT 0,
            location TEXT,
            supplier_id BIGINT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_inventory_items_status ON inventory_items(status);
        CREATE INDEX idx_inventory_items_category ON inventory_items(category);
        CREATE INDEX idx_inventory_items_location ON inventory_items(location);
        
        PERFORM log_table_creation('inventory_items');
    END IF;
END $$;

-- 9. SUPPLIERS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        CREATE TABLE suppliers (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            company_name TEXT,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            status TEXT DEFAULT 'ACTIVE',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_suppliers_name ON suppliers(name);
        CREATE INDEX idx_suppliers_status ON suppliers(status);
        
        PERFORM log_table_creation('suppliers');
    END IF;
END $$;

-- 10. NETWORK_DEVICES (ROUTERS) TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'network_devices') THEN
        CREATE TABLE network_devices (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'ROUTER',
            ip_address INET,
            location TEXT,
            status TEXT DEFAULT 'ACTIVE',
            model TEXT,
            serial_number TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_network_devices_type ON network_devices(type);
        CREATE INDEX idx_network_devices_status ON network_devices(status);
        CREATE INDEX idx_network_devices_location ON network_devices(location);
        
        PERFORM log_table_creation('network_devices');
    END IF;
END $$;

-- 11. IP_ADDRESSES TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ip_addresses') THEN
        CREATE TABLE ip_addresses (
            id BIGSERIAL PRIMARY KEY,
            router_id BIGINT,
            subnet_id BIGINT,
            ip_address INET UNIQUE NOT NULL,
            status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'RESERVED')),
            customer_id BIGINT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign key only if network_devices table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'network_devices') THEN
            ALTER TABLE ip_addresses ADD CONSTRAINT fk_ip_addresses_router 
            FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE SET NULL;
        END IF;
        
        -- Add foreign key only if customers table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
            ALTER TABLE ip_addresses ADD CONSTRAINT fk_ip_addresses_customer 
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
        END IF;
        
        CREATE INDEX idx_ip_addresses_status ON ip_addresses(status);
        CREATE INDEX idx_ip_addresses_router ON ip_addresses(router_id);
        CREATE INDEX idx_ip_addresses_customer ON ip_addresses(customer_id);
        
        PERFORM log_table_creation('ip_addresses');
    END IF;
END $$;

-- 12. IP_SUBNETS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ip_subnets') THEN
        CREATE TABLE ip_subnets (
            id BIGSERIAL PRIMARY KEY,
            router_id BIGINT,
            subnet CIDR NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'ACTIVE',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign key only if network_devices table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'network_devices') THEN
            ALTER TABLE ip_subnets ADD CONSTRAINT fk_ip_subnets_router 
            FOREIGN KEY (router_id) REFERENCES network_devices(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_ip_subnets_router ON ip_subnets(router_id);
        CREATE INDEX idx_ip_subnets_status ON ip_subnets(status);
        
        PERFORM log_table_creation('ip_subnets');
    END IF;
END $$;

-- Add missing foreign keys after all tables are created
DO $$
BEGIN
    -- Add supplier foreign key to inventory_items if both tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_items') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers')
       AND NOT EXISTS (SELECT FROM information_schema.table_constraints 
                      WHERE table_name = 'inventory_items' 
                      AND constraint_name = 'fk_inventory_items_supplier') THEN
        ALTER TABLE inventory_items ADD CONSTRAINT fk_inventory_items_supplier 
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
    END IF;
    
    -- Add subnet foreign key to ip_addresses if ip_subnets table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ip_addresses') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ip_subnets')
       AND NOT EXISTS (SELECT FROM information_schema.table_constraints 
                      WHERE table_name = 'ip_addresses' 
                      AND constraint_name = 'fk_ip_addresses_subnet') THEN
        ALTER TABLE ip_addresses ADD CONSTRAINT fk_ip_addresses_subnet 
        FOREIGN KEY (subnet_id) REFERENCES ip_subnets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create trigger function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['customers', 'services', 'customer_services', 'invoices', 
                          'account_balances', 'mpesa_transactions', 'wallet_transactions', 
                          'inventory_items', 'suppliers', 'network_devices', 'ip_addresses', 'ip_subnets'];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', table_name, table_name);
            EXECUTE format('CREATE TRIGGER update_%s_updated_at 
                           BEFORE UPDATE ON %s 
                           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 
                           table_name, table_name);
        END IF;
    END LOOP;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'System Migration: Auto-healing database schema completed successfully';
    RAISE NOTICE 'All core ISP management tables are now available and properly configured';
END $$;

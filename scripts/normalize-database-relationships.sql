-- Database Relationship Normalization Script
-- This script adds missing foreign key constraints and normalizes relationships

BEGIN;

-- First, let's add missing foreign key constraints for existing tables

-- 1. Fix billing_cycles table relationships
ALTER TABLE billing_cycles 
ADD CONSTRAINT fk_billing_cycles_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 2. Fix bus_fare_records relationships
-- First, we need to change employee_id from VARCHAR to INTEGER to match employees table
ALTER TABLE bus_fare_records 
ALTER COLUMN employee_id TYPE INTEGER USING employee_id::INTEGER;

ALTER TABLE bus_fare_records 
ADD CONSTRAINT fk_bus_fare_records_employee 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 3. Fix customer_emergency_contacts relationships
ALTER TABLE customer_emergency_contacts 
ADD CONSTRAINT fk_customer_emergency_contacts_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 4. Fix customer_phone_numbers relationships
ALTER TABLE customer_phone_numbers 
ADD CONSTRAINT fk_customer_phone_numbers_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 5. Fix customer_services relationships
ALTER TABLE customer_services 
ADD CONSTRAINT fk_customer_services_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_customer_services_service_plan 
FOREIGN KEY (service_plan_id) REFERENCES service_plans(id) ON DELETE RESTRICT;

-- 6. Fix customers table relationships
ALTER TABLE customers 
ADD CONSTRAINT fk_customers_assigned_staff 
FOREIGN KEY (assigned_staff_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 7. Fix fuel_logs relationships
ALTER TABLE fuel_logs 
ADD CONSTRAINT fk_fuel_logs_vehicle 
FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- 8. Fix hotspot_sessions relationships
ALTER TABLE hotspot_sessions 
ADD CONSTRAINT fk_hotspot_sessions_user 
FOREIGN KEY (user_id) REFERENCES hotspot_users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_hotspot_sessions_hotspot 
FOREIGN KEY (hotspot_id) REFERENCES hotspots(id) ON DELETE CASCADE;

-- 9. Fix hotspot_users relationships
ALTER TABLE hotspot_users 
ADD CONSTRAINT fk_hotspot_users_hotspot 
FOREIGN KEY (hotspot_id) REFERENCES hotspots(id) ON DELETE CASCADE;

-- 10. Fix hotspot_vouchers relationships
ALTER TABLE hotspot_vouchers 
ADD CONSTRAINT fk_hotspot_vouchers_hotspot 
FOREIGN KEY (hotspot_id) REFERENCES hotspots(id) ON DELETE CASCADE;

-- 11. Fix invoices relationships
ALTER TABLE invoices 
ADD CONSTRAINT fk_invoices_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 12. Fix ip_addresses relationships
ALTER TABLE ip_addresses 
ADD CONSTRAINT fk_ip_addresses_subnet 
FOREIGN KEY (subnet_id) REFERENCES subnets(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_ip_addresses_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- 13. Fix maintenance_logs relationships
ALTER TABLE maintenance_logs 
ADD CONSTRAINT fk_maintenance_logs_vehicle 
FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- 14. Fix payments relationships
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 15. Fix support_tickets relationships
ALTER TABLE support_tickets 
ADD CONSTRAINT fk_support_tickets_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_support_tickets_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL;

-- Now let's normalize some denormalized data structures

-- 16. Create a proper customer_service_plans junction table for many-to-many relationships
-- This replaces the direct plan field in customers table
CREATE TABLE IF NOT EXISTS customer_service_assignments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER NOT NULL REFERENCES service_plans(id) ON DELETE RESTRICT,
    assigned_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    monthly_fee NUMERIC(10,2),
    installation_date DATE,
    contract_start_date DATE,
    contract_end_date DATE,
    auto_renewal BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, service_plan_id, assigned_date)
);

-- 17. Create invoice_items table for proper invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 18. Create payment_invoice_allocations for proper payment tracking
CREATE TABLE IF NOT EXISTS payment_invoice_allocations (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(payment_id, invoice_id)
);

-- 19. Create customer_service_history for tracking service changes
CREATE TABLE IF NOT EXISTS customer_service_history (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_plan_id INTEGER REFERENCES service_plans(id),
    action VARCHAR(50) NOT NULL, -- 'added', 'removed', 'upgraded', 'downgraded', 'suspended', 'reactivated'
    old_monthly_fee NUMERIC(10,2),
    new_monthly_fee NUMERIC(10,2),
    reason TEXT,
    performed_by INTEGER REFERENCES employees(id),
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 20. Create network_device_assignments for tracking device assignments
CREATE TABLE IF NOT EXISTS network_device_assignments (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    unassigned_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    assigned_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 21. Normalize vehicle assignments
-- Change assigned_to from VARCHAR to proper foreign key
ALTER TABLE vehicles 
ALTER COLUMN assigned_to TYPE INTEGER USING assigned_to::INTEGER;

ALTER TABLE vehicles 
ADD CONSTRAINT fk_vehicles_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL;

-- 22. Create proper user roles and permissions tables
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    assigned_by INTEGER REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 23. Create audit trail table for tracking all changes
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER REFERENCES employees(id),
    changed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 24. Add proper indexes for foreign keys and commonly queried columns
CREATE INDEX IF NOT EXISTS idx_billing_cycles_customer_id ON billing_cycles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_service_plan_id ON customer_services(service_plan_id);
CREATE INDEX IF NOT EXISTS idx_customer_service_assignments_customer_id ON customer_service_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_service_assignments_service_plan_id ON customer_service_assignments(service_plan_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoice_allocations_payment_id ON payment_invoice_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoice_allocations_invoice_id ON payment_invoice_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_service_history_customer_id ON customer_service_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_network_device_assignments_device_id ON network_device_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_network_device_assignments_customer_id ON network_device_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_at ON audit_trail(changed_at);

-- 25. Add check constraints for data integrity
ALTER TABLE customer_services 
ADD CONSTRAINT chk_customer_services_dates 
CHECK (end_date IS NULL OR end_date >= start_date);

ALTER TABLE customer_service_assignments 
ADD CONSTRAINT chk_customer_service_assignments_dates 
CHECK (contract_end_date IS NULL OR contract_end_date >= contract_start_date);

ALTER TABLE invoices 
ADD CONSTRAINT chk_invoices_amount_positive 
CHECK (amount >= 0);

ALTER TABLE payments 
ADD CONSTRAINT chk_payments_amount_positive 
CHECK (amount >= 0);

ALTER TABLE service_plans 
ADD CONSTRAINT chk_service_plans_price_positive 
CHECK (price >= 0);

-- 26. Create triggers for audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_values, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_customer_services AFTER INSERT OR UPDATE OR DELETE ON customer_services FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_service_plans AFTER INSERT OR UPDATE OR DELETE ON service_plans FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 27. Insert default user roles
INSERT INTO user_roles (role_name, description, permissions) VALUES
('admin', 'System Administrator', '{"all": true}'),
('manager', 'Manager', '{"customers": ["read", "write"], "services": ["read", "write"], "reports": ["read"]}'),
('technician', 'Technical Support', '{"customers": ["read", "write"], "network": ["read", "write"], "tickets": ["read", "write"]}'),
('billing', 'Billing Staff', '{"customers": ["read"], "billing": ["read", "write"], "payments": ["read", "write"]}'),
('customer_service', 'Customer Service', '{"customers": ["read", "write"], "tickets": ["read", "write"], "communications": ["read", "write"]}')
ON CONFLICT (role_name) DO NOTHING;

COMMIT;

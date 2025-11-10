-- Create roles and permissions tables for RBAC system

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table organized by modules
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  module VARCHAR(100) NOT NULL, -- Dashboard, Customers, Finance, etc.
  permission_key VARCHAR(200) NOT NULL UNIQUE, -- e.g., 'customers.view', 'finance.create_invoice'
  permission_name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

-- Update users table to use role_id instead of role string
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

-- Insert default system roles
INSERT INTO roles (name, description, is_system_role) VALUES
  ('Super Administrator', 'Full system access with all permissions', TRUE),
  ('Administrator', 'Administrative access to most system features', TRUE),
  ('Manager', 'Management access to operational features', TRUE),
  ('Technician', 'Technical operations and network management', TRUE),
  ('Accountant', 'Financial and billing management', TRUE),
  ('Support Agent', 'Customer support and ticket management', TRUE),
  ('Employee', 'Basic employee access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert all system permissions organized by modules
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
  -- Dashboard Module
  ('Dashboard', 'dashboard.view', 'View Dashboard', 'Access to main dashboard and overview'),
  ('Dashboard', 'dashboard.view_analytics', 'View Analytics', 'Access to analytics and reports on dashboard'),
  
  -- Customers Module
  ('Customers', 'customers.view', 'View Customers', 'View customer list and details'),
  ('Customers', 'customers.create', 'Create Customers', 'Add new customers to the system'),
  ('Customers', 'customers.edit', 'Edit Customers', 'Modify customer information'),
  ('Customers', 'customers.delete', 'Delete Customers', 'Remove customers from the system'),
  ('Customers', 'customers.manage_subscriptions', 'Manage Subscriptions', 'Manage customer service subscriptions'),
  ('Customers', 'customers.manage_billing', 'Manage Billing', 'Manage customer billing configurations'),
  ('Customers', 'customers.view_documents', 'View Documents', 'Access customer documents'),
  ('Customers', 'customers.manage_equipment', 'Manage Equipment', 'Assign and manage customer equipment'),
  
  -- Finance Module
  ('Finance', 'finance.view', 'View Finance', 'Access to finance dashboard and overview'),
  ('Finance', 'finance.create_invoices', 'Create Invoices', 'Generate customer invoices'),
  ('Finance', 'finance.edit_invoices', 'Edit Invoices', 'Modify existing invoices'),
  ('Finance', 'finance.delete_invoices', 'Delete Invoices', 'Remove invoices from the system'),
  ('Finance', 'finance.manage_payments', 'Manage Payments', 'Process and manage customer payments'),
  ('Finance', 'finance.view_reports', 'View Financial Reports', 'Access financial reports and analytics'),
  ('Finance', 'finance.manage_expenses', 'Manage Expenses', 'Create and manage company expenses'),
  ('Finance', 'finance.manage_accounts', 'Manage Chart of Accounts', 'Manage accounting structure'),
  ('Finance', 'finance.create_credit_notes', 'Create Credit Notes', 'Issue credit notes to customers'),
  
  -- Inventory Module
  ('Inventory', 'inventory.view', 'View Inventory', 'View inventory items and stock levels'),
  ('Inventory', 'inventory.create_items', 'Create Items', 'Add new inventory items'),
  ('Inventory', 'inventory.edit_items', 'Edit Items', 'Modify inventory item details'),
  ('Inventory', 'inventory.delete_items', 'Delete Items', 'Remove inventory items'),
  ('Inventory', 'inventory.manage_stock', 'Manage Stock', 'Adjust stock levels and movements'),
  ('Inventory', 'inventory.view_reports', 'View Inventory Reports', 'Access inventory analytics and reports'),
  ('Inventory', 'inventory.manage_warehouses', 'Manage Warehouses', 'Manage warehouse locations'),
  
  -- Network Module
  ('Network', 'network.view', 'View Network', 'View network devices and status'),
  ('Network', 'network.manage_devices', 'Manage Devices', 'Add, edit, and configure network devices'),
  ('Network', 'network.manage_routers', 'Manage Routers', 'Configure and manage routers'),
  ('Network', 'network.view_diagnostics', 'View Diagnostics', 'Access network diagnostics and logs'),
  ('Network', 'network.manage_ip_addresses', 'Manage IP Addresses', 'Allocate and manage IP addresses'),
  ('Network', 'network.manage_subnets', 'Manage Subnets', 'Create and manage network subnets'),
  
  -- Suppliers Module
  ('Suppliers', 'suppliers.view', 'View Suppliers', 'View supplier list and details'),
  ('Suppliers', 'suppliers.create', 'Create Suppliers', 'Add new suppliers'),
  ('Suppliers', 'suppliers.edit', 'Edit Suppliers', 'Modify supplier information'),
  ('Suppliers', 'suppliers.delete', 'Delete Suppliers', 'Remove suppliers'),
  ('Suppliers', 'suppliers.manage_purchase_orders', 'Manage Purchase Orders', 'Create and manage purchase orders'),
  ('Suppliers', 'suppliers.receive_orders', 'Receive Orders', 'Mark purchase orders as received'),
  ('Suppliers', 'suppliers.view_invoices', 'View Supplier Invoices', 'Access supplier invoices'),
  
  -- Reports Module
  ('Reports', 'reports.view', 'View Reports', 'Access system reports'),
  ('Reports', 'reports.export', 'Export Reports', 'Export reports to various formats'),
  ('Reports', 'reports.view_financial', 'View Financial Reports', 'Access financial reports'),
  ('Reports', 'reports.view_inventory', 'View Inventory Reports', 'Access inventory reports'),
  ('Reports', 'reports.view_network', 'View Network Reports', 'Access network performance reports'),
  
  -- Settings Module
  ('Settings', 'settings.view', 'View Settings', 'Access system settings'),
  ('Settings', 'settings.manage_users', 'Manage Users', 'Create, edit, and delete user accounts'),
  ('Settings', 'settings.manage_roles', 'Manage Roles', 'Create and configure user roles and permissions'),
  ('Settings', 'settings.manage_system', 'Manage System Settings', 'Configure system-wide settings'),
  ('Settings', 'settings.view_audit_logs', 'View Audit Logs', 'Access system audit logs'),
  
  -- Logs Module
  ('Logs', 'logs.view', 'View Logs', 'Access system logs'),
  ('logs', 'logs.export', 'Export Logs', 'Export log data'),
  ('Logs', 'logs.view_admin_logs', 'View Admin Logs', 'Access administrative action logs')
ON CONFLICT (permission_key) DO NOTHING;

-- Assign all permissions to Super Administrator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Administrator'
ON CONFLICT DO NOTHING;

-- Assign permissions to Administrator role (all except some sensitive settings)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrator'
  AND p.permission_key NOT IN ('settings.manage_roles', 'settings.manage_system')
ON CONFLICT DO NOTHING;

-- Assign permissions to Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND p.module IN ('Dashboard', 'Customers', 'Finance', 'Reports')
  AND p.permission_key NOT LIKE '%.delete%'
ON CONFLICT DO NOTHING;

-- Assign permissions to Technician role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Technician'
  AND p.module IN ('Dashboard', 'Network', 'Customers', 'Inventory')
  AND p.permission_key NOT LIKE '%.delete%'
ON CONFLICT DO NOTHING;

-- Assign permissions to Accountant role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Accountant'
  AND p.module IN ('Dashboard', 'Finance', 'Reports', 'Suppliers')
ON CONFLICT DO NOTHING;

-- Assign permissions to Support Agent role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Support Agent'
  AND p.module IN ('Dashboard', 'Customers')
  AND p.permission_key IN ('dashboard.view', 'customers.view', 'customers.edit', 'customers.view_documents')
ON CONFLICT DO NOTHING;

-- Assign basic permissions to Employee role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Employee'
  AND p.permission_key IN ('dashboard.view', 'customers.view')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

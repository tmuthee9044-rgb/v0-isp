-- Comprehensive ISP Management System Permissions
-- Based on actual app folder structure
-- Run this to populate the permissions table with all system modules

-- Clear existing permissions (optional - uncomment to reset)
-- DELETE FROM role_permissions;
-- DELETE FROM permissions;

-- Dashboard & Overview
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Dashboard', 'dashboard.view', 'View Dashboard', 'Access main dashboard page'),
('Dashboard', 'dashboard.widgets', 'Manage Dashboard Widgets', 'Customize dashboard layout'),
('Overview', 'overview.view', 'View Overview', 'Access system overview page'),
('Overview', 'overview.analytics', 'View Analytics', 'Access detailed analytics and metrics')
ON CONFLICT (permission_key) DO NOTHING;

-- Customer Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Customers', 'customers.view', 'View Customers', 'View customer list and details'),
('Customers', 'customers.create', 'Create Customers', 'Add new customers'),
('Customers', 'customers.edit', 'Edit Customers', 'Modify customer information'),
('Customers', 'customers.delete', 'Delete Customers', 'Remove customers from system'),
('Customers', 'customers.import', 'Import Customers', 'Bulk import customers via CSV'),
('Customers', 'customers.export', 'Export Customers', 'Export customer data'),
('Customers', 'customers.pending', 'View Pending Customers', 'Access pending customer approvals'),
('Customers', 'customers.approve', 'Approve Customers', 'Approve pending customer registrations')
ON CONFLICT (permission_key) DO NOTHING;

-- Services Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Services', 'services.view', 'View Services', 'View service plans and offerings'),
('Services', 'services.create', 'Create Services', 'Add new service plans'),
('Services', 'services.edit', 'Edit Services', 'Modify service plans'),
('Services', 'services.delete', 'Delete Services', 'Remove service plans'),
('Services', 'services.compare', 'Compare Services', 'Compare service plans'),
('Services', 'services.assign', 'Assign Services', 'Assign services to customers')
ON CONFLICT (permission_key) DO NOTHING;

-- Billing & Finance
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Billing', 'billing.view', 'View Billing', 'View billing information'),
('Billing', 'billing.create', 'Create Invoices', 'Generate customer invoices'),
('Billing', 'billing.edit', 'Edit Invoices', 'Modify invoices'),
('Billing', 'billing.payments', 'Process Payments', 'Record and manage payments'),
('Billing', 'billing.overdue', 'View Overdue', 'Access overdue accounts'),
('Finance', 'finance.view', 'View Finance', 'View financial overview'),
('Finance', 'finance.reports', 'Finance Reports', 'Generate financial reports'),
('Finance', 'finance.documents', 'Finance Documents', 'Manage financial documents'),
('Finance', 'finance.budgets', 'Manage Budgets', 'Create and manage budgets'),
('Finance', 'finance.expenses', 'Manage Expenses', 'Record and track expenses')
ON CONFLICT (permission_key) DO NOTHING;

-- Network Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Network', 'network.view', 'View Network', 'View network infrastructure'),
('Network', 'network.routers', 'Manage Routers', 'Add, edit, configure routers'),
('Network', 'network.subnets', 'Manage Subnets', 'Manage IP subnets and pools'),
('Network', 'network.provisioning', 'Network Provisioning', 'Provision network services'),
('Network', 'network.sync', 'Network Sync', 'Sync with network devices'),
('Network', 'network.reports', 'Network Reports', 'Generate network reports'),
('Network', 'network.compliance', 'Router Compliance', 'Monitor router compliance')
ON CONFLICT (permission_key) DO NOTHING;

-- Hotspot Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Hotspot', 'hotspot.view', 'View Hotspots', 'View hotspot locations'),
('Hotspot', 'hotspot.create', 'Create Hotspots', 'Add new hotspot locations'),
('Hotspot', 'hotspot.edit', 'Edit Hotspots', 'Modify hotspot settings'),
('Hotspot', 'hotspot.users', 'Manage Hotspot Users', 'Manage hotspot user accounts'),
('Hotspot', 'hotspot.vouchers', 'Manage Vouchers', 'Generate and manage vouchers'),
('Hotspot', 'hotspot.payment', 'Hotspot Payment', 'Process hotspot payments')
ON CONFLICT (permission_key) DO NOTHING;

-- Reports & Analytics
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Reports', 'reports.view', 'View Reports', 'Access reports section'),
('Reports', 'reports.customers', 'Customer Reports', 'Generate customer reports'),
('Reports', 'reports.revenue', 'Revenue Reports', 'Generate revenue reports'),
('Reports', 'reports.usage', 'Usage Reports', 'Generate usage reports'),
('Reports', 'reports.export', 'Export Reports', 'Export reports to PDF/Excel')
ON CONFLICT (permission_key) DO NOTHING;

-- Inventory Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Inventory', 'inventory.view', 'View Inventory', 'View inventory items'),
('Inventory', 'inventory.create', 'Create Inventory', 'Add inventory items'),
('Inventory', 'inventory.edit', 'Edit Inventory', 'Modify inventory items'),
('Inventory', 'inventory.operations', 'Inventory Operations', 'Stock in/out operations'),
('Inventory', 'inventory.reports', 'Inventory Reports', 'Generate inventory reports')
ON CONFLICT (permission_key) DO NOTHING;

-- Warehouse Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Warehouse', 'warehouse.view', 'View Warehouses', 'View warehouse locations'),
('Warehouse', 'warehouse.create', 'Create Warehouses', 'Add new warehouses'),
('Warehouse', 'warehouse.edit', 'Edit Warehouses', 'Modify warehouse settings'),
('Warehouse', 'warehouse.transfer', 'Transfer Stock', 'Transfer between warehouses')
ON CONFLICT (permission_key) DO NOTHING;

-- Supplier Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Suppliers', 'suppliers.view', 'View Suppliers', 'View supplier information'),
('Suppliers', 'suppliers.create', 'Create Suppliers', 'Add new suppliers'),
('Suppliers', 'suppliers.edit', 'Edit Suppliers', 'Modify supplier details'),
('Suppliers', 'suppliers.delete', 'Delete Suppliers', 'Remove suppliers'),
('Suppliers', 'suppliers.orders', 'Purchase Orders', 'Manage purchase orders')
ON CONFLICT (permission_key) DO NOTHING;

-- Purchase Orders
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Purchase Orders', 'po.view', 'View Purchase Orders', 'View purchase orders'),
('Purchase Orders', 'po.create', 'Create Purchase Orders', 'Create new purchase orders'),
('Purchase Orders', 'po.approve', 'Approve Purchase Orders', 'Approve purchase orders'),
('Purchase Orders', 'po.receive', 'Receive Orders', 'Receive and process deliveries')
ON CONFLICT (permission_key) DO NOTHING;

-- Human Resources
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('HR', 'hr.view', 'View HR', 'View HR information'),
('HR', 'hr.employees', 'Manage Employees', 'Add, edit employee records'),
('HR', 'hr.payroll', 'Manage Payroll', 'Process employee payroll'),
('HR', 'hr.leaves', 'Manage Leaves', 'Approve employee leave requests'),
('HR', 'hr.attendance', 'Manage Attendance', 'Track employee attendance')
ON CONFLICT (permission_key) DO NOTHING;

-- Vehicle Management
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Vehicles', 'vehicles.view', 'View Vehicles', 'View company vehicles'),
('Vehicles', 'vehicles.create', 'Create Vehicles', 'Add new vehicles'),
('Vehicles', 'vehicles.edit', 'Edit Vehicles', 'Modify vehicle information'),
('Vehicles', 'vehicles.fuel', 'Fuel Logs', 'Manage fuel consumption logs'),
('Vehicles', 'vehicles.maintenance', 'Maintenance Logs', 'Track vehicle maintenance')
ON CONFLICT (permission_key) DO NOTHING;

-- Messages & Communications
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Messages', 'messages.view', 'View Messages', 'View messages and notifications'),
('Messages', 'messages.send', 'Send Messages', 'Send messages to customers'),
('Messages', 'messages.history', 'Message History', 'View message history'),
('Messages', 'messages.bulk', 'Bulk Messages', 'Send bulk SMS/email')
ON CONFLICT (permission_key) DO NOTHING;

-- Tasks & Workflow
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Tasks', 'tasks.view', 'View Tasks', 'View assigned tasks'),
('Tasks', 'tasks.create', 'Create Tasks', 'Create new tasks'),
('Tasks', 'tasks.assign', 'Assign Tasks', 'Assign tasks to users'),
('Tasks', 'tasks.mytasks', 'My Tasks', 'View personal tasks'),
('Tasks', 'tasks.performance', 'Task Performance', 'View team performance metrics')
ON CONFLICT (permission_key) DO NOTHING;

-- Support & Help
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Support', 'support.view', 'View Support', 'Access support tickets'),
('Support', 'support.create', 'Create Tickets', 'Create support tickets'),
('Support', 'support.assign', 'Assign Tickets', 'Assign tickets to agents'),
('Support', 'support.kb', 'Knowledge Base', 'Manage knowledge base articles')
ON CONFLICT (permission_key) DO NOTHING;

-- Logs & Monitoring
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Logs', 'logs.view', 'View Logs', 'View system and activity logs'),
('Logs', 'logs.radius', 'RADIUS Logs', 'View RADIUS authentication logs'),
('Logs', 'logs.mpesa', 'M-Pesa Logs', 'View M-Pesa transaction logs'),
('Logs', 'logs.export', 'Export Logs', 'Export log data')
ON CONFLICT (permission_key) DO NOTHING;

-- Automation
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Automation', 'automation.view', 'View Automation', 'View automation rules'),
('Automation', 'automation.create', 'Create Automation', 'Create automation workflows'),
('Automation', 'automation.edit', 'Edit Automation', 'Modify automation rules')
ON CONFLICT (permission_key) DO NOTHING;

-- Settings & Configuration
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Settings', 'settings.view', 'View Settings', 'Access system settings'),
('Settings', 'settings.company', 'Company Settings', 'Manage company information'),
('Settings', 'settings.users', 'User Management', 'Manage users and roles'),
('Settings', 'settings.servers', 'Server Settings', 'Configure RADIUS and servers'),
('Settings', 'settings.portal', 'Portal Settings', 'Configure customer portal'),
('Settings', 'settings.payments', 'Payment Settings', 'Configure payment gateways'),
('Settings', 'settings.communications', 'Communication Settings', 'Configure SMS/email'),
('Settings', 'settings.automation', 'Automation Settings', 'Configure automation rules'),
('Settings', 'settings.backup', 'Backup Settings', 'Configure backups')
ON CONFLICT (permission_key) DO NOTHING;

-- Admin & System
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Admin', 'admin.database', 'Database Browser', 'Access database browser'),
('Admin', 'admin.health', 'Database Health', 'Monitor database health'),
('Admin', 'admin.schema', 'Initialize Schema', 'Run schema migrations'),
('Admin', 'admin.status', 'System Status', 'View system status'),
('Admin', 'admin.loyalty', 'Loyalty Program', 'Manage loyalty programs'),
('Admin', 'admin.suspensions', 'Manage Suspensions', 'Bulk suspend/unsuspend'),
('Admin', 'admin.verify', 'Verify System', 'Run system verification')
ON CONFLICT (permission_key) DO NOTHING;

-- Portal (Customer Portal)
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Portal', 'portal.manage', 'Manage Portal', 'Manage customer portal settings'),
('Portal', 'portal.view', 'View Portal Pages', 'View portal pages as customer')
ON CONFLICT (permission_key) DO NOTHING;

-- Import/Export
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Import', 'import.customers', 'Import Data', 'Import customer and service data'),
('Import', 'import.validate', 'Validate Imports', 'Validate import files')
ON CONFLICT (permission_key) DO NOTHING;

-- Setup & Onboarding
INSERT INTO permissions (module, permission_key, permission_name, description) VALUES
('Setup', 'setup.access', 'System Setup', 'Access system setup wizard'),
('Onboarding', 'onboarding.access', 'Onboarding', 'Access onboarding wizard')
ON CONFLICT (permission_key) DO NOTHING;

SELECT 'Permissions seeded successfully! Total permissions: ' || COUNT(*)::text FROM permissions;

-- Create comprehensive RBAC system tables

-- Enhanced users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles with hierarchical permissions
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL, -- Comma-separated permissions
    hierarchy_level INTEGER DEFAULT 0, -- Higher number = more permissions
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions for secure session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permission definitions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission mapping (for more granular control)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) REFERENCES user_roles(role_name) ON DELETE CASCADE,
    permission_key VARCHAR(100) REFERENCES permissions(permission_key) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_name, permission_key)
);

-- Authentication logs
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    action VARCHAR(50) NOT NULL, -- login, logout, failed_login, password_change, etc.
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);

-- Insert default permissions
INSERT INTO permissions (permission_key, display_name, description, module) VALUES
-- Customer Management
('customers.view', 'View Customers', 'View customer information and lists', 'customers'),
('customers.create', 'Create Customers', 'Add new customers to the system', 'customers'),
('customers.edit', 'Edit Customers', 'Modify customer information', 'customers'),
('customers.delete', 'Delete Customers', 'Remove customers from the system', 'customers'),
('customers.approve', 'Approve Customers', 'Approve pending customer registrations', 'customers'),

-- Billing & Finance
('billing.view', 'View Billing', 'View billing information and invoices', 'billing'),
('billing.create', 'Create Billing', 'Generate invoices and billing records', 'billing'),
('billing.edit', 'Edit Billing', 'Modify billing information', 'billing'),
('billing.delete', 'Delete Billing', 'Remove billing records', 'billing'),
('payments.process', 'Process Payments', 'Handle payment processing and reconciliation', 'billing'),
('invoices.generate', 'Generate Invoices', 'Create and send invoices', 'billing'),

-- Network Management
('network.view', 'View Network', 'View network status and configuration', 'network'),
('network.configure', 'Configure Network', 'Modify network settings and configuration', 'network'),
('network.monitor', 'Monitor Network', 'Access network monitoring tools', 'network'),
('devices.manage', 'Manage Devices', 'Add, configure, and manage network devices', 'network'),

-- Support System
('support.view', 'View Support', 'View support tickets and knowledge base', 'support'),
('support.create', 'Create Support', 'Create support tickets and articles', 'support'),
('support.assign', 'Assign Support', 'Assign tickets to support agents', 'support'),
('support.resolve', 'Resolve Support', 'Close and resolve support tickets', 'support'),

-- User Management
('users.view', 'View Users', 'View user accounts and information', 'users'),
('users.create', 'Create Users', 'Add new user accounts', 'users'),
('users.edit', 'Edit Users', 'Modify user account information', 'users'),
('users.delete', 'Delete Users', 'Remove user accounts', 'users'),
('roles.manage', 'Manage Roles', 'Create and modify user roles and permissions', 'users'),

-- System Administration
('system.config', 'System Configuration', 'Access system settings and configuration', 'system'),
('system.logs', 'System Logs', 'View system logs and audit trails', 'system'),
('system.backup', 'System Backup', 'Perform system backups and maintenance', 'system'),
('reports.view', 'View Reports', 'Access reports and analytics', 'reports'),

-- HR Management
('hr.view', 'View HR', 'View employee information and HR records', 'hr'),
('hr.manage', 'Manage HR', 'Manage employee records and HR processes', 'hr'),
('payroll.view', 'View Payroll', 'View payroll information', 'hr'),
('payroll.process', 'Process Payroll', 'Process employee payroll', 'hr'),

-- All permissions (super admin)
('*', 'All Permissions', 'Full system access', 'system')
ON CONFLICT (permission_key) DO NOTHING;

-- Insert default roles
INSERT INTO user_roles (role_name, display_name, description, permissions, hierarchy_level, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', '*', 100, TRUE),
('admin', 'Administrator', 'Administrative access to most system functions', 'customers.view,customers.create,customers.edit,customers.approve,billing.view,billing.create,billing.edit,payments.process,invoices.generate,network.view,network.configure,support.view,support.create,support.assign,support.resolve,users.view,users.create,users.edit,system.config,system.logs,reports.view', 90, TRUE),
('manager', 'Manager', 'Management access to assigned departments', 'customers.view,customers.edit,billing.view,billing.create,network.view,support.view,support.assign,users.view,reports.view', 70, TRUE),
('technician', 'Technician', 'Technical operations and network management', 'customers.view,network.view,network.configure,network.monitor,devices.manage,support.view,support.create', 50, TRUE),
('support_agent', 'Support Agent', 'Customer support and ticket management', 'customers.view,support.view,support.create,support.resolve', 40, TRUE),
('accountant', 'Accountant', 'Financial operations and billing management', 'customers.view,billing.view,billing.create,billing.edit,payments.process,invoices.generate,reports.view', 60, TRUE),
('hr_manager', 'HR Manager', 'Human resources management', 'hr.view,hr.manage,payroll.view,payroll.process,users.view,reports.view', 65, TRUE),
('customer', 'Customer', 'Customer portal access', 'customers.view', 10, TRUE)
ON CONFLICT (role_name) DO NOTHING;

-- Clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user last_login
CREATE OR REPLACE FUNCTION update_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action = 'login' AND NEW.success = TRUE THEN
        UPDATE users SET last_login = NOW() WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_login
    AFTER INSERT ON auth_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_login();

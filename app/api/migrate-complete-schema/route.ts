import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("[v0] Starting complete database schema migration...")

    const migrationQueries = [
      // Update existing customers table with missing columns
      `ALTER TABLE customers 
       ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
       ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
       ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
       ADD COLUMN IF NOT EXISTS date_of_birth DATE,
       ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
       ADD COLUMN IF NOT EXISTS national_id VARCHAR(50),
       ADD COLUMN IF NOT EXISTS alternate_email VARCHAR(255),
       ADD COLUMN IF NOT EXISTS vat_pin VARCHAR(50),
       ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
       ADD COLUMN IF NOT EXISTS business_reg_no VARCHAR(100),
       ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
       ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
       ADD COLUMN IF NOT EXISTS company_size VARCHAR(50),
       ADD COLUMN IF NOT EXISTS school_type VARCHAR(50),
       ADD COLUMN IF NOT EXISTS student_count INTEGER,
       ADD COLUMN IF NOT EXISTS staff_count INTEGER,
       ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly',
       ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true,
       ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true,
       ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50),
       ADD COLUMN IF NOT EXISTS equipment_needed TEXT,
       ADD COLUMN IF NOT EXISTS installation_notes TEXT,
       ADD COLUMN IF NOT EXISTS technical_contact VARCHAR(255),
       ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100),
       ADD COLUMN IF NOT EXISTS special_requirements TEXT,
       ADD COLUMN IF NOT EXISTS internal_notes TEXT,
       ADD COLUMN IF NOT EXISTS sales_rep VARCHAR(255),
       ADD COLUMN IF NOT EXISTS account_manager VARCHAR(255),
       ADD COLUMN IF NOT EXISTS physical_address TEXT,
       ADD COLUMN IF NOT EXISTS billing_address TEXT,
       ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100)`,

      // Update service_plans table with missing columns
      `ALTER TABLE service_plans 
       ADD COLUMN IF NOT EXISTS fup_limit_gb INTEGER,
       ADD COLUMN IF NOT EXISTS post_fup_speed VARCHAR(50),
       ADD COLUMN IF NOT EXISTS installation_fee DECIMAL(10,2) DEFAULT 0,
       ADD COLUMN IF NOT EXISTS equipment_fee DECIMAL(10,2) DEFAULT 0,
       ADD COLUMN IF NOT EXISTS contract_period INTEGER DEFAULT 12,
       ADD COLUMN IF NOT EXISTS early_termination_fee DECIMAL(10,2) DEFAULT 0,
       ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 16.00,
       ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'residential',
       ADD COLUMN IF NOT EXISTS features TEXT[],
       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,

      // Create employees table
      `CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        position VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        hire_date DATE NOT NULL,
        salary DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        manager_id INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create payroll table
      `CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        basic_salary DECIMAL(12,2) NOT NULL,
        overtime_hours DECIMAL(5,2) DEFAULT 0,
        overtime_rate DECIMAL(8,2) DEFAULT 0,
        allowances DECIMAL(10,2) DEFAULT 0,
        deductions DECIMAL(10,2) DEFAULT 0,
        tax_deductions DECIMAL(10,2) DEFAULT 0,
        net_pay DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        processed_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create leave_requests table
      `CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days_requested INTEGER NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER REFERENCES employees(id),
        approved_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create invoices table
      `CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        payment_status VARCHAR(20) DEFAULT 'unpaid',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create invoice_items table
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        service_plan_id INTEGER REFERENCES service_plans(id),
        description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create billing_cycles table
      `CREATE TABLE IF NOT EXISTS billing_cycles (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        cycle_start DATE NOT NULL,
        cycle_end DATE NOT NULL,
        amount_due DECIMAL(12,2) NOT NULL,
        amount_paid DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create customer_communications table
      `CREATE TABLE IF NOT EXISTS customer_communications (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'call', 'chat'
        direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'sent',
        sent_by INTEGER REFERENCES users(id),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create support_tickets table
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        category VARCHAR(50),
        assigned_to INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create ticket_responses table
      `CREATE TABLE IF NOT EXISTS ticket_responses (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create network_monitoring table
      `CREATE TABLE IF NOT EXISTS network_monitoring (
        id SERIAL PRIMARY KEY,
        device_id UUID REFERENCES network_devices(id) ON DELETE CASCADE,
        metric_type VARCHAR(50) NOT NULL, -- 'bandwidth', 'latency', 'uptime', 'packet_loss'
        value DECIMAL(15,4) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create customer_usage table
      `CREATE TABLE IF NOT EXISTS customer_usage (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        download_mb BIGINT DEFAULT 0,
        upload_mb BIGINT DEFAULT 0,
        total_mb BIGINT DEFAULT 0,
        peak_speed_mbps DECIMAL(8,2) DEFAULT 0,
        session_duration_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, date)
      )`,

      // Create service_outages table
      `CREATE TABLE IF NOT EXISTS service_outages (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        affected_areas TEXT[],
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status VARCHAR(20) DEFAULT 'ongoing',
        severity VARCHAR(20) DEFAULT 'medium',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create financial_accounts table
      `CREATE TABLE IF NOT EXISTS financial_accounts (
        id SERIAL PRIMARY KEY,
        account_name VARCHAR(255) NOT NULL,
        account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
        account_code VARCHAR(20) UNIQUE NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0,
        parent_account_id INTEGER REFERENCES financial_accounts(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create transactions table
      `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_date DATE NOT NULL,
        description TEXT NOT NULL,
        reference_number VARCHAR(100),
        debit_account_id INTEGER REFERENCES financial_accounts(id),
        credit_account_id INTEGER REFERENCES financial_accounts(id),
        amount DECIMAL(15,2) NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create inventory_items table
      `CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        item_code VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        unit_cost DECIMAL(10,2) NOT NULL,
        selling_price DECIMAL(10,2) NOT NULL,
        quantity_in_stock INTEGER DEFAULT 0,
        minimum_stock_level INTEGER DEFAULT 0,
        supplier VARCHAR(255),
        location VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create inventory_movements table
      `CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
        movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment'
        quantity INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(12,2) NOT NULL,
        reference_number VARCHAR(100),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create system_logs table
      `CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        log_level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'debug'
        module VARCHAR(100) NOT NULL,
        action VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        ip_address INET,
        user_agent TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        action_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )`,

      // Create reports table
      `CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        report_name VARCHAR(255) NOT NULL,
        report_type VARCHAR(100) NOT NULL,
        parameters TEXT, -- JSON string
        generated_by INTEGER REFERENCES users(id),
        file_path VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create audit_trail table
      `CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
        old_values TEXT, -- JSON string
        new_values TEXT, -- JSON string
        user_id INTEGER REFERENCES users(id),
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create customer_phone_numbers table for multiple phone numbers
      `CREATE TABLE IF NOT EXISTS customer_phone_numbers (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) NOT NULL,
        phone_type VARCHAR(20) DEFAULT 'primary', -- 'primary', 'secondary', 'emergency'
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create customer_emergency_contacts table
      `CREATE TABLE IF NOT EXISTS customer_emergency_contacts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        contact_name VARCHAR(255) NOT NULL,
        relationship VARCHAR(100),
        phone_number VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ]

    // Execute all migration queries
    for (const query of migrationQueries) {
      console.log("[v0] Executing migration query...")
      await sql(query)
    }

    const indexQueries = [
      // Customer indexes
      `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)`,

      // Payment indexes
      `CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method)`,

      // Service indexes
      `CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customer_services_plan_id ON customer_services(service_plan_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customer_services_status ON customer_services(status)`,

      // Network indexes
      `CREATE INDEX IF NOT EXISTS idx_ip_addresses_customer_id ON ip_addresses(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status)`,
      `CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status)`,
      `CREATE INDEX IF NOT EXISTS idx_network_devices_type ON network_devices(type)`,

      // HR indexes
      `CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)`,
      `CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)`,
      `CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id)`,

      // Billing indexes
      `CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
      `CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_billing_cycles_customer_id ON billing_cycles(customer_id)`,

      // Support indexes
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`,
      `CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to)`,

      // Communication indexes
      `CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON customer_communications(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customer_communications_type ON customer_communications(type)`,

      // Usage indexes
      `CREATE INDEX IF NOT EXISTS idx_customer_usage_customer_id ON customer_usage(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customer_usage_date ON customer_usage(date)`,

      // System indexes
      `CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_system_logs_module ON system_logs(module)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trail_table_name ON audit_trail(table_name)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trail_record_id ON audit_trail(record_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`,
    ]

    // Execute index creation queries
    for (const indexQuery of indexQueries) {
      console.log("[v0] Creating index...")
      await sql(indexQuery)
    }

    const sampleDataQueries = [
      // Insert sample employees
      `INSERT INTO employees (employee_id, first_name, last_name, email, phone, position, department, hire_date, salary, status)
       VALUES 
       ('EMP001', 'John', 'Doe', 'john.doe@company.com', '+254712345678', 'Network Engineer', 'Technical', '2023-01-15', 80000, 'active'),
       ('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', '+254723456789', 'Customer Service Manager', 'Support', '2023-02-01', 65000, 'active'),
       ('EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', '+254734567890', 'Sales Representative', 'Sales', '2023-03-10', 55000, 'active')
       ON CONFLICT (employee_id) DO NOTHING`,

      // Insert sample financial accounts
      `INSERT INTO financial_accounts (account_name, account_type, account_code, balance)
       VALUES 
       ('Cash in Hand', 'asset', '1001', 50000),
       ('Bank Account', 'asset', '1002', 500000),
       ('Accounts Receivable', 'asset', '1003', 200000),
       ('Equipment', 'asset', '1004', 1000000),
       ('Revenue', 'revenue', '4001', 0),
       ('Operating Expenses', 'expense', '5001', 0)
       ON CONFLICT (account_code) DO NOTHING`,

      // Insert sample inventory items
      `INSERT INTO inventory_items (item_name, item_code, category, description, unit_cost, selling_price, quantity_in_stock, minimum_stock_level, supplier, location)
       VALUES 
       ('Wireless Router', 'RTR001', 'Network Equipment', 'High-speed wireless router', 5000, 8000, 25, 5, 'TechSupply Ltd', 'Main Warehouse'),
       ('Ethernet Cable (Cat6)', 'CBL001', 'Cables', '100m Cat6 ethernet cable', 2000, 3500, 50, 10, 'CableWorks', 'Main Warehouse'),
       ('Network Switch 24-port', 'SWT001', 'Network Equipment', '24-port managed switch', 15000, 25000, 10, 2, 'NetworkPro', 'Main Warehouse')
       ON CONFLICT (item_code) DO NOTHING`,
    ]

    // Execute sample data queries
    for (const dataQuery of sampleDataQueries) {
      console.log("[v0] Inserting sample data...")
      await sql(dataQuery)
    }

    console.log("[v0] Database migration completed successfully")

    return Response.json({
      success: true,
      message: "Complete database schema migration executed successfully",
      tablesCreated: [
        "employees",
        "payroll",
        "leave_requests",
        "invoices",
        "invoice_items",
        "billing_cycles",
        "customer_communications",
        "support_tickets",
        "ticket_responses",
        "network_monitoring",
        "customer_usage",
        "service_outages",
        "financial_accounts",
        "transactions",
        "inventory_items",
        "inventory_movements",
        "system_logs",
        "notifications",
        "reports",
        "audit_trail",
        "customer_phone_numbers",
        "customer_emergency_contacts",
      ],
      tablesUpdated: ["customers", "service_plans"],
      indexesCreated: 25,
      sampleDataInserted: true,
    })
  } catch (error) {
    console.error("[v0] Database migration error:", error)
    return Response.json(
      {
        success: false,
        error: "Database migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

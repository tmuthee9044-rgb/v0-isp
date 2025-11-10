import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("[v0] Starting database migration...")

    const migrations = [
      // HR Management Tables
      `CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        position VARCHAR(100),
        salary DECIMAL(12,2),
        hire_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        pay_period_start DATE,
        pay_period_end DATE,
        basic_salary DECIMAL(12,2),
        allowances DECIMAL(12,2) DEFAULT 0,
        deductions DECIMAL(12,2) DEFAULT 0,
        gross_pay DECIMAL(12,2),
        tax DECIMAL(12,2),
        nhif DECIMAL(12,2),
        nssf DECIMAL(12,2),
        net_pay DECIMAL(12,2),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        leave_type VARCHAR(50),
        start_date DATE,
        end_date DATE,
        days_requested INTEGER,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Billing and Finance Tables
      `CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        invoice_number VARCHAR(50) UNIQUE,
        amount DECIMAL(12,2),
        tax_amount DECIMAL(12,2),
        total_amount DECIMAL(12,2),
        due_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        description TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(12,2),
        total_price DECIMAL(12,2)
      )`,

      `CREATE TABLE IF NOT EXISTS billing_cycles (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        cycle_start DATE,
        cycle_end DATE,
        amount_due DECIMAL(12,2),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Support and Communications
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        title VARCHAR(255),
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        assigned_to INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        sender_type VARCHAR(20), -- 'customer' or 'admin'
        sender_id INTEGER,
        message_type VARCHAR(20), -- 'email', 'sms', 'internal'
        subject VARCHAR(255),
        content TEXT,
        status VARCHAR(20) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Network Monitoring
      `CREATE TABLE IF NOT EXISTS network_monitoring (
        id SERIAL PRIMARY KEY,
        device_id UUID REFERENCES network_devices(id),
        metric_type VARCHAR(50), -- 'bandwidth', 'latency', 'uptime'
        value DECIMAL(10,2),
        unit VARCHAR(20),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS customer_usage (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        date DATE,
        download_mb DECIMAL(12,2) DEFAULT 0,
        upload_mb DECIMAL(12,2) DEFAULT 0,
        total_mb DECIMAL(12,2) DEFAULT 0,
        peak_speed_mbps DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Inventory Management
      `CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        category VARCHAR(100),
        sku VARCHAR(100) UNIQUE,
        quantity INTEGER DEFAULT 0,
        unit_cost DECIMAL(12,2),
        supplier VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS equipment_assignments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        inventory_item_id INTEGER REFERENCES inventory_items(id),
        serial_number VARCHAR(255),
        assigned_date DATE,
        status VARCHAR(20) DEFAULT 'assigned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Financial Accounting
      `CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        account_code VARCHAR(20) UNIQUE,
        account_name VARCHAR(255),
        account_type VARCHAR(50), -- 'asset', 'liability', 'equity', 'revenue', 'expense'
        parent_account_id INTEGER REFERENCES accounts(id),
        balance DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_date DATE,
        description TEXT,
        reference VARCHAR(100),
        total_amount DECIMAL(15,2),
        created_by INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS transaction_entries (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES transactions(id),
        account_id INTEGER REFERENCES accounts(id),
        debit_amount DECIMAL(15,2) DEFAULT 0,
        credit_amount DECIMAL(15,2) DEFAULT 0
      )`,

      // System Audit and Logs
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100),
        table_name VARCHAR(100),
        record_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20), -- 'info', 'warning', 'error', 'critical'
        message TEXT,
        module VARCHAR(100),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Service Extensions and Suspensions
      `CREATE TABLE IF NOT EXISTS service_extensions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        service_id INTEGER REFERENCES customer_services(id),
        extension_days INTEGER,
        reason TEXT,
        amount DECIMAL(12,2),
        include_in_invoice BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS service_suspensions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        service_id INTEGER REFERENCES customer_services(id),
        suspension_reason TEXT,
        suspended_until DATE,
        suspended_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reactivated_at TIMESTAMP
      )`,
    ]

    // Execute all migrations
    for (let i = 0; i < migrations.length; i++) {
      console.log(`[v0] Executing migration ${i + 1}/${migrations.length}`)
      await sql`${migrations[i]}`
    }

    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)",
      "CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)",
      "CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)",
      "CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)",
      "CREATE INDEX IF NOT EXISTS idx_messages_customer ON messages(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_customer_usage_date ON customer_usage(date)",
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)",
    ]

    for (const index of indexes) {
      await sql`${index}`
    }

    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    if (customerCount[0].count === "0") {
      await sql`
        INSERT INTO customers (name, email, phone, address, customer_type, status, plan, monthly_fee, balance)
        VALUES 
        ('John Doe', 'john@example.com', '+254712345678', 'Nairobi, Kenya', 'individual', 'active', 'Premium', 5000, 0),
        ('Jane Smith', 'jane@example.com', '+254723456789', 'Mombasa, Kenya', 'individual', 'active', 'Basic', 2500, -500),
        ('ABC Company Ltd', 'info@abc.co.ke', '+254734567890', 'Kisumu, Kenya', 'business', 'active', 'Business', 15000, 2000)
      `
    }

    // Insert sample employees if empty
    const employeeCount = await sql`SELECT COUNT(*) as count FROM employees`
    if (employeeCount[0].count === "0") {
      await sql`
        INSERT INTO employees (employee_id, first_name, last_name, email, department, position, salary, hire_date)
        VALUES 
        ('EMP001', 'Admin', 'User', 'admin@trustwaves.co.ke', 'IT', 'System Administrator', 80000, '2024-01-01'),
        ('EMP002', 'Support', 'Agent', 'support@trustwaves.co.ke', 'Customer Service', 'Support Agent', 45000, '2024-01-15')
      `
    }

    console.log("[v0] Database migration completed successfully")

    return Response.json({
      success: true,
      message: "Database migration completed successfully",
      tablesCreated: migrations.length,
      indexesCreated: indexes.length,
    })
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

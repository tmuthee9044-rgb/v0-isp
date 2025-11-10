import { neon } from "@neondatabase/serverless"

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    console.log("[v0] Starting Neon database migration...")

    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        position VARCHAR(100),
        hire_date DATE,
        salary DECIMAL(12,2),
        status VARCHAR(20) DEFAULT 'active',
        manager_id INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        basic_salary DECIMAL(12,2),
        allowances DECIMAL(12,2) DEFAULT 0,
        deductions DECIMAL(12,2) DEFAULT 0,
        tax_deduction DECIMAL(12,2) DEFAULT 0,
        net_pay DECIMAL(12,2),
        status VARCHAR(20) DEFAULT 'pending',
        processed_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        assigned_to INTEGER REFERENCES employees(id),
        created_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS communications (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'call'
        direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
        subject VARCHAR(255),
        message TEXT,
        status VARCHAR(20) DEFAULT 'sent',
        sent_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        amount DECIMAL(12,2) NOT NULL,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL,
        due_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        payment_terms VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        description VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(12,2) NOT NULL,
        total_price DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS network_monitoring (
        id SERIAL PRIMARY KEY,
        device_id UUID REFERENCES network_devices(id),
        metric_type VARCHAR(50) NOT NULL, -- 'bandwidth', 'latency', 'uptime'
        value DECIMAL(10,2),
        unit VARCHAR(20),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'normal'
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS customer_usage (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        date DATE NOT NULL,
        download_mb DECIMAL(12,2) DEFAULT 0,
        upload_mb DECIMAL(12,2) DEFAULT 0,
        total_mb DECIMAL(12,2) DEFAULT 0,
        peak_speed_mbps DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        model VARCHAR(100),
        serial_number VARCHAR(100) UNIQUE,
        status VARCHAR(20) DEFAULT 'available',
        location VARCHAR(255),
        purchase_date DATE,
        purchase_price DECIMAL(12,2),
        assigned_to INTEGER REFERENCES customers(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100),
        record_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS financial_accounts (
        id SERIAL PRIMARY KEY,
        account_name VARCHAR(255) NOT NULL,
        account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
        account_code VARCHAR(20) UNIQUE,
        balance DECIMAL(15,2) DEFAULT 0,
        parent_account_id INTEGER REFERENCES financial_accounts(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_date DATE NOT NULL,
        description VARCHAR(255) NOT NULL,
        reference_number VARCHAR(100),
        debit_account_id INTEGER REFERENCES financial_accounts(id),
        credit_account_id INTEGER REFERENCES financial_accounts(id),
        amount DECIMAL(15,2) NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS service_extensions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        service_id INTEGER REFERENCES customer_services(id),
        extension_days INTEGER NOT NULL,
        reason VARCHAR(255),
        amount DECIMAL(12,2),
        include_in_invoice BOOLEAN DEFAULT false,
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS service_suspensions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        service_id INTEGER REFERENCES customer_services(id),
        suspension_reason VARCHAR(255),
        suspended_from DATE NOT NULL,
        suspended_until DATE,
        suspended_by INTEGER REFERENCES users(id),
        reactivated_at TIMESTAMP,
        reactivated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_communications_customer ON communications(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_usage_customer ON customer_usage(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_usage_date ON customer_usage(date)`

    await sql`
      INSERT INTO employees (employee_id, first_name, last_name, email, department, position, salary)
      VALUES 
        ('EMP001', 'John', 'Doe', 'john.doe@trustwaves.com', 'Technical', 'Network Engineer', 80000),
        ('EMP002', 'Jane', 'Smith', 'jane.smith@trustwaves.com', 'Customer Service', 'Support Manager', 65000),
        ('EMP003', 'Mike', 'Johnson', 'mike.johnson@trustwaves.com', 'Sales', 'Sales Representative', 55000)
      ON CONFLICT (employee_id) DO NOTHING
    `

    await sql`
      INSERT INTO financial_accounts (account_name, account_type, account_code)
      VALUES 
        ('Cash', 'asset', '1001'),
        ('Accounts Receivable', 'asset', '1002'),
        ('Equipment', 'asset', '1003'),
        ('Service Revenue', 'revenue', '4001'),
        ('Operating Expenses', 'expense', '5001')
      ON CONFLICT (account_code) DO NOTHING
    `

    console.log("[v0] Database migration completed successfully")

    return Response.json({
      success: true,
      message: "Database migration completed successfully",
      tablesCreated: [
        "employees",
        "payroll",
        "support_tickets",
        "communications",
        "invoices",
        "invoice_items",
        "network_monitoring",
        "customer_usage",
        "inventory",
        "audit_logs",
        "financial_accounts",
        "transactions",
        "service_extensions",
        "service_suspensions",
      ],
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

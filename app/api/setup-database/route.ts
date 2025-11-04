import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    const results = []

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          employee_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          position VARCHAR(100),
          department VARCHAR(100),
          salary DECIMAL(12,2),
          hire_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `
      results.push("✓ Employees table created")
    } catch (error) {
      results.push(`✗ Employees table error: ${error}`)
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS payroll (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES employees(id),
          pay_period_start DATE,
          pay_period_end DATE,
          basic_salary DECIMAL(12,2),
          allowances DECIMAL(12,2) DEFAULT 0,
          deductions DECIMAL(12,2) DEFAULT 0,
          paye_tax DECIMAL(12,2) DEFAULT 0,
          nssf DECIMAL(12,2) DEFAULT 0,
          nhif DECIMAL(12,2) DEFAULT 0,
          net_pay DECIMAL(12,2),
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      results.push("✓ Payroll table created")
    } catch (error) {
      results.push(`✗ Payroll table error: ${error}`)
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS leave_requests (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES employees(id),
          leave_type VARCHAR(50),
          start_date DATE,
          end_date DATE,
          days_requested INTEGER,
          reason TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          approved_by INTEGER REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      results.push("✓ Leave requests table created")
    } catch (error) {
      results.push(`✗ Leave requests table error: ${error}`)
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          invoice_number VARCHAR(50) UNIQUE,
          amount DECIMAL(12,2),
          tax_amount DECIMAL(12,2) DEFAULT 0,
          total_amount DECIMAL(12,2),
          due_date DATE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          paid_at TIMESTAMP
        )
      `
      results.push("✓ Invoices table created")
    } catch (error) {
      results.push(`✗ Invoices table error: ${error}`)
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS tickets (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          title VARCHAR(255),
          description TEXT,
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(20) DEFAULT 'open',
          assigned_to INTEGER REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `
      results.push("✓ Tickets table created")
    } catch (error) {
      results.push(`✗ Tickets table error: ${error}`)
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS analytics (
          id SERIAL PRIMARY KEY,
          metric_name VARCHAR(100),
          metric_value DECIMAL(15,2),
          metric_date DATE,
          category VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      results.push("✓ Analytics table created")
    } catch (error) {
      results.push(`✗ Analytics table error: ${error}`)
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          action VARCHAR(100),
          table_name VARCHAR(50),
          record_id INTEGER,
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      results.push("✓ Audit logs table created")
    } catch (error) {
      results.push(`✗ Audit logs table error: ${error}`)
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          sender_type VARCHAR(20),
          message_type VARCHAR(20),
          subject VARCHAR(255),
          content TEXT,
          status VARCHAR(20) DEFAULT 'sent',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      results.push("✓ Messages table created")
    } catch (error) {
      results.push(`✗ Messages table error: ${error}`)
    }

    try {
      const existingPlans = await sql`SELECT COUNT(*) as count FROM service_plans`
      if (existingPlans[0].count === 0) {
        await sql`
          INSERT INTO service_plans (name, description, speed, price, status) VALUES
          ('Basic Plan', '10 Mbps unlimited internet', '10 Mbps', 2500.00, 'active'),
          ('Standard Plan', '25 Mbps unlimited internet', '25 Mbps', 4500.00, 'active'),
          ('Premium Plan', '50 Mbps unlimited internet', '50 Mbps', 7500.00, 'active'),
          ('Business Plan', '100 Mbps unlimited internet', '100 Mbps', 12000.00, 'active')
        `
        results.push("✓ Sample service plans inserted")
      }
    } catch (error) {
      results.push(`✗ Service plans sample data error: ${error}`)
    }

    return NextResponse.json({
      success: true,
      message: "Database setup completed",
      results: results,
    })
  } catch (error) {
    console.error("Database setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database setup failed: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Database setup endpoint. Use POST to create missing tables.",
  })
}

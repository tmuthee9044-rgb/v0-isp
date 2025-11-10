import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Creating service_plans table...")

    // Create service_plans table
    await sql`
      CREATE TABLE IF NOT EXISTS service_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        speed_mbps INTEGER NOT NULL,
        fup_limit_gb INTEGER,
        post_fup_speed_mbps INTEGER,
        price DECIMAL(10,2) NOT NULL,
        setup_fee DECIMAL(10,2) DEFAULT 0,
        vat_rate DECIMAL(5,2) DEFAULT 16.00,
        contract_period INTEGER DEFAULT 12,
        is_active BOOLEAN DEFAULT true,
        features JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_service_plans_active ON service_plans(is_active)`
    await sql`CREATE INDEX IF NOT EXISTS idx_service_plans_price ON service_plans(price)`

    // Insert sample service plans
    await sql`
      INSERT INTO service_plans (name, description, speed_mbps, fup_limit_gb, post_fup_speed_mbps, price, setup_fee, features)
      VALUES 
        ('Basic Home', 'Perfect for light browsing and social media', 10, 50, 2, 2500.00, 1000.00, '["Email Support", "Basic Router"]'),
        ('Standard Home', 'Great for streaming and video calls', 25, 100, 5, 4500.00, 1500.00, '["24/7 Support", "WiFi Router", "Static IP"]'),
        ('Premium Home', 'Ideal for heavy usage and gaming', 50, 200, 10, 7500.00, 2000.00, '["Priority Support", "Advanced Router", "Static IP", "Port Forwarding"]'),
        ('Business Starter', 'Small business internet solution', 30, 150, 8, 8500.00, 3000.00, '["Business Support", "SLA Guarantee", "Static IP", "Email Hosting"]'),
        ('Business Pro', 'Professional business connectivity', 100, 500, 20, 15000.00, 5000.00, '["Dedicated Support", "99.9% SLA", "Multiple IPs", "VPN Access"]'),
        ('Enterprise', 'High-performance enterprise solution', 200, 1000, 50, 25000.00, 10000.00, '["24/7 Dedicated Support", "99.99% SLA", "Dedicated Line", "Custom Solutions"]')
      ON CONFLICT (id) DO NOTHING
    `

    // Create customer_services table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS customer_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        service_plan_id UUID REFERENCES service_plans(id),
        status VARCHAR(50) DEFAULT 'active',
        installation_date DATE,
        monthly_fee DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_customer ON customer_services(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_services_plan ON customer_services(service_plan_id)`

    console.log("Service plans table created successfully!")

    return NextResponse.json({
      success: true,
      message: "Service plans table created successfully with sample data",
    })
  } catch (error) {
    console.error("Error creating service plans table:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Check if table exists and return sample data
    const plans = await sql`SELECT * FROM service_plans ORDER BY price ASC`

    return NextResponse.json({
      success: true,
      message: "Service plans table exists",
      plans: plans.length,
      data: plans,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Service plans table does not exist. Use POST to create it.",
      },
      { status: 404 },
    )
  }
}

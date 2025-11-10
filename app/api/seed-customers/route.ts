import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    const existingCustomers = await sql`SELECT COUNT(*) as count FROM customers`

    if (existingCustomers[0].count === "0") {
      await sql`
        INSERT INTO customers (
          name, email, phone, address, status, customer_type, plan, 
          monthly_fee, balance, connection_quality, portal_username, 
          portal_password, portal_login_id, installation_date, 
          contract_end_date, last_payment_date
        ) VALUES 
        ('John Doe', 'john@example.com', '+254712345678', '123 Nairobi Street, Nairobi', 'active', 'residential', 'Premium 50Mbps', 5000, 0, 'excellent', 'john_doe', 'password123', 'JD001', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', CURRENT_DATE),
        ('Jane Smith', 'jane@example.com', '+254723456789', '456 Mombasa Road, Mombasa', 'active', 'business', 'Business 100Mbps', 8000, -1500, 'good', 'jane_smith', 'password456', 'JS002', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '2 years', CURRENT_DATE - INTERVAL '15 days'),
        ('Bob Wilson', 'bob@example.com', '+254734567890', '789 Kisumu Avenue, Kisumu', 'suspended', 'residential', 'Basic 20Mbps', 3000, -3000, 'poor', 'bob_wilson', 'password789', 'BW003', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '6 months', CURRENT_DATE - INTERVAL '45 days')
      `

      return Response.json({
        success: true,
        message: "Sample customers created successfully",
        customers: 3,
      })
    } else {
      return Response.json({
        success: true,
        message: "Customers already exist",
        customers: existingCustomers[0].count,
      })
    }
  } catch (error) {
    console.error("Error seeding customers:", error)
    return Response.json(
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
    const customers = await sql`SELECT * FROM customers ORDER BY id`
    return Response.json({ customers })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

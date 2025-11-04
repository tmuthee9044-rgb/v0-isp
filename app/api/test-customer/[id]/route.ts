import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return Response.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    // Test database connectivity
    const connectionTest = await sql`SELECT 1 as test`
    console.log("[v0] Database connection test:", connectionTest)

    // Check if customers table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customers'
      )
    `
    console.log("[v0] Customers table exists:", tableCheck[0].exists)

    // Get all customers to see what's available
    const allCustomers = await sql`SELECT id, name FROM customers ORDER BY id`
    console.log("[v0] All customers:", allCustomers)

    // Try to get the specific customer
    const customer = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `
    console.log("[v0] Customer with ID", customerId, ":", customer)

    return Response.json({
      success: true,
      customerId,
      customerExists: customer.length > 0,
      customer: customer[0] || null,
      allCustomers,
      tableExists: tableCheck[0].exists,
    })
  } catch (error) {
    console.error("[v0] Error in customer test:", error)
    return Response.json(
      {
        error: "Database error",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    // Get customer details
    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    if (customer.status === "active") {
      return NextResponse.json({ error: "Customer is already active" }, { status: 400 })
    }

    // Update customer status
    await sql`
      UPDATE customers 
      SET status = 'active', updated_at = NOW()
      WHERE id = ${customerId}
    `

    // Activate suspended services
    await sql`
      UPDATE customer_services 
      SET status = 'active', updated_at = NOW()
      WHERE customer_id = ${customerId} AND status IN ('suspended', 'inactive')
    `

    // TODO: Add MikroTik API call to restore customer traffic
    // This would integrate with the router to restore the customer's internet access

    await ActivityLogger.logAdminActivity(`Customer activated: ${customer.first_name} ${customer.last_name}`, "admin", {
      customer_id: customerId,
      previous_status: customer.status,
      new_status: "active",
      action: "activate_customer",
    })

    return NextResponse.json({
      success: true,
      message: "Customer activated successfully",
    })
  } catch (error) {
    console.error("Activate customer error:", error)
    return NextResponse.json({ error: "Failed to activate customer" }, { status: 500 })
  }
}

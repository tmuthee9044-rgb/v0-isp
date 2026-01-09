import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const suspendedCustomers = await sql`
      SELECT 
        c.id,
        CONCAT(c.first_name, ' ', c.last_name) as name,
        c.email,
        c.phone,
        cs.suspension_reason,
        cs.suspended_at,
        cs.suspended_by,
        EXTRACT(DAY FROM (NOW() - cs.suspended_at)) as days_suspended,
        COALESCE(ab.balance, 0) as overdue_amount,
        sp.name as service_type,
        cs.status
      FROM customer_services cs
      JOIN customers c ON cs.customer_id = c.id
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN account_balances ab ON c.id = ab.customer_id
      WHERE cs.status = 'suspended'
      ORDER BY cs.suspended_at DESC
    `

    const formattedCustomers = suspendedCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      suspensionReason: customer.suspension_reason,
      suspendedAt: customer.suspended_at,
      suspendedBy: customer.suspended_by || "System",
      daysSuspended: Math.floor(customer.days_suspended) || 0,
      overdueAmount: Number.parseFloat(customer.overdue_amount) || 0,
      serviceType: customer.service_type,
      status: customer.status,
    }))

    return NextResponse.json({ success: true, data: formattedCustomers })
  } catch (error) {
    console.error("Error fetching suspended customers:", error)
    return NextResponse.json({ error: "Failed to fetch suspended customers" }, { status: 500 })
  }
}

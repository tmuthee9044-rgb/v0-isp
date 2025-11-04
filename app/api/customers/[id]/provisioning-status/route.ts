import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    // Get customer with service status
    const [customer] = await sql`
      SELECT 
        c.*,
        COUNT(cs.id) as total_services,
        COUNT(CASE WHEN cs.status = 'active' THEN 1 END) as active_services,
        COUNT(CASE WHEN cs.status = 'suspended' THEN 1 END) as suspended_services,
        COUNT(CASE WHEN cs.router_sync_status = 'failed' THEN 1 END) as failed_syncs
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      WHERE c.id = ${customerId}
      GROUP BY c.id
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Get detailed service status
    const services = await sql`
      SELECT 
        cs.*,
        sp.name as service_name,
        sp.service_type
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId}
      ORDER BY cs.created_at DESC
    `

    // Get recent router logs
    const recentLogs = await sql`
      SELECT *
      FROM router_logs
      WHERE customer_id = ${customerId}
      ORDER BY executed_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        total_services: Number(customer.total_services),
        active_services: Number(customer.active_services),
        suspended_services: Number(customer.suspended_services),
        failed_syncs: Number(customer.failed_syncs),
      },
      services,
      recentLogs,
    })
  } catch (error) {
    console.error("Error fetching provisioning status:", error)
    return NextResponse.json({ error: "Failed to fetch provisioning status" }, { status: 500 })
  }
}

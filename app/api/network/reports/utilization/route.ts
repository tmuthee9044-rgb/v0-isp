import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location")

    const utilization = await sql`
      SELECT 
        nd.name as router_name,
        nd.location as location,
        COUNT(DISTINCT ip.id) as total_ips,
        COUNT(DISTINCT CASE WHEN ip.status = 'assigned' THEN ip.id END) as assigned_ips,
        CASE 
          WHEN COUNT(DISTINCT ip.id) = 0 THEN 0
          ELSE ROUND((COUNT(DISTINCT CASE WHEN ip.status = 'assigned' THEN ip.id END)::float / COUNT(DISTINCT ip.id)::float) * 100)
        END as utilization_percentage,
        COUNT(DISTINCT CASE WHEN cs.status = 'active' THEN cs.customer_id END) as active_customers
      FROM network_devices nd
      LEFT JOIN ip_subnets s ON nd.id = s.router_id
      LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
      LEFT JOIN customer_services cs ON ip.customer_id = cs.customer_id AND cs.status = 'active'
      WHERE nd.type = 'router' ${location && location !== "all" ? sql`AND nd.location = ${location}` : sql``}
      GROUP BY nd.id, nd.name, nd.location
      ORDER BY utilization_percentage DESC
    `

    return NextResponse.json(utilization)
  } catch (error) {
    console.error("Failed to fetch utilization data:", error)
    return NextResponse.json({ error: "Failed to fetch utilization data" }, { status: 500 })
  }
}

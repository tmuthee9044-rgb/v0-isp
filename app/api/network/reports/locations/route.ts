import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location")

    let locations
    if (location && location !== "all") {
      locations = await sql`
        SELECT 
          l.name as location,
          COUNT(DISTINCT nd.id) as router_count,
          COUNT(DISTINCT c.id) as customer_count,
          COALESCE(SUM(sp.download_speed), 0) as total_bandwidth,
          CASE 
            WHEN COUNT(ip.id) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END)::float / COUNT(ip.id)::float) * 100)
          END as avg_utilization
        FROM locations l
        LEFT JOIN network_devices nd ON l.name = nd.location AND nd.type = 'router'
        LEFT JOIN ip_subnets s ON nd.id = s.router_id
        LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
        LEFT JOIN customers c ON l.name = c.city
        LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE l.name = ${location}
        GROUP BY l.id, l.name
        ORDER BY customer_count DESC
      `
    } else {
      locations = await sql`
        SELECT 
          l.name as location,
          COUNT(DISTINCT nd.id) as router_count,
          COUNT(DISTINCT c.id) as customer_count,
          COALESCE(SUM(sp.download_speed), 0) as total_bandwidth,
          CASE 
            WHEN COUNT(ip.id) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END)::float / COUNT(ip.id)::float) * 100)
          END as avg_utilization
        FROM locations l
        LEFT JOIN network_devices nd ON l.name = nd.location AND nd.type = 'router'
        LEFT JOIN ip_subnets s ON nd.id = s.router_id
        LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
        LEFT JOIN customers c ON l.name = c.city
        LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        GROUP BY l.id, l.name
        ORDER BY customer_count DESC
      `
    }

    return NextResponse.json(locations)
  } catch (error) {
    console.error("Failed to fetch location data:", error)
    return NextResponse.json({ error: "Failed to fetch location data" }, { status: 500 })
  }
}

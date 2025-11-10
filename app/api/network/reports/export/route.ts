import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const location = searchParams.get("location")

    let locationFilter = ""
    if (location && location !== "all") {
      locationFilter = `AND l.name = '${location}'`
    }

    let data: any[] = []
    let headers: string[] = []
    let filename = "report"

    switch (type) {
      case "utilization":
        data = await sql`
          SELECT 
            nd.name as router_name,
            l.name as location,
            COUNT(ip.id) as total_ips,
            COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END) as assigned_ips,
            CASE 
              WHEN COUNT(ip.id) = 0 THEN 0
              ELSE ROUND((COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END)::float / COUNT(ip.id)::float) * 100)
            END as utilization_percentage,
            COUNT(DISTINCT cs.customer_id) as active_customers
          FROM network_devices nd
          JOIN locations l ON nd.location = l.name
          -- Fixed join to use router_id instead of device_id
          LEFT JOIN subnets s ON nd.id = s.router_id
          LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
          LEFT JOIN customer_services cs ON nd.id = cs.router_id AND cs.status = 'active'
          WHERE nd.type = 'router' ${location && location !== "all" ? sql`AND l.name = ${location}` : sql``}
          GROUP BY nd.id, nd.name, l.name
          ORDER BY utilization_percentage DESC
        `
        headers = ["Router Name", "Location", "Total IPs", "Assigned IPs", "Utilization %", "Active Customers"]
        filename = "router-utilization"
        break

      case "locations":
        data = await sql`
          SELECT 
            l.name as location,
            COUNT(DISTINCT nd.id) as router_count,
            COUNT(DISTINCT cs.customer_id) as customer_count,
            -- Fixed to use download_speed from service_plans instead of bandwidth_mbps from service_packages
            COALESCE(SUM(sp.download_speed), 0) as total_bandwidth,
            CASE 
              WHEN COUNT(ip.id) = 0 THEN 0
              ELSE ROUND((COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END)::float / COUNT(ip.id)::float) * 100)
            END as avg_utilization
          FROM locations l
          LEFT JOIN network_devices nd ON l.name = nd.location AND nd.type = 'router'
          LEFT JOIN customer_services cs ON nd.id = cs.router_id AND cs.status = 'active'
          -- Fixed table name from service_packages to service_plans and column from service_package_id to service_plan_id
          LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
          -- Fixed join to use router_id instead of device_id
          LEFT JOIN subnets s ON nd.id = s.router_id
          LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
          WHERE 1=1 ${location && location !== "all" ? sql`AND l.name = ${location}` : sql``}
          GROUP BY l.id, l.name
          ORDER BY customer_count DESC
        `
        headers = ["Location", "Router Count", "Customer Count", "Total Bandwidth", "Avg Utilization %"]
        filename = "location-analytics"
        break

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    // Convert to CSV
    const csvContent = [headers.join(","), ...data.map((row) => Object.values(row).join(","))].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Failed to export report:", error)
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 })
  }
}

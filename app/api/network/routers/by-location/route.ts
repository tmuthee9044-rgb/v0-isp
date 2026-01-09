import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getDatabaseConnection() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL

  if (!databaseUrl) {
    throw new Error("No database connection string found")
  }

  return neon(databaseUrl)
}

const sql = getDatabaseConnection()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get("location_id")
    const customerId = searchParams.get("customer_id")

    let routers

    if (customerId) {
      // Get routers based on customer's location
      routers = await sql`
        SELECT 
          nd.*,
          l.name as location_name,
          l.address as location_address,
          COUNT(s.id) as subnet_count,
          COUNT(ip.id) as available_ips
        FROM network_devices nd
        INNER JOIN locations l ON nd.location_id = l.id
        INNER JOIN customers c ON c.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.status = 'active'
        LEFT JOIN ip_pools ip ON ip.router_id = nd.id AND ip.status = 'available'
        WHERE nd.type = 'router' 
        AND nd.status = 'active'
        AND c.id = ${Number.parseInt(customerId)}
        GROUP BY nd.id, l.id, l.name, l.address
        ORDER BY available_ips DESC, subnet_count DESC
      `
    } else if (locationId) {
      // Get routers for specific location
      routers = await sql`
        SELECT 
          nd.*,
          l.name as location_name,
          l.address as location_address,
          COUNT(s.id) as subnet_count,
          COUNT(ip.id) as available_ips
        FROM network_devices nd
        INNER JOIN locations l ON nd.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.status = 'active'
        LEFT JOIN ip_pools ip ON ip.router_id = nd.id AND ip.status = 'available'
        WHERE nd.type = 'router' 
        AND nd.status = 'active'
        AND nd.location_id = ${Number.parseInt(locationId)}
        GROUP BY nd.id, l.id, l.name, l.address
        ORDER BY available_ips DESC, subnet_count DESC
      `
    } else {
      // Get all routers with location info
      routers = await sql`
        SELECT 
          nd.*,
          l.name as location_name,
          l.address as location_address,
          COUNT(s.id) as subnet_count,
          COUNT(ip.id) as available_ips
        FROM network_devices nd
        LEFT JOIN locations l ON nd.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.status = 'active'
        LEFT JOIN ip_pools ip ON ip.router_id = nd.id AND ip.status = 'available'
        WHERE nd.type = 'router' 
        AND nd.status = 'active'
        GROUP BY nd.id, l.id, l.name, l.address
        ORDER BY l.name, available_ips DESC
      `
    }

    return NextResponse.json(routers)
  } catch (error) {
    console.error("Error fetching routers by location:", error)
    return NextResponse.json({ error: "Failed to fetch routers" }, { status: 500 })
  }
}

// Get optimal router for a customer based on location and capacity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, location_id } = body

    if (!customer_id && !location_id) {
      return NextResponse.json({ error: "Either customer_id or location_id is required" }, { status: 400 })
    }

    let optimalRouter

    if (customer_id) {
      // Find optimal router based on customer's location
      optimalRouter = await sql`
        SELECT 
          nd.*,
          l.name as location_name,
          l.address as location_address,
          COUNT(s.id) as subnet_count,
          COUNT(ip.id) as available_ips,
          COUNT(cs.id) as active_services
        FROM network_devices nd
        INNER JOIN locations l ON nd.location_id = l.id
        INNER JOIN customers c ON c.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.status = 'active'
        LEFT JOIN ip_pools ip ON ip.router_id = nd.id AND ip.status = 'available'
        LEFT JOIN customer_services cs ON cs.router_id = nd.id AND cs.status = 'active'
        WHERE nd.type = 'router' 
        AND nd.status = 'active'
        AND c.id = ${Number.parseInt(customer_id)}
        GROUP BY nd.id, l.id, l.name, l.address
        ORDER BY available_ips DESC, active_services ASC
        LIMIT 1
      `
    } else {
      // Find optimal router for specific location
      optimalRouter = await sql`
        SELECT 
          nd.*,
          l.name as location_name,
          l.address as location_address,
          COUNT(s.id) as subnet_count,
          COUNT(ip.id) as available_ips,
          COUNT(cs.id) as active_services
        FROM network_devices nd
        INNER JOIN locations l ON nd.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.status = 'active'
        LEFT JOIN ip_pools ip ON ip.router_id = nd.id AND ip.status = 'available'
        LEFT JOIN customer_services cs ON cs.router_id = nd.id AND cs.status = 'active'
        WHERE nd.type = 'router' 
        AND nd.status = 'active'
        AND nd.location_id = ${Number.parseInt(location_id)}
        GROUP BY nd.id, l.id, l.name, l.address
        ORDER BY available_ips DESC, active_services ASC
        LIMIT 1
      `
    }

    if (optimalRouter.length === 0) {
      return NextResponse.json({ error: "No available routers found for the specified location" }, { status: 404 })
    }

    return NextResponse.json(optimalRouter[0])
  } catch (error) {
    console.error("Error finding optimal router:", error)
    return NextResponse.json({ error: "Failed to find optimal router" }, { status: 500 })
  }
}

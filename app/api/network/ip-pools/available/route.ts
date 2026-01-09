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
    const routerId = searchParams.get("router_id")
    const customerId = searchParams.get("customer_id")
    const locationId = searchParams.get("location_id")

    let availableIPs

    if (customerId) {
      // Get available IPs based on customer's location
      availableIPs = await sql`
        SELECT 
          ip.*,
          nd.name as router_name,
          l.name as location_name,
          s.name as subnet_name,
          s.network as subnet_network
        FROM ip_pools ip
        INNER JOIN network_devices nd ON ip.router_id = nd.id
        INNER JOIN locations l ON nd.location_id = l.id
        INNER JOIN customers c ON c.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.network >>= ip.ip_address
        WHERE ip.status = 'available'
        AND nd.type = 'router'
        AND nd.status = 'active'
        AND c.id = ${Number.parseInt(customerId)}
        ORDER BY ip.ip_address
        LIMIT 50
      `
    } else if (routerId) {
      // Get available IPs for specific router
      availableIPs = await sql`
        SELECT 
          ip.*,
          nd.name as router_name,
          l.name as location_name,
          s.name as subnet_name,
          s.network as subnet_network
        FROM ip_pools ip
        INNER JOIN network_devices nd ON ip.router_id = nd.id
        LEFT JOIN locations l ON nd.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.network >>= ip.ip_address
        WHERE ip.status = 'available'
        AND ip.router_id = ${Number.parseInt(routerId)}
        ORDER BY ip.ip_address
        LIMIT 50
      `
    } else if (locationId) {
      // Get available IPs for specific location
      availableIPs = await sql`
        SELECT 
          ip.*,
          nd.name as router_name,
          l.name as location_name,
          s.name as subnet_name,
          s.network as subnet_network
        FROM ip_pools ip
        INNER JOIN network_devices nd ON ip.router_id = nd.id
        INNER JOIN locations l ON nd.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.network >>= ip.ip_address
        WHERE ip.status = 'available'
        AND nd.type = 'router'
        AND nd.status = 'active'
        AND l.id = ${Number.parseInt(locationId)}
        ORDER BY ip.ip_address
        LIMIT 50
      `
    } else {
      // Get all available IPs
      availableIPs = await sql`
        SELECT 
          ip.*,
          nd.name as router_name,
          l.name as location_name,
          s.name as subnet_name,
          s.network as subnet_network
        FROM ip_pools ip
        INNER JOIN network_devices nd ON ip.router_id = nd.id
        LEFT JOIN locations l ON nd.location_id = l.id
        LEFT JOIN subnets s ON s.router_id = nd.id AND s.network >>= ip.ip_address
        WHERE ip.status = 'available'
        AND nd.type = 'router'
        AND nd.status = 'active'
        ORDER BY l.name, ip.ip_address
        LIMIT 100
      `
    }

    return NextResponse.json(availableIPs)
  } catch (error) {
    console.error("Error fetching available IP pools:", error)
    return NextResponse.json({ error: "Failed to fetch available IP pools" }, { status: 500 })
  }
}

// Allocate an IP address to a customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, router_id, location_id, ip_address } = body

    if (!customer_id) {
      return NextResponse.json({ error: "customer_id is required" }, { status: 400 })
    }

    let allocatedIP

    if (ip_address) {
      // Allocate specific IP address
      allocatedIP = await sql`
        UPDATE ip_pools 
        SET 
          customer_id = ${Number.parseInt(customer_id)},
          status = 'allocated',
          allocated_at = NOW()
        WHERE ip_address = ${ip_address}::inet
        AND status = 'available'
        RETURNING *
      `
    } else {
      // Auto-allocate IP based on customer location or router
      let whereClause = ""
      const params = [Number.parseInt(customer_id)]

      if (router_id) {
        whereClause = "AND ip.router_id = $2"
        params.push(Number.parseInt(router_id))
      } else if (location_id) {
        whereClause = "AND nd.location_id = $2"
        params.push(Number.parseInt(location_id))
      } else {
        // Find router based on customer's location
        const customerLocation = await sql`
          SELECT location_id FROM customers WHERE id = ${Number.parseInt(customer_id)}
        `

        if (customerLocation.length === 0) {
          return NextResponse.json({ error: "Customer not found" }, { status: 404 })
        }

        whereClause = "AND nd.location_id = $2"
        params.push(customerLocation[0].location_id)
      }

      allocatedIP = await sql.unsafe(
        `
        UPDATE ip_pools 
        SET 
          customer_id = $1,
          status = 'allocated',
          allocated_at = NOW()
        FROM network_devices nd
        WHERE ip_pools.router_id = nd.id
        AND ip_pools.status = 'available'
        AND nd.type = 'router'
        AND nd.status = 'active'
        ${whereClause}
        AND ip_pools.id = (
          SELECT ip2.id 
          FROM ip_pools ip2
          INNER JOIN network_devices nd2 ON ip2.router_id = nd2.id
          WHERE ip2.status = 'available'
          AND nd2.type = 'router'
          AND nd2.status = 'active'
          ${whereClause.replace("nd.", "nd2.")}
          ORDER BY ip2.ip_address
          LIMIT 1
        )
        RETURNING ip_pools.*
      `,
        params,
      )
    }

    if (allocatedIP.length === 0) {
      return NextResponse.json({ error: "No available IP addresses found" }, { status: 404 })
    }

    return NextResponse.json(allocatedIP[0])
  } catch (error) {
    console.error("Error allocating IP address:", error)
    return NextResponse.json({ error: "Failed to allocate IP address" }, { status: 500 })
  }
}

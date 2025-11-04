import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer ID",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Fetching customer data for ID:", customerId)

    // Get customer location data
    const customerResult = await sql`
      SELECT 
        id, 
        first_name, 
        last_name, 
        installation_address, 
        address, 
        city, 
        state, 
        gps_coordinates
      FROM customers 
      WHERE id = ${customerId}
    `

    if (customerResult.length === 0) {
      console.log("[v0] Customer not found for ID:", customerId)
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    const customer = customerResult[0]
    console.log("[v0] Customer found:", customer.first_name, customer.last_name)

    console.log("[v0] Executing available IPs query...")

    const availableIPs = await sql`
      SELECT DISTINCT
        ia.id,
        ia.ip_address,
        ia.subnet_mask,
        ia.gateway,
        ia.status,
        s.id as subnet_id,
        s.network as subnet_range,
        nd.id as router_id,
        nd.name as router_name,
        nd.location as router_location,
        nd.ip_address as router_ip,
        nd.status as router_status,
        -- Calculate priority based on location match
        CASE 
          WHEN LOWER(nd.location) LIKE LOWER(${"%" + (customer.city || "") + "%"}) THEN 1
          WHEN LOWER(nd.location) LIKE LOWER(${"%" + (customer.state || "") + "%"}) THEN 2
          ELSE 3
        END as location_priority,
        -- Calculate distance if GPS coordinates are available
        CASE 
          WHEN ${customer.gps_coordinates} IS NOT NULL AND nd.gps_coordinates IS NOT NULL THEN
            ST_Distance(
              ST_Point(
                CAST(split_part(${customer.gps_coordinates}, ',', 2) AS FLOAT),
                CAST(split_part(${customer.gps_coordinates}, ',', 1) AS FLOAT)
              )::geography,
              ST_Point(
                CAST(split_part(nd.gps_coordinates, ',', 2) AS FLOAT),
                CAST(split_part(nd.gps_coordinates, ',', 1) AS FLOAT)
              )::geography
            ) / 1000 -- Convert to kilometers
          ELSE 999999
        END as distance_km
      FROM ip_addresses ia
      JOIN subnets s ON ia.subnet_id = s.id
      JOIN network_devices nd ON s.router_id = nd.id
      WHERE ia.status = 'available'
        AND nd.status = 'online'
        AND nd.type = 'router'
      ORDER BY location_priority ASC, distance_km ASC, ia.ip_address ASC
      LIMIT 50
    `

    console.log("[v0] Found", availableIPs.length, "available IPs")

    // Group IPs by router for better organization
    const routerGroups = availableIPs.reduce((groups: any, ip: any) => {
      const routerKey = ip.router_id
      if (!groups[routerKey]) {
        groups[routerKey] = {
          router_id: ip.router_id,
          router_name: ip.router_name,
          router_location: ip.router_location,
          router_ip: ip.router_ip,
          router_status: ip.router_status,
          location_priority: ip.location_priority,
          distance_km: ip.distance_km,
          available_ips: [],
        }
      }
      groups[routerKey].available_ips.push({
        id: ip.id,
        ip_address: ip.ip_address,
        subnet_mask: ip.subnet_mask,
        gateway: ip.gateway,
        status: ip.status,
      })
      return groups
    }, {})

    const organizedData = Object.values(routerGroups)

    console.log("[v0] Organized into", organizedData.length, "router groups")

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        location: customer.installation_address || customer.address,
        city: customer.city,
        state: customer.state,
      },
      router_groups: organizedData,
      total_available_ips: availableIPs.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching available IPs:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch available IP addresses",
        debug: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    )
  }
}

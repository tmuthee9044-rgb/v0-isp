import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Fetching routers from network_devices...")

    const allDevices = await sql`
      SELECT DISTINCT type FROM network_devices ORDER BY type
    `
    console.log("[v0] All device types in database:", allDevices)

    const routers = await sql`
      SELECT DISTINCT ON (r.id)
        r.*,
        l.id as location_id,
        l.name as location_name,
        l.city as location_city,
        l.address as location_address,
        (SELECT COUNT(DISTINCT s.id) FROM ip_subnets s WHERE s.router_id = r.id) as subnet_count
      FROM network_devices r
      LEFT JOIN locations l ON r.location = l.name
      WHERE r.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other')
        OR r.type ILIKE '%router%'
      ORDER BY r.id, l.id
    `

    console.log("[v0] Fetched routers count:", routers.length)
    console.log("[v0] Fetched routers:", routers)
    return NextResponse.json(routers)
  } catch (error) {
    console.error("[v0] Error fetching routers:", error)
    return NextResponse.json({ message: "Failed to fetch routers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Creating new router...")
    const body = await request.json()
    console.log("[v0] Request body:", body)

    const {
      location_id,
      name,
      type,
      model,
      serial,
      hostname,
      ip_address,
      api_port,
      ssh_port,
      port,
      username,
      password,
      connection_type,
      connection_method,
      notes,
      subnets = [],
      services = [],
      radius_secret,
      nas_ip_address,
      api_username,
      api_password,
      enable_traffic_recording,
      enable_speed_control,
      blocking_page_url,
    } = body

    const routerIpAddress = ip_address || hostname
    const routerConnectionMethod = connection_method || connection_type || "public_ip"
    const routerPort = port || api_port || 8728

    if (!name || !type || !routerIpAddress) {
      const errorMsg = "Missing required fields: name, type, and ip_address are required"
      console.error("[v0] Validation error:", errorMsg)
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    const existingRouter = await sql`
      SELECT id FROM network_devices 
      WHERE ip_address = ${routerIpAddress} 
      AND type = ${type}
    `

    if (existingRouter.length > 0) {
      const errorMsg = "Router with this IP address and type already exists"
      console.error("[v0] Duplicate router error:", errorMsg)
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    let locationName = null
    if (location_id) {
      const location = await sql`
        SELECT id, name FROM locations WHERE id = ${location_id}
      `

      if (location.length === 0) {
        const errorMsg = "Location not found"
        console.error("[v0] Location error:", errorMsg)
        return NextResponse.json({ message: errorMsg }, { status: 404 })
      }
      locationName = location[0].name
    }

    const configuration = {
      model: model || null,
      serial: serial || null,
      port: routerPort,
      api_port: api_port || routerPort,
      ssh_port: ssh_port || 22,
      username: username || null,
      password: password || null,
      connection_method: routerConnectionMethod,
      notes: notes || null,
      radius_secret: radius_secret || null,
      nas_ip_address: nas_ip_address || null,
      api_username: api_username || null,
      api_password: api_password || null,
      enable_traffic_recording: enable_traffic_recording || false,
      enable_speed_control: enable_speed_control || false,
      blocking_page_url: blocking_page_url || null,
      services: services || [],
    }

    console.log("[v0] Configuration object:", configuration)
    console.log("[v0] Inserting router into database...")

    const result = await sql`
      INSERT INTO network_devices (
        location, name, type, ip_address, status, configuration, created_at
      ) VALUES (
        ${locationName}, ${name}, ${type}, ${routerIpAddress}, 'active', 
        ${JSON.stringify(configuration)}, NOW()
      )
      RETURNING *
    `

    console.log("[v0] Router created successfully:", result[0])
    const routerId = result[0].id

    if (subnets.length > 0) {
      console.log("[v0] Adding subnets:", subnets)
      for (const subnet of subnets) {
        await sql`
          INSERT INTO ip_subnets (router_id, cidr, description, name, allocation_mode, type, created_at)
          VALUES (
            ${routerId}, 
            ${subnet.cidr}, 
            ${subnet.description || null}, 
            ${subnet.name || `Subnet ${subnet.cidr}`},
            ${subnet.allocation_mode || "manual"},
            ${subnet.type || "customer"},
            NOW()
          )
        `
      }
      console.log("[v0] Subnets added successfully")
    }

    console.log("[v0] Services stored in configuration:", services)
    console.log("[v0] Router creation completed successfully")

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating router:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        message: "Failed to create router",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

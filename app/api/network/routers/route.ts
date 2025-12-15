import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  const sql = await getSql()

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
  const sql = await getSql()

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
      connection_method,
      latitude,
      longitude,
      radius_secret,
      nas_ip_address,
      api_username,
      api_password,
      enable_traffic_recording,
      enable_speed_control,
      blocking_page_url,
      notes,
      status,
    } = body

    if (!name || !type || !ip_address) {
      const errorMsg = "Missing required fields: name, type, and ip_address are required"
      console.error("[v0] Validation error:", errorMsg)
      return NextResponse.json({ message: errorMsg }, { status: 400 })
    }

    const existingRouter = await sql`
      SELECT id FROM network_devices 
      WHERE ip_address = ${ip_address} 
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

    console.log("[v0] Inserting router with all fields into database...")

    const result = await sql`
      INSERT INTO network_devices (
        location, 
        location_id,
        name, 
        type, 
        ip_address, 
        hostname,
        model,
        serial_number,
        port,
        api_port,
        ssh_port,
        username,
        password,
        connection_method,
        radius_secret,
        nas_ip_address,
        api_username,
        api_password,
        enable_traffic_recording,
        enable_speed_control,
        blocking_page_url,
        latitude,
        longitude,
        notes,
        status,
        created_at
      ) VALUES (
        ${locationName}, 
        ${location_id || null},
        ${name}, 
        ${type}, 
        ${ip_address},
        ${hostname || null},
        ${model || null},
        ${serial || null},
        ${port || api_port || 8728},
        ${api_port || port || 8728},
        ${ssh_port || 22},
        ${username || null},
        ${password || null},
        ${connection_method || "api"},
        ${radius_secret || null},
        ${nas_ip_address || null},
        ${api_username || null},
        ${api_password || null},
        ${enable_traffic_recording !== undefined ? enable_traffic_recording : true},
        ${enable_speed_control !== undefined ? enable_speed_control : true},
        ${blocking_page_url || null},
        ${latitude || null},
        ${longitude || null},
        ${notes || null},
        ${status || "active"},
        NOW()
      )
      RETURNING *
    `

    console.log("[v0] Router created successfully:", result[0])

    await sql`
      INSERT INTO activity_logs (
        action, entity_type, entity_id, details, created_at
      ) VALUES (
        'create', 'router', ${result[0].id}, 
        ${JSON.stringify({ name, type, ip_address })}, NOW()
      )
    `

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

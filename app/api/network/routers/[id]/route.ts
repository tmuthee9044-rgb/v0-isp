import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()

    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ message: "Invalid router ID. ID must be a number." }, { status: 400 })
    }

    console.log("[v0] Fetching router with ID:", routerId)

    const router = await sql`
      SELECT 
        r.*,
        l.id as location_id,
        l.name as location_name,
        l.city as location_city,
        l.address as location_address
      FROM network_devices r
      LEFT JOIN locations l ON r.location = l.name
      WHERE r.id = ${routerId} 
        AND (r.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR r.type ILIKE '%router%')
    `

    console.log("[v0] Router query result:", router)

    if (router.length === 0) {
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    const routerData = router[0]
    const config = routerData.configuration || {}

    return NextResponse.json({
      ...routerData,
      connection_type: config.connection_type || "public_ip",
      password: "", // Never return passwords
      mikrotik_user: routerData.api_username || "",
      mikrotik_password: "", // Never return passwords
      trafficking_record: "Traffic Flow (RouterOS V6x,V7.x)",
      speed_control: "PCQ + Addresslist",
      save_visited_ips: true,
      customer_auth_method: config.customer_auth_method || "pppoe_radius",
      radius_nas_ip: routerData.nas_ip_address || "",
      gps_latitude: routerData.latitude || null,
      gps_longitude: routerData.longitude || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching router:", error)
    return NextResponse.json({ message: "Failed to fetch router" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()

    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ message: "Invalid router ID. ID must be a number." }, { status: 400 })
    }

    const body = await request.json()
    
    // Prevent processing malformed or oversized request bodies
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
    }
    
    console.log("[v0] Updating router ID:", routerId, "with name:", body.name, "type:", body.type)

    const {
      name,
      type,
      location_id,
      hostname,
      connection_type,
      connection_method, // Added to support frontend field name
      api_port,
      ssh_port,
      username,
      password,
      mikrotik_user,
      mikrotik_password,
      enable_traffic_recording,
      enable_speed_control,
      blocking_page_url,
      customer_auth_method,
      radius_secret,
      radius_nas_ip,
      gps_latitude,
      gps_longitude,
      status,
    } = body

    if (!name || !type) {
      return NextResponse.json(
        {
          message: "Missing required fields: name and type are required",
        },
        { status: 400 },
      )
    }

    const existingRouter = await sql`
      SELECT id, configuration, location, ip_address, port, api_port, ssh_port, 
             username, connection_method FROM network_devices 
      WHERE id = ${routerId} 
        AND (type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR type ILIKE '%router%')
    `

    if (existingRouter.length === 0) {
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    let locationName = existingRouter[0].location
    if (location_id) {
      const location = await sql`
        SELECT name FROM locations WHERE id = ${Number.parseInt(location_id)} LIMIT 1
      `
      if (location.length > 0) {
        locationName = location[0].name
      }
    }

    // Parse existing config safely to avoid RangeError from corrupted data
    let existingConfig = {}
    try {
      const rawConfig = existingRouter[0].configuration
      if (rawConfig && typeof rawConfig === 'object') {
        // Check if it's corrupted character-indexed object
        if ('0' in rawConfig && '1' in rawConfig) {
          console.log("[v0] Detected corrupted configuration, resetting to empty object")
          existingConfig = {}
        } else {
          existingConfig = rawConfig
        }
      }
    } catch (error) {
      console.log("[v0] Failed to parse existing config:", error)
      existingConfig = {}
    }

    const configuration = {
      ...existingConfig,
      customer_auth_method: customer_auth_method || existingConfig.customer_auth_method || "pppoe_radius",
    }

    const result = await sql`
      UPDATE network_devices SET
        name = ${name},
        type = ${type},
        location = ${locationName},
        location_id = ${location_id ? Number.parseInt(location_id) : null},
        hostname = ${hostname || existingRouter[0].ip_address},
        api_port = ${api_port || existingRouter[0].api_port || 8728},
        ssh_port = ${ssh_port || existingRouter[0].ssh_port || 22},
        username = ${username || existingRouter[0].username || null},
        password = ${password || existingRouter[0].password || null},
        connection_method = ${connection_method || connection_type || existingRouter[0].connection_method || "api"},
        api_username = ${mikrotik_user || username || null},
        api_password = ${mikrotik_password || password || null},
        status = ${status || "active"},
        radius_secret = ${radius_secret || null},
        nas_ip_address = ${radius_nas_ip || null},
        customer_auth_method = ${customer_auth_method || "pppoe_radius"},
        latitude = ${gps_latitude ?? null},
        longitude = ${gps_longitude ?? null},
        enable_traffic_recording = ${enable_traffic_recording ?? false},
        enable_speed_control = ${enable_speed_control ?? false},
        blocking_page_url = ${blocking_page_url || null},
        configuration = ${sql.json(configuration)},
        updated_at = NOW()
      WHERE id = ${routerId}
      RETURNING *
    `
    ;(async () => {
      try {
        if (radius_secret) {
          const nasIp = radius_nas_ip || hostname || existingRouter[0].ip_address
          const shortname = name.replace(/\s+/g, "_").toLowerCase()

          await sql`
            INSERT INTO nas (
              nasname, shortname, type, ports, secret, server, community, description
            ) VALUES (
              ${nasIp}, ${shortname}, 'other', 1812, ${radius_secret},
              ${hostname || existingRouter[0].ip_address}, 'public',
              ${`Router: ${name} (${type})`}
            )
            ON CONFLICT (nasname) 
            DO UPDATE SET
              secret = EXCLUDED.secret,
              shortname = EXCLUDED.shortname,
              description = EXCLUDED.description
          `
        }

        if (type === "mikrotik" && result[0]) {
          await sql`
            INSERT INTO provisioning_queue (
              router_id, action, username, password, status, created_at
            ) VALUES (
              ${routerId}, 'update_router_config', ${username || null}, ${password || null},
              'pending', NOW()
            )
          `
        }

        await sql`
          INSERT INTO activity_logs (
            action, entity_type, entity_id, details, created_at
          ) VALUES (
            'update', 'router', ${routerId}, 
            ${JSON.stringify({
              name,
              radius_enabled: !!radius_secret,
              nas_ip: radius_nas_ip || "not set",
            })}, 
            NOW()
          )
        `
      } catch (asyncError) {
        console.error("[v0] Error in async operations:", asyncError)
      }
    })()

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error updating router:", error)
    return NextResponse.json({ message: "Failed to update router" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const routerId = Number.parseInt(params.id)

    console.log("[v0] Attempting to delete router with ID:", routerId)

    if (isNaN(routerId)) {
      return NextResponse.json({ message: "Invalid router ID. ID must be a number." }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const cascade = searchParams.get("cascade") === "true"

    const subnetDependencies = await sql`
      SELECT COUNT(*) as subnet_count FROM ip_subnets WHERE router_id = ${routerId}
    `

    const subnetCount = Number(subnetDependencies[0].subnet_count)

    console.log("[v0] Router dependencies:", { subnetCount, cascade })

    if (cascade) {
      const deletedItems: string[] = []

      if (subnetCount > 0) {
        await sql`DELETE FROM ip_subnets WHERE router_id = ${routerId}`
        deletedItems.push(`${subnetCount} subnet(s)`)
        console.log(`[v0] Cascade deleted ${subnetCount} subnets`)
      }

      console.log("[v0] Cascade delete completed:", deletedItems)
    } else if (subnetCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete router with ${subnetCount} associated subnet(s). Please remove these dependencies first or use cascade delete.`,
        },
        { status: 400 },
      )
    }

    try {
      const routerData = await sql`
        SELECT ip_address, nas_ip_address FROM network_devices WHERE id = ${routerId}
      `

      if (routerData.length > 0) {
        const nasIp = routerData[0].nas_ip_address || routerData[0].ip_address

        await sql`
          DELETE FROM nas WHERE nasname = ${nasIp}
        `
        console.log("[v0] Deleted router from FreeRADIUS nas table")
      }
    } catch (error) {
      console.log("[v0] No nas entry to delete or table doesn't exist:", error)
    }

    const result = await sql`
      DELETE FROM network_devices 
      WHERE id = ${routerId} 
        AND (type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR type ILIKE '%router%')
      RETURNING *
    `

    console.log("[v0] Delete result:", result)

    if (result.length === 0) {
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    const activityDetails = JSON.stringify({
      name: result[0].name || "Unknown Router",
      ip_address: result[0].ip_address || "Unknown IP",
      cascade_delete: cascade,
      subnets_deleted: cascade ? subnetCount : 0,
    })

    await sql`
      INSERT INTO activity_logs (
        action, entity_type, entity_id, details, created_at
      ) VALUES (
        'delete', 'router', ${routerId}, 
        ${activityDetails}, 
        NOW()
      )
    `

    console.log("[v0] Router deleted successfully:", routerId)

    return NextResponse.json({
      message: cascade ? `Router and ${subnetCount} subnet(s) deleted successfully.` : "Router deleted successfully",
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error deleting router:", error)
    return NextResponse.json(
      {
        message: "Failed to delete router",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

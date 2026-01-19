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
        (SELECT COUNT(DISTINCT s.id) FROM ip_subnets s WHERE s.router_id = r.id) as subnet_count,
        rss.sync_status as connection_status,
        rss.last_synced as last_connection_test,
        CASE 
          WHEN r.status = 'active' AND rss.sync_status = 'success' THEN 'connected'
          WHEN r.status = 'active' THEN 'connected'
          ELSE 'disconnected'
        END as display_status
      FROM network_devices r
      LEFT JOIN locations l ON r.location = l.name
      LEFT JOIN router_sync_status rss ON rss.router_id = r.id
      WHERE r.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other')
        OR r.type ILIKE '%router%'
      ORDER BY r.id, l.id
    `

    const parsedRouters = routers.map((router: any) => {
      let configuration = {}

      if (router.configuration) {
        try {
          configuration =
            typeof router.configuration === "string" ? JSON.parse(router.configuration) : router.configuration
        } catch (e) {
          console.error(`[v0] Failed to parse configuration for router ${router.id}:`, e)
          configuration = {}
        }
      }

      return {
        ...router,
        configuration,
      }
    })

    console.log("[v0] Fetched routers count:", parsedRouters.length)
    return NextResponse.json(parsedRouters)
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
      customer_auth_method,
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

    const configuration = {
      customer_auth_method: customer_auth_method || "pppoe_radius",
    }

    console.log("[v0] Inserting router with configuration:", configuration)

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
        customer_auth_method,
        latitude,
        longitude,
        notes,
        status,
        configuration,
        created_at
      ) VALUES (
        ${locationName}, 
        ${location_id || null},
        ${name}, 
        ${type}, 
        ${ip_address},
        ${hostname || ip_address},
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
        ${customer_auth_method || "pppoe_radius"},
        ${latitude || null},
        ${longitude || null},
        ${notes || null},
        ${status || "active"},
        ${JSON.stringify(configuration)},
        NOW()
      )
      RETURNING *
    `

    console.log("[v0] Router created successfully:", result[0])

    if (radius_secret) {
      try {
        console.log("[v0] Syncing router to FreeRADIUS nas table...")

        const nasIp = nas_ip_address || ip_address
        const shortname = name.replace(/\s+/g, "_").toLowerCase()

        await sql`DELETE FROM nas WHERE nasname = ${nasIp}`
        await sql`
          INSERT INTO nas (
            nasname,
            shortname,
            type,
            ports,
            secret,
            server,
            community,
            description
          ) VALUES (
            ${nasIp},
            ${shortname},
            'other',
            1812,
            ${radius_secret},
            ${ip_address},
            'public',
            ${`Router: ${name} (${type})`}
          )
        `

        console.log("[v0] Router synced to FreeRADIUS nas table successfully")
      } catch (nasError) {
        console.error("[v0] Error syncing to nas table:", nasError)
        // Don't fail router creation if nas sync fails
      }
    }

    if (type === "mikrotik" && (api_username || username) && (api_password || password)) {
      try {
        console.log("[v0] Applying MikroTik configuration to physical router...")

        const { MikroTikAPI } = await import("@/lib/mikrotik-api")
        const mikrotik = new MikroTikAPI({
          host: ip_address,
          port: api_port || port || 8728,
          username: api_username || username || "admin",
          password: api_password || password,
        })

        await mikrotik.connect()

        const configResult = await mikrotik.applyRouterConfiguration({
          customer_auth_method: customer_auth_method || "pppoe_radius",
          trafficking_record: enable_traffic_recording ? "Traffic Flow (RouterOS V6x,V7.x)" : undefined,
          speed_control: enable_speed_control ? "PCQ + Addresslist" : undefined,
          radius_server: nas_ip_address,
          radius_secret: radius_secret,
        })

        console.log("[v0] MikroTik configuration result:", configResult)

        await mikrotik.disconnect()

        if (!configResult.success && configResult.errors && configResult.errors.length > 0) {
          console.warn("[v0] Some router configurations failed:", configResult.errors)

          // Update router notes with configuration errors for user review
          await sql`
            UPDATE network_devices 
            SET notes = COALESCE(notes || E'\n\n', '') || 
              'Configuration Errors (Auto-generated):\n' || 
              ${configResult.errors.join("\n")}
            WHERE id = ${result[0].id}
          `
        }
      } catch (configError) {
        console.error("[v0] Error applying router configuration:", configError)
        await sql`
          UPDATE network_devices 
          SET notes = COALESCE(notes || E'\n\n', '') || 
            'Auto-configuration failed: ' || ${configError instanceof Error ? configError.message : String(configError)} ||
            E'\n\nPlease configure manually via WinBox:\n' ||
            '1. Enable REST API in System → Services\n' ||
            '2. Configure RADIUS in Radius menu\n' ||
            '3. Enable RADIUS for PPP in PPP → AAA Settings'
          WHERE id = ${result[0].id}
        `
      }
    }

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

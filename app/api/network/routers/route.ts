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
        ${sql.json(configuration)},
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

    // Auto-provision carrier-grade configuration to physical router
    if ((username || api_username) && (password || api_password)) {
      try {
        console.log("[v0] Auto-provisioning carrier-grade configuration to physical router...")

        // Get RADIUS server settings from environment or database
        const radiusServer = process.env.RADIUS_SERVER_IP || nas_ip_address || "10.0.0.1"
        const radiusServerSecret = radius_secret || process.env.RADIUS_SECRET || "testing123"
        const mgmtIp = process.env.MGMT_IP || "10.0.0.0/24"

        // Import MikroTik API for direct configuration
        const { MikroTikAPI } = await import("@/lib/mikrotik-api")

        const mikrotik = new MikroTikAPI({
          host: ip_address,
          port: api_port || 8728,
          username: api_username || username || "admin",
          password: api_password || password,
        })

        await mikrotik.connect()

        // Apply carrier-grade router configuration including firewall rules
        const execResult = await mikrotik.applyRouterConfiguration({
          customer_auth_method: customer_auth_method || "pppoe_radius",
          trafficking_record: enable_traffic_recording ? "Traffic Flow (RouterOS V6x,V7.x)" : undefined,
          speed_control: enable_speed_control ? "PCQ + Addresslist" : undefined,
          radius_server: radiusServer,
          radius_secret: radiusServerSecret,
          mgmt_ip: mgmtIp,
        })

        await mikrotik.disconnect()

        if (execResult.success) {
          console.log("[v0] Auto-provisioning successful:", execResult.message)
          
          await sql`
            UPDATE network_devices 
            SET 
              notes = COALESCE(notes || E'\n\n', '') || 
                'Auto-provisioned on ' || NOW()::TEXT || E'\n' ||
                'RADIUS: ' || ${radiusServer} || E'\n' ||
                'Configuration applied successfully'
            WHERE id = ${result[0].id}
          `.catch(() => {})
          
          // Update compliance status if column exists
          await sql`
            UPDATE network_devices 
            SET compliance_status = 'green', last_compliance_check = NOW()
            WHERE id = ${result[0].id}
          `.catch(() => {
            console.log("[v0] Compliance tracking not yet available (migration pending)")
          })
        } else {
          console.warn("[v0] Auto-provisioning partially failed:", execResult.error)
          
          await sql`
            UPDATE network_devices 
            SET 
              notes = COALESCE(notes || E'\n\n', '') || 
                'Auto-provisioning attempted on ' || NOW()::TEXT || E'\n' ||
                'Status: Partial failure\n' ||
                'Error: ' || ${execResult.error || "Unknown error"} || E'\n\n' ||
                'Please verify configuration manually or download script from Router Management page.'
            WHERE id = ${result[0].id}
          `.catch(() => {})
          
          await sql`
            UPDATE network_devices 
            SET compliance_status = 'yellow'
            WHERE id = ${result[0].id}
          `.catch(() => {})
        }
      } catch (provisionError) {
        console.error("[v0] Error during auto-provisioning:", provisionError)
        
        await sql`
          UPDATE network_devices 
          SET 
            notes = COALESCE(notes || E'\n\n', '') || 
              'Auto-provisioning failed on ' || NOW()::TEXT || E'\n' ||
              'Error: ' || ${provisionError instanceof Error ? provisionError.message : String(provisionError)} || E'\n\n' ||
              'Download and apply provisioning script manually:\n' ||
              '1. Go to Network → Routers → Actions → Download Provision Script\n' ||
              '2. Apply script via SSH or router management interface\n' ||
              '3. Verify RADIUS connectivity and firewall rules'
          WHERE id = ${result[0].id}
        `.catch(() => {})
        
        await sql`
          UPDATE network_devices 
          SET compliance_status = 'red'
          WHERE id = ${result[0].id}
        `.catch(() => {})
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

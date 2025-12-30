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
      model: config.model || null,
      serial: config.serial || null,
      connection_type: config.connection_type || "public_ip",
      hostname: routerData.ip_address || config.hostname || "",
      api_port: config.api_port || routerData.api_port || 8728,
      ssh_port: config.ssh_port || routerData.ssh_port || 22,
      username: config.username || routerData.username || "",
      password: "", // Never return passwords
      mikrotik_user: config.mikrotik_user || "",
      mikrotik_password: "", // Never return passwords
      trafficking_record: config.trafficking_record || "Traffic Flow (RouterOS V6x,V7.x)",
      speed_control: config.speed_control || "PCQ + Addresslist",
      save_visited_ips: config.save_visited_ips ?? true,
      customer_auth_method: config.customer_auth_method || "pppoe_radius",
      radius_secret: config.radius_secret || routerData.radius_secret || "",
      radius_nas_ip: config.nas_ip_address || routerData.nas_ip_address || "",
      gps_latitude: config.gps_latitude || routerData.latitude || null,
      gps_longitude: config.gps_longitude || routerData.longitude || null,
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
    console.log("[v0] Updating router with data:", body)

    const {
      name,
      type,
      location_id,
      hostname,
      connection_type,
      api_port,
      ssh_port,
      username,
      password,
      mikrotik_user,
      mikrotik_password,
      trafficking_record,
      speed_control,
      save_visited_ips,
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
      SELECT id, configuration, location, ip_address FROM network_devices 
      WHERE id = ${routerId} 
        AND (type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR type ILIKE '%router%')
    `

    if (existingRouter.length === 0) {
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    let locationName = existingRouter[0].location
    if (location_id) {
      const location = await sql`
        SELECT name FROM locations WHERE id = ${Number.parseInt(location_id)}
      `
      if (location.length > 0) {
        locationName = location[0].name
      }
    }

    const existingConfig = existingRouter[0].configuration || {}

    const configuration = {
      ...existingConfig,
      connection_type: connection_type || existingConfig.connection_type || "public_ip",
      api_port: api_port || existingConfig.api_port || 8728,
      ssh_port: ssh_port || existingConfig.ssh_port || 22,
      username: username || existingConfig.username || "",
      ...(password && { password }),
      mikrotik_user: mikrotik_user || existingConfig.mikrotik_user || "",
      ...(mikrotik_password && { mikrotik_password }),
      trafficking_record: trafficking_record || existingConfig.trafficking_record || "Traffic Flow (RouterOS V6x,V7.x)",
      speed_control: speed_control || existingConfig.speed_control || "PCQ + Addresslist",
      save_visited_ips: save_visited_ips ?? existingConfig.save_visited_ips ?? true,
      customer_auth_method: customer_auth_method || existingConfig.customer_auth_method || "pppoe_radius",
      radius_secret: radius_secret || "",
      nas_ip_address: radius_nas_ip || "",
      gps_latitude: gps_latitude ?? null,
      gps_longitude: gps_longitude ?? null,
    }

    console.log("[v0] Saving configuration:", configuration)

    const result = await sql`
      UPDATE network_devices SET
        name = ${name},
        type = ${type},
        location = ${locationName},
        ip_address = ${hostname || existingRouter[0].ip_address},
        status = ${status || "active"},
        radius_secret = ${radius_secret || null},
        nas_ip_address = ${radius_nas_ip || null},
        latitude = ${gps_latitude ?? null},
        longitude = ${gps_longitude ?? null},
        configuration = ${JSON.stringify(configuration)},
        updated_at = NOW()
      WHERE id = ${routerId}
      RETURNING *
    `

    if (radius_secret) {
      try {
        console.log("[v0] Syncing updated router to FreeRADIUS nas table...")

        const nasIp = radius_nas_ip || hostname || existingRouter[0].ip_address
        const shortname = name.replace(/\s+/g, "_").toLowerCase()

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
            ${hostname || existingRouter[0].ip_address},
            'public',
            ${`Router: ${name} (${type})`}
          )
          ON CONFLICT (nasname) 
          DO UPDATE SET
            secret = EXCLUDED.secret,
            shortname = EXCLUDED.shortname,
            type = EXCLUDED.type,
            description = EXCLUDED.description
        `

        console.log("[v0] Router synced to FreeRADIUS nas table successfully")
      } catch (nasError) {
        console.error("[v0] Error syncing to nas table:", nasError)
        // Don't fail router update if nas sync fails
      }
    }

    if (type === "mikrotik" && result[0]) {
      try {
        console.log("[v0] Applying updated MikroTik configuration to physical router...")

        const routerHost = hostname || result[0].ip_address
        const routerUsername = mikrotik_user || username || configuration.mikrotik_user || "admin"
        const routerPassword = mikrotik_password || password || configuration.mikrotik_password

        if (routerHost && routerUsername && routerPassword) {
          const { MikroTikAPI } = await import("@/lib/mikrotik-api")
          const mikrotik = new MikroTikAPI({
            host: routerHost,
            port: api_port || configuration.api_port || 8728,
            username: routerUsername,
            password: routerPassword,
          })

          await mikrotik.connect()

          const configResult = await mikrotik.applyRouterConfiguration({
            customer_auth_method: customer_auth_method || configuration.customer_auth_method,
            trafficking_record: trafficking_record || configuration.trafficking_record,
            speed_control: speed_control || configuration.speed_control,
            radius_server: radius_nas_ip || configuration.nas_ip_address,
            radius_secret: radius_secret || configuration.radius_secret,
          })

          console.log("[v0] MikroTik configuration update result:", configResult)

          await mikrotik.disconnect()

          if (!configResult.success) {
            console.warn("[v0] Some router configuration updates failed:", configResult.errors)
          }
        } else {
          console.warn("[v0] Missing router credentials, skipping configuration push")
        }
      } catch (configError) {
        console.error("[v0] Error applying router configuration updates:", configError)
        // Don't fail the router update if config push fails
      }
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

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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
      api_port: config.api_port || 8728,
      ssh_port: config.ssh_port || 22,
      username: config.username || "",
      password: config.password || "",
      mikrotik_user: config.mikrotik_user || "",
      trafficking_record: config.trafficking_record || "",
      speed_control: config.speed_control || "",
      save_visited_ips: config.save_visited_ips ?? true,
      radius_secret: config.radius_secret || "",
      radius_nas_ip: config.nas_ip_address || "",
      gps_latitude: config.gps_latitude || null,
      gps_longitude: config.gps_longitude || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching router:", error)
    return NextResponse.json({ message: "Failed to fetch router" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ message: "Invalid router ID. ID must be a number." }, { status: 400 })
    }

    const body = await request.json()
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
      SELECT id, configuration, location FROM network_devices 
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
      trafficking_record: trafficking_record || existingConfig.trafficking_record || "",
      speed_control: speed_control || existingConfig.speed_control || "",
      save_visited_ips: save_visited_ips ?? existingConfig.save_visited_ips ?? true,
      radius_secret: radius_secret || existingConfig.radius_secret || "",
      nas_ip_address: radius_nas_ip || existingConfig.nas_ip_address || "",
      gps_latitude: gps_latitude ?? existingConfig.gps_latitude ?? null,
      gps_longitude: gps_longitude ?? existingConfig.gps_longitude ?? null,
    }

    const result = await sql`
      UPDATE network_devices SET
        name = ${name},
        type = ${type},
        location = ${locationName},
        ip_address = ${hostname || existingRouter[0].ip_address},
        status = ${status || "active"},
        configuration = ${JSON.stringify(configuration)}
      WHERE id = ${routerId}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error updating router:", error)
    return NextResponse.json({ message: "Failed to update router" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ message: "Invalid router ID. ID must be a number." }, { status: 400 })
    }

    const subnetDependencies = await sql`
      SELECT COUNT(*) as subnet_count FROM ip_subnets WHERE router_id = ${routerId}
    `

    const serviceDependencies = await sql`
      SELECT COUNT(*) as service_count FROM customer_services WHERE device_id = ${routerId}
    `

    const subnetCount = Number(subnetDependencies[0].subnet_count)
    const serviceCount = Number(serviceDependencies[0].service_count)

    if (subnetCount > 0 || serviceCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete router with associated resources. Found ${subnetCount} subnet(s) and ${serviceCount} service(s).`,
        },
        { status: 400 },
      )
    }

    const result = await sql`
      DELETE FROM network_devices 
      WHERE id = ${routerId} 
        AND (type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR type ILIKE '%router%')
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Router deleted successfully" })
  } catch (error) {
    console.error("Error deleting router:", error)
    return NextResponse.json(
      {
        message: "Failed to delete router",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

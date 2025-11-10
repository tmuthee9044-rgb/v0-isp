import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)

    const services = await sql`
      SELECT 
        rs.*,
        r.name as router_name,
        r.model as router_type
      FROM router_services rs
      LEFT JOIN network_devices r ON rs.router_id = r.id AND r.type = 'router'
      WHERE rs.router_id = ${routerId}
      ORDER BY rs.service_type
    `

    return NextResponse.json(services)
  } catch (error) {
    console.error("Error fetching router services:", error)
    return NextResponse.json({ message: "Failed to fetch router services" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    const body = await request.json()
    const { services } = body

    if (!Array.isArray(services)) {
      return NextResponse.json({ message: "Services must be an array" }, { status: 400 })
    }

    const router = await sql`
      SELECT id FROM network_devices WHERE id = ${routerId} AND type = 'router'
    `

    if (router.length === 0) {
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    await sql`
      DELETE FROM router_services WHERE router_id = ${routerId}
    `

    const results = []
    for (const service of services) {
      const result = await sql`
        INSERT INTO router_services (router_id, service_type, is_enabled, configuration)
        VALUES (${routerId}, ${service}, true, '{}')
        RETURNING *
      `
      results.push(result[0])
    }

    return NextResponse.json(results, { status: 201 })
  } catch (error) {
    console.error("Error updating router services:", error)
    return NextResponse.json({ message: "Failed to update router services" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    const body = await request.json()
    const { service_type, is_enabled, configuration } = body

    if (!service_type) {
      return NextResponse.json({ message: "Service type is required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE router_services 
      SET 
        is_enabled = ${is_enabled !== undefined ? is_enabled : true},
        configuration = ${configuration ? JSON.stringify(configuration) : "{}"}
      WHERE router_id = ${routerId} AND service_type = ${service_type}
      RETURNING *
    `

    if (result.length === 0) {
      const newService = await sql`
        INSERT INTO router_services (router_id, service_type, is_enabled, configuration)
        VALUES (${routerId}, ${service_type}, ${is_enabled !== undefined ? is_enabled : true}, ${configuration ? JSON.stringify(configuration) : "{}"})
        RETURNING *
      `
      return NextResponse.json(newService[0], { status: 201 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating router service:", error)
    return NextResponse.json({ message: "Failed to update router service" }, { status: 500 })
  }
}

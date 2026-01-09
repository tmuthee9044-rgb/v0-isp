import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL

  if (!url) {
    console.error("[v0] No database connection string found for location routers API")
    throw new Error("Database connection not configured")
  }

  return url
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locationId = params.id
    const sql = neon(getDatabaseUrl())

    console.log(`[v0] Fetching routers for location ${locationId}`)

    const routers = await sql`
      SELECT 
        nd.id,
        nd.name,
        nd.type,
        nd.status,
        nd.ip_address,
        nd.location,
        l.name as location_name,
        l.city as location_city
      FROM network_devices nd
      LEFT JOIN locations l ON nd.location = l.name
      WHERE (nd.type ILIKE '%router%' OR nd.type ILIKE '%gateway%')
        AND (nd.location = (SELECT name FROM locations WHERE id = ${locationId})
             OR nd.location ILIKE (SELECT name FROM locations WHERE id = ${locationId}))
      ORDER BY nd.name
    `

    console.log(`[v0] Found ${routers.length} routers for location ${locationId}`)

    const transformedRouters = routers.map((router) => ({
      id: router.id.toString(),
      name: router.name,
      type: "router",
      status: router.status === "online" ? "online" : "offline",
      location: router.location,
      location_name: router.location_name,
      location_city: router.location_city,
      ip_address: router.ip_address,
    }))

    return NextResponse.json({
      success: true,
      routers: transformedRouters,
    })
  } catch (error) {
    console.error("[v0] Error fetching location routers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch routers for location",
        routers: [],
      },
      { status: 500 },
    )
  }
}

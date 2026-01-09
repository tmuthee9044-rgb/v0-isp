import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL

  if (!url) {
    console.error("[v0] No database connection string found for IP check API")
    throw new Error("Database connection not configured")
  }

  return url
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ipAddress = searchParams.get("ip")

    if (!ipAddress) {
      return NextResponse.json({ success: false, error: "IP address parameter required" }, { status: 400 })
    }

    const sql = neon(getDatabaseUrl())

    const [ipAllocation, customerService] = await Promise.all([
      sql`
        SELECT customer_id, status 
        FROM ip_addresses 
        WHERE ip_address = ${ipAddress}
          AND status = 'allocated'
        LIMIT 1
      `,
      sql`
        SELECT customer_id, status 
        FROM customer_services 
        WHERE ip_address = ${ipAddress}
          AND status IN ('active', 'suspended')
        LIMIT 1
      `,
    ])

    const isAllocated = ipAllocation.length > 0 || customerService.length > 0

    return NextResponse.json({
      success: true,
      available: !isAllocated,
      ip_address: ipAddress,
      allocated_to: isAllocated ? ipAllocation[0]?.customer_id || customerService[0]?.customer_id : null,
    })
  } catch (error) {
    console.error("[v0] Error checking IP availability:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check IP availability",
        available: false,
      },
      { status: 500 },
    )
  }
}

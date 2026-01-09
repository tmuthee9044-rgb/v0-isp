import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function createDatabaseConnection() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL

  if (!connectionString) {
    throw new Error("Database connection not available")
  }

  return neon(connectionString)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ipAddress = searchParams.get("ip")

    if (!ipAddress) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    const sql = createDatabaseConnection()

    const existingService = await sql`
      SELECT id, customer_id 
      FROM customer_services 
      WHERE ip_address = ${ipAddress}::inet 
      AND status IN ('active', 'pending')
    `

    return NextResponse.json({
      available: existingService.length === 0,
      assigned_to: existingService.length > 0 ? existingService[0] : null,
    })
  } catch (error) {
    console.error("Error validating IP address:", error)
    return NextResponse.json({ error: "Failed to validate IP address" }, { status: 500 })
  }
}

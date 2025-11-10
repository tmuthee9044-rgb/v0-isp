import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let pools
    if (status) {
      pools = await sql`
        SELECT id, ip_address, gateway, status, allocated_at, customer_id
        FROM ip_pools
        WHERE status = ${status} AND (customer_id IS NULL OR customer_id = 0)
        ORDER BY ip_address
      `
    } else {
      pools = await sql`
        SELECT id, ip_address, gateway, status, allocated_at, customer_id
        FROM ip_pools
        ORDER BY ip_address
      `
    }

    return NextResponse.json({
      success: true,
      pools,
    })
  } catch (error) {
    console.error("Error fetching IP pools:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch IP pools" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ip_address, customer_id, action } = await request.json()

    if (action === "assign") {
      const result = await sql`
        UPDATE ip_pools 
        SET status = 'assigned', customer_id = ${customer_id}, allocated_at = NOW()
        WHERE ip_address = ${ip_address} AND status = 'available'
        RETURNING *
      `

      if (result.length === 0) {
        return NextResponse.json({ success: false, error: "IP address not available" }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: "IP address assigned successfully" })
    } else if (action === "release") {
      await sql`
        UPDATE ip_pools 
        SET status = 'available', customer_id = NULL, allocated_at = NULL
        WHERE ip_address = ${ip_address}
      `

      return NextResponse.json({ success: true, message: "IP address released successfully" })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating IP pool:", error)
    return NextResponse.json({ success: false, error: "Failed to update IP pool" }, { status: 500 })
  }
}

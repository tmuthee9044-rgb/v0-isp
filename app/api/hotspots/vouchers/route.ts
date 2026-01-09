import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const vouchers = await sql`
      SELECT 
        v.*,
        h.name as hotspot_name,
        h.location as hotspot_location
      FROM hotspot_vouchers v
      LEFT JOIN hotspots h ON v.hotspot_id = h.id
      ORDER BY v.created_at DESC
    `

    return NextResponse.json(vouchers)
  } catch (error) {
    console.error("Error fetching vouchers:", error)
    return NextResponse.json({ error: "Failed to fetch vouchers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { hotspot_id, time_limit, data_limit, max_users, expiry_days, quantity } = data

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + expiry_days)

    const vouchers = []
    for (let i = 0; i < quantity; i++) {
      const code = generateVoucherCode()
      const result = await sql`
        INSERT INTO hotspot_vouchers (
          hotspot_id, code, time_limit, data_limit, max_users, expiry_date, status
        ) VALUES (
          ${hotspot_id}, ${code}, ${time_limit}, ${data_limit}, ${max_users}, ${expiryDate.toISOString()}, 'active'
        )
        RETURNING *
      `
      vouchers.push(result[0])
    }

    return NextResponse.json({ vouchers, count: quantity }, { status: 201 })
  } catch (error) {
    console.error("Error creating vouchers:", error)
    return NextResponse.json({ error: "Failed to create vouchers" }, { status: 500 })
  }
}

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

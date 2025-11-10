import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const subnetId = params.id

    const ips = await sql`
      SELECT 
        ip.id,
        ip.ip_address::text,
        ip.status,
        ip.assigned_at,
        CASE 
          WHEN c.business_name IS NOT NULL AND c.business_name != '' 
          THEN c.business_name
          ELSE CONCAT(c.first_name, ' ', c.last_name)
        END as customer_name
      FROM ip_addresses ip
      LEFT JOIN customers c ON ip.customer_id = c.id
      WHERE ip.subnet_id = ${subnetId}
      ORDER BY ip.ip_address
    `

    return NextResponse.json(ips)
  } catch (error) {
    console.error("[v0] Error fetching IPs:", error)
    return NextResponse.json({ error: "Failed to fetch IP addresses" }, { status: 500 })
  }
}

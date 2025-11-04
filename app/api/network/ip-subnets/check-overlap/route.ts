import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// POST - Check if a CIDR overlaps with existing subnets
export async function POST(request: NextRequest) {
  try {
    const { cidr, excludeId } = await request.json()

    if (!cidr) {
      return NextResponse.json({ success: false, error: "CIDR is required" }, { status: 400 })
    }

    let query = `
      SELECT id, cidr, name, router_id
      FROM ip_subnets
      WHERE cidr && $1::inet
    `

    const params: any[] = [cidr]

    if (excludeId) {
      query += ` AND id != $2`
      params.push(excludeId)
    }

    const overlappingSubnets = await sql.unsafe(query, params)

    return NextResponse.json({
      success: true,
      overlaps: overlappingSubnets.length > 0,
      subnets: overlappingSubnets,
    })
  } catch (error) {
    console.error("[v0] Error checking subnet overlap:", error)
    return NextResponse.json({ success: false, error: "Failed to check subnet overlap" }, { status: 500 })
  }
}

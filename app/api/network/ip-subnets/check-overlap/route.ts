import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

// POST - Check if a CIDR overlaps with existing subnets
export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const { cidr, excludeId } = await request.json()

    if (!cidr) {
      return NextResponse.json({ success: false, error: "CIDR is required" }, { status: 400 })
    }

    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    if (!cidrRegex.test(cidr)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid CIDR format. Expected format: 192.168.1.0/24",
        },
        { status: 400 },
      )
    }

    // Validate IP address octets and prefix
    const [networkAddr, prefixStr] = cidr.split("/")
    const prefix = Number.parseInt(prefixStr)
    const octets = networkAddr.split(".").map(Number)

    if (octets.some((octet) => isNaN(octet) || octet < 0 || octet > 255)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid IP address octets",
        },
        { status: 400 },
      )
    }

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid subnet prefix. Must be between 0 and 32",
        },
        { status: 400 },
      )
    }
    // </CHANGE>

    let query = `
      SELECT id, cidr, name, router_id
      FROM ip_subnets
      WHERE cidr::inet && $1::inet
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

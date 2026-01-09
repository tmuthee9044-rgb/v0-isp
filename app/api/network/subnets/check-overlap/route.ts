import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

function validateCIDR(cidr: string): { valid: boolean; error?: string; correctedCIDR?: string } {
  const cidrRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/
  const match = cidr.match(cidrRegex)

  if (!match) {
    return { valid: false, error: "Invalid CIDR format. Use format: 192.168.1.0/24" }
  }

  const [, oct1, oct2, oct3, oct4, prefix] = match
  const octets = [oct1, oct2, oct3, oct4].map(Number)
  const prefixNum = Number(prefix)

  // Validate octets
  if (octets.some((octet) => octet > 255)) {
    return { valid: false, error: "IP address octets must be between 0 and 255" }
  }

  // Validate prefix
  if (prefixNum < 8 || prefixNum > 30) {
    return { valid: false, error: "Prefix must be between 8 and 30 for valid subnets" }
  }

  // Check if network address has bits set to right of mask
  const ipNum = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]
  const mask = (0xffffffff << (32 - prefixNum)) >>> 0
  const networkNum = (ipNum & mask) >>> 0

  if (ipNum !== networkNum) {
    // Calculate the correct network address
    const correctedOctets = [
      (networkNum >>> 24) & 0xff,
      (networkNum >>> 16) & 0xff,
      (networkNum >>> 8) & 0xff,
      networkNum & 0xff,
    ]
    const correctedCIDR = `${correctedOctets.join(".")}/${prefixNum}`

    return {
      valid: false,
      error: `Invalid network address for /${prefixNum} subnet. Did you mean ${correctedCIDR}?`,
      correctedCIDR,
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const { cidr, excludeId } = await request.json()

    if (!cidr) {
      return NextResponse.json({ message: "CIDR is required" }, { status: 400 })
    }

    const validation = validateCIDR(cidr)
    if (!validation.valid) {
      return NextResponse.json(
        {
          message: validation.error,
          correctedCIDR: validation.correctedCIDR,
        },
        { status: 400 },
      )
    }

    // Query to check for overlapping subnets
    const query = excludeId
      ? sql`
          SELECT id, network::text as cidr, name, router_id
          FROM subnets
          WHERE id != ${excludeId}
            AND (
              network >>= ${cidr}::cidr  -- New subnet contains existing
              OR network <<= ${cidr}::cidr  -- Existing contains new subnet
              OR network && ${cidr}::cidr   -- Subnets overlap
            )
          LIMIT 5
        `
      : sql`
          SELECT id, network::text as cidr, name, router_id
          FROM subnets
          WHERE network >>= ${cidr}::cidr
             OR network <<= ${cidr}::cidr
             OR network && ${cidr}::cidr
          LIMIT 5
        `

    const overlappingSubnets = await query

    if (overlappingSubnets.length > 0) {
      return NextResponse.json({
        overlaps: true,
        subnets: overlappingSubnets,
        message: `This subnet overlaps with ${overlappingSubnets.length} existing subnet(s)`,
      })
    }

    return NextResponse.json({ overlaps: false })
  } catch (error: any) {
    console.error("Error checking subnet overlap:", error)
    return NextResponse.json({ message: error.message || "Failed to check overlap" }, { status: 500 })
  }
}

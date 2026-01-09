import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cidr, router_id } = body

    if (!cidr) {
      return NextResponse.json({ message: "CIDR is required" }, { status: 400 })
    }

    // Validate CIDR format
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    if (!cidrRegex.test(cidr)) {
      return NextResponse.json({
        valid: false,
        message: "Invalid CIDR format. Use format like 192.168.1.0/24",
      })
    }

    // Extract network and prefix
    const [network, prefix] = cidr.split("/")
    const prefixNum = Number.parseInt(prefix)

    // Validate IP address format
    const ipParts = network.split(".").map((part) => Number.parseInt(part))
    if (ipParts.some((part) => part < 0 || part > 255)) {
      return NextResponse.json({
        valid: false,
        message: "Invalid IP address in CIDR",
      })
    }

    // Validate prefix range
    if (prefixNum < 8 || prefixNum > 30) {
      return NextResponse.json({
        valid: false,
        message: "Prefix must be between /8 and /30",
      })
    }

    // Check if network address is valid for the given prefix
    const networkInt = ipParts.reduce((acc, part, i) => acc + (part << (8 * (3 - i))), 0)
    const maskInt = (0xffffffff << (32 - prefixNum)) >>> 0
    const networkAddress = (networkInt & maskInt) >>> 0

    if (networkInt !== networkAddress) {
      const correctNetwork = [
        (networkAddress >>> 24) & 0xff,
        (networkAddress >>> 16) & 0xff,
        (networkAddress >>> 8) & 0xff,
        networkAddress & 0xff,
      ].join(".")

      return NextResponse.json({
        valid: false,
        message: `Invalid network address. Should be ${correctNetwork}/${prefix}`,
        suggestion: `${correctNetwork}/${prefix}`,
      })
    }

    const existingSubnets = await sql`
      SELECT s.network, r.name as router_name 
      FROM ip_subnets s
      LEFT JOIN network_devices r ON s.router_id = r.id
      WHERE s.status = 'active'
      ${router_id ? sql`AND s.router_id != ${router_id}` : sql``}
    `

    // Enhanced overlap detection
    const overlappingSubnet = existingSubnets.find((subnet) => {
      if (!subnet.network) return false

      const [existingNetwork, existingPrefix] = subnet.network.split("/")
      const existingPrefixNum = Number.parseInt(existingPrefix)

      // Convert to integers for comparison
      const existingNetworkInt = existingNetwork
        .split(".")
        .reduce((acc, part, i) => acc + (Number.parseInt(part) << (8 * (3 - i))), 0)
      const existingMaskInt = (0xffffffff << (32 - existingPrefixNum)) >>> 0
      const currentMaskInt = (0xffffffff << (32 - prefixNum)) >>> 0

      // Check if networks overlap
      const minPrefix = Math.max(prefixNum, existingPrefixNum)
      const minMaskInt = (0xffffffff << (32 - minPrefix)) >>> 0

      return (networkInt & minMaskInt) >>> 0 === (existingNetworkInt & minMaskInt) >>> 0
    })

    if (overlappingSubnet) {
      return NextResponse.json({
        valid: false,
        message: `CIDR overlaps with existing subnet ${overlappingSubnet.network} on router ${overlappingSubnet.router_name}`,
      })
    }

    // Check for private IP ranges
    const isPrivate =
      ipParts[0] === 10 ||
      (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
      (ipParts[0] === 192 && ipParts[1] === 168)

    // Calculate subnet info
    const totalIPs = Math.pow(2, 32 - prefixNum) - 2 // Exclude network and broadcast
    const usableIPs = totalIPs
    const broadcastAddress = [
      ((networkAddress | (0xffffffff >>> prefixNum)) >>> 24) & 0xff,
      ((networkAddress | (0xffffffff >>> prefixNum)) >>> 16) & 0xff,
      ((networkAddress | (0xffffffff >>> prefixNum)) >>> 8) & 0xff,
      (networkAddress | (0xffffffff >>> prefixNum)) & 0xff,
    ].join(".")

    const gatewayAddress = [
      (networkAddress >>> 24) & 0xff,
      (networkAddress >>> 16) & 0xff,
      (networkAddress >>> 8) & 0xff,
      (networkAddress & 0xff) + 1,
    ].join(".")

    return NextResponse.json({
      valid: true,
      message: "CIDR is valid",
      details: {
        network,
        prefix: prefixNum,
        totalIPs,
        usableIPs,
        networkAddress: network,
        broadcastAddress,
        suggestedGateway: gatewayAddress,
        subnetMask: [(maskInt >>> 24) & 0xff, (maskInt >>> 16) & 0xff, (maskInt >>> 8) & 0xff, maskInt & 0xff].join(
          ".",
        ),
        isPrivate,
        ipRange: {
          start: [
            (networkAddress >>> 24) & 0xff,
            (networkAddress >>> 16) & 0xff,
            (networkAddress >>> 8) & 0xff,
            (networkAddress & 0xff) + 1,
          ].join("."),
          end: [
            ((networkAddress | (0xffffffff >>> prefixNum)) >>> 24) & 0xff,
            ((networkAddress | (0xffffffff >>> prefixNum)) >>> 16) & 0xff,
            ((networkAddress | (0xffffffff >>> prefixNum)) >>> 8) & 0xff,
            ((networkAddress | (0xffffffff >>> prefixNum)) & 0xff) - 1,
          ].join("."),
        },
      },
    })
  } catch (error) {
    console.error("Error validating subnet:", error)
    return NextResponse.json({ message: "Failed to validate subnet" }, { status: 500 })
  }
}

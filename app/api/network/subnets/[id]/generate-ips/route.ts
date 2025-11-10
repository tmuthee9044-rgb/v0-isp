import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)

    console.log("[v0] Generating IPs for subnet ID:", subnetId)

    const subnet = await sql`
      SELECT * FROM subnets WHERE id = ${subnetId}
    `

    if (subnet.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    const subnetData = subnet[0]
    const network = subnetData.network
    const routerId = subnetData.router_id
    const gateway = subnetData.gateway

    console.log("[v0] Subnet network:", network)
    console.log("[v0] Router ID:", routerId)
    console.log("[v0] Gateway:", gateway)

    // Parse network to get network and subnet mask
    const [networkAddr, prefixLength] = network.split("/")
    const prefix = Number.parseInt(prefixLength)

    if (prefix < 16 || prefix > 30) {
      return NextResponse.json(
        { message: "Subnet prefix must be between /16 and /30 for IP generation" },
        { status: 400 },
      )
    }

    const subnetMask = [
      (0xffffffff << (32 - prefix)) >>> 24,
      ((0xffffffff << (32 - prefix)) >>> 16) & 0xff,
      ((0xffffffff << (32 - prefix)) >>> 8) & 0xff,
      (0xffffffff << (32 - prefix)) & 0xff,
    ].join(".")

    console.log("[v0] Calculated subnet mask:", subnetMask)

    // Calculate number of host addresses
    const hostBits = 32 - prefix
    const totalHosts = Math.pow(2, hostBits)
    const usableHosts = totalHosts - 2 // Subtract network and broadcast addresses

    console.log("[v0] Usable hosts:", usableHosts)

    if (usableHosts > 10000) {
      return NextResponse.json(
        { message: "Subnet too large. Maximum 10,000 usable addresses allowed for automatic generation." },
        { status: 400 },
      )
    }

    const existingIPs = await sql`
      SELECT COUNT(*) as count FROM ip_pools WHERE router_id = ${routerId} AND gateway = ${gateway}
    `

    if (Number(existingIPs[0].count) > 0) {
      return NextResponse.json({ message: "IP addresses already generated for this subnet" }, { status: 400 })
    }

    console.log("[v0] Starting IP generation...")

    // Generate IP addresses
    const networkParts = networkAddr.split(".").map(Number)
    const ipAddresses = []

    // Calculate the first and last usable IP addresses
    const networkInt = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3]
    const firstUsableIP = networkInt + 1
    const lastUsableIP = networkInt + usableHosts

    for (let i = firstUsableIP; i <= lastUsableIP; i++) {
      const ip = [(i >>> 24) & 255, (i >>> 16) & 255, (i >>> 8) & 255, i & 255].join(".")
      ipAddresses.push(ip)
    }

    console.log("[v0] Generated", ipAddresses.length, "IP addresses")

    const batchSize = 500
    let insertedCount = 0

    for (let i = 0; i < ipAddresses.length; i += batchSize) {
      const batch = ipAddresses.slice(i, i + batchSize)
      const values = batch.map((ip) => `('${ip}', 'available', ${routerId}, '${gateway}', '${subnetMask}')`).join(", ")

      await sql.unsafe(`
        INSERT INTO ip_pools (ip_address, status, router_id, gateway, subnet_mask)
        VALUES ${values}
      `)

      insertedCount += batch.length
      console.log("[v0] Inserted batch:", insertedCount, "/", ipAddresses.length)
    }

    console.log("[v0] IP generation completed successfully")

    return NextResponse.json({
      message: "IP addresses generated successfully",
      count: insertedCount,
      subnet: network,
    })
  } catch (error) {
    console.error("[v0] Error generating IP addresses:", error)
    return NextResponse.json(
      {
        message: "Failed to generate IP addresses",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

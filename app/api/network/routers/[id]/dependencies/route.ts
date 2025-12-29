import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ message: "Invalid router ID" }, { status: 400 })
    }

    const subnetDependencies = await sql`
      SELECT COUNT(*) as subnet_count FROM ip_subnets WHERE router_id = ${routerId}
    `

    const subnetCount = Number(subnetDependencies[0].subnet_count)

    return NextResponse.json({
      hasDependencies: subnetCount > 0,
      subnetCount,
      serviceCount: 0, // Services are not directly linked to routers
    })
  } catch (error) {
    console.error("[v0] Error checking dependencies:", error)
    return NextResponse.json({ message: "Failed to check dependencies" }, { status: 500 })
  }
}

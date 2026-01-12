import { NextResponse } from "next/server"
import { RealTimeDashboard } from "@/lib/real-time-dashboard"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const dashboard = RealTimeDashboard.getInstance()
    const kpis = await dashboard.getKPIs()
    return NextResponse.json(kpis)
  } catch (error) {
    console.error("[v0] Error fetching dashboard KPIs:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { realTimeDashboard } from "@/lib/real-time-dashboard"

export async function GET() {
  try {
    const kpis = await realTimeDashboard.getKPIs()

    return NextResponse.json({
      success: true,
      data: kpis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching real-time KPIs:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch real-time KPIs",
      },
      { status: 500 },
    )
  }
}

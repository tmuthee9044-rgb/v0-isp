import { NextResponse } from "next/server"
import { checkDatabaseHealth, getHealthHistory, getHealthMetrics } from "@/lib/database-health-monitor"

export async function GET() {
  try {
    const currentHealth = await checkDatabaseHealth()
    const history = getHealthHistory()
    const metrics = getHealthMetrics()

    return NextResponse.json({
      success: true,
      current: currentHealth,
      metrics,
      history: history.slice(-10), // Last 10 checks
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

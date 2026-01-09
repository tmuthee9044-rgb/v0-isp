import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // Get suspension statistics
    const [suspensionStats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE cs.status = 'suspended') as total_suspended,
        COUNT(*) FILTER (WHERE cs.status = 'suspended' AND cs.suspended_at::date = CURRENT_DATE) as suspended_today,
        COUNT(*) FILTER (WHERE cs.reactivated_at::date = CURRENT_DATE) as reactivated_today,
        COUNT(*) FILTER (WHERE cs.status = 'suspended' AND cs.suspension_reason = 'overdue_payment') as overdue_payments,
        COUNT(*) FILTER (WHERE cs.status = 'suspended' AND cs.suspension_reason = 'manual_suspension') as manual_suspensions,
        COUNT(*) FILTER (WHERE cs.status = 'suspended' AND cs.suspension_reason = 'overdue_payment') as automated_suspensions,
        AVG(EXTRACT(DAY FROM (COALESCE(cs.reactivated_at, NOW()) - cs.suspended_at))) FILTER (WHERE cs.status = 'suspended') as avg_suspension_duration
      FROM customer_services cs
    `

    // Calculate suspension trend (compare with last week)
    const [trendData] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE cs.suspended_at >= CURRENT_DATE - INTERVAL '7 days') as this_week,
        COUNT(*) FILTER (WHERE cs.suspended_at >= CURRENT_DATE - INTERVAL '14 days' AND cs.suspended_at < CURRENT_DATE - INTERVAL '7 days') as last_week
      FROM customer_services cs
      WHERE cs.status = 'suspended'
    `

    const suspensionTrend =
      trendData.last_week > 0 ? ((trendData.this_week - trendData.last_week) / trendData.last_week) * 100 : 0

    const stats = {
      totalSuspended: Number.parseInt(suspensionStats.total_suspended) || 0,
      suspendedToday: Number.parseInt(suspensionStats.suspended_today) || 0,
      reactivatedToday: Number.parseInt(suspensionStats.reactivated_today) || 0,
      overduePayments: Number.parseInt(suspensionStats.overdue_payments) || 0,
      manualSuspensions: Number.parseInt(suspensionStats.manual_suspensions) || 0,
      automatedSuspensions: Number.parseInt(suspensionStats.automated_suspensions) || 0,
      averageSuspensionDuration: Math.round(Number.parseFloat(suspensionStats.avg_suspension_duration) || 0),
      suspensionTrend: Math.round(suspensionTrend),
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error("Error fetching suspension stats:", error)
    return NextResponse.json({ error: "Failed to fetch suspension statistics" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"

    // Calculate date range based on period
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        startDate.setMonth(now.getMonth() - 3)
        break
      default:
        startDate.setHours(0, 0, 0, 0)
    }

    const stats = await sql`
      SELECT 
        COUNT(DISTINCT "UserName") as total_active_users,
        COALESCE(SUM("AcctInputOctets" + "AcctOutputOctets"), 0) / 1099511627776.0 as total_data_tb,
        COUNT(*) FILTER (WHERE "AcctStopTime" IS NULL) as active_sessions,
        MAX(("AcctInputOctets" + "AcctOutputOctets") / NULLIF(EXTRACT(EPOCH FROM ("AcctStopTime" - "AcctStartTime")), 0)) as peak_bandwidth_bps
      FROM radacct
      WHERE "AcctStartTime" >= ${startDate.toISOString()}
    `

    const hourlyData = await sql`
      SELECT 
        EXTRACT(HOUR FROM "AcctStartTime") as hour,
        COUNT(DISTINCT "UserName") as users,
        SUM("AcctInputOctets" + "AcctOutputOctets") / 1073741824.0 as data_gb,
        AVG(("AcctInputOctets" + "AcctOutputOctets") / NULLIF(EXTRACT(EPOCH FROM (COALESCE("AcctStopTime", NOW()) - "AcctStartTime")), 0)) as avg_bandwidth_bps
      FROM radacct
      WHERE "AcctStartTime" >= ${startDate.toISOString()}
      GROUP BY EXTRACT(HOUR FROM "AcctStartTime")
      ORDER BY hour
    `

    const topUsage = await sql`
      SELECT 
        c.name,
        sp.name as plan_name,
        cs.status,
        SUM(ra."AcctInputOctets" + ra."AcctOutputOctets") / 1099511627776.0 as usage_tb,
        CASE 
          WHEN SUM(ra."AcctInputOctets" + ra."AcctOutputOctets") > 1099511627776 THEN 'critical'
          WHEN SUM(ra."AcctInputOctets" + ra."AcctOutputOctets") > 549755813888 THEN 'high'
          WHEN SUM(ra."AcctInputOctets" + ra."AcctOutputOctets") > 107374182400 THEN 'normal'
          ELSE 'low'
        END as usage_status
      FROM customers c
      JOIN customer_services cs ON c.id = cs.customer_id
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN radacct ra ON c.username = ra."UserName" 
        AND ra."AcctStartTime" >= ${startDate.toISOString()}
      WHERE cs.status = 'active'
      GROUP BY c.name, sp.name, cs.status
      ORDER BY usage_tb DESC NULLS LAST
      LIMIT 10
    `

    const planUsage = await sql`
      SELECT 
        sp.name as plan_name,
        COUNT(DISTINCT cs.customer_id) as customers,
        COALESCE(SUM(ra."AcctInputOctets" + ra."AcctOutputOctets") / 1073741824.0, 0) as total_data_gb,
        CASE 
          WHEN COUNT(DISTINCT cs.customer_id) > 0 
          THEN (COALESCE(SUM(ra."AcctInputOctets" + ra."AcctOutputOctets"), 0) / COUNT(DISTINCT cs.customer_id) / 1073741824.0)
          ELSE 0 
        END as avg_data_per_customer_gb
      FROM service_plans sp
      JOIN customer_services cs ON sp.id = cs.service_plan_id
      LEFT JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN radacct ra ON c.username = ra."UserName" 
        AND ra."AcctStartTime" >= ${startDate.toISOString()}
      WHERE cs.status = 'active'
      GROUP BY sp.name
      ORDER BY total_data_gb DESC
    `

    const hourlyUsage = Array.from({ length: 24 }, (_, i) => {
      const hourData = hourlyData.find((h) => Number(h.hour) === i)
      return {
        hour: String(i).padStart(2, "0") + ":00",
        bandwidth: hourData ? Math.min(100, Math.floor((Number(hourData.avg_bandwidth_bps) / 10485760) * 100)) : 0, // Convert to % of 10Mbps
        users: hourData ? Number(hourData.users) : 0,
      }
    })

    const peakBandwidth = Math.max(...hourlyUsage.map((h) => h.bandwidth))
    const avgBandwidth = hourlyUsage.reduce((sum, h) => sum + h.bandwidth, 0) / hourlyUsage.length

    return NextResponse.json({
      hourlyUsage,
      topUsageCustomers: topUsage.map((row) => ({
        name: row.name,
        usage: Number(row.usage_tb || 0).toFixed(2),
        plan: row.plan_name,
        status: row.usage_status,
      })),
      planUsage: planUsage.map((row) => ({
        plan: row.plan_name,
        totalData: Math.floor(Number(row.total_data_gb || 0)),
        avgUsage: row.customers > 0 ? Math.min(100, Math.floor((Number(row.avg_data_per_customer_gb) / 100) * 100)) : 0,
        customers: Number(row.customers),
      })),
      stats: {
        peakBandwidth: Math.floor(peakBandwidth),
        avgUsage: Math.floor(avgBandwidth),
        peakUsers: Math.max(...hourlyUsage.map((h) => h.users)),
        dataTransferred: Number(stats[0]?.total_data_tb || 0).toFixed(1),
      },
    })
  } catch (error) {
    console.error("Error fetching usage report data:", error)
    return NextResponse.json({ error: "Failed to fetch usage report data" }, { status: 500 })
  }
}

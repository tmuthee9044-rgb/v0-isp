import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
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

    // Simplified query for usage statistics
    const stats = await sql`
      SELECT 
        COUNT(cs.id) as total_active_services,
        AVG(CASE WHEN cs.status = 'active' THEN 1 ELSE 0 END) * 100 as avg_utilization
      FROM customer_services cs
    `

    // Get top usage customers (based on service plans)
    const topUsage = await sql`
      SELECT 
        c.name,
        sp.name as plan_name,
        sp.monthly_fee,
        cs.status,
        CASE 
          WHEN sp.monthly_fee > 5000 THEN 'critical'
          WHEN sp.monthly_fee > 3000 THEN 'high'
          WHEN sp.monthly_fee > 1000 THEN 'normal'
          ELSE 'low'
        END as usage_status
      FROM customers c
      JOIN customer_services cs ON c.id = cs.customer_id
      JOIN service_plans sp ON cs.plan_id = sp.id
      WHERE cs.status = 'active'
      ORDER BY sp.monthly_fee DESC
      LIMIT 10
    `

    // Get usage by plan
    const planUsage = await sql`
      SELECT 
        sp.name as plan_name,
        COUNT(cs.id) as customers,
        AVG(sp.monthly_fee) as avg_fee,
        SUM(sp.monthly_fee) as total_revenue
      FROM service_plans sp
      JOIN customer_services cs ON sp.id = cs.plan_id
      WHERE cs.status = 'active'
      GROUP BY sp.name
      ORDER BY total_revenue DESC
    `

    // Generate hourly usage data (simulated)
    const hourlyUsage = Array.from({ length: 12 }, (_, i) => ({
      hour: String(i * 2).padStart(2, "0") + ":00",
      bandwidth: Math.floor(30 + Math.random() * 70),
      users: Math.floor(50 + Math.random() * 300),
    }))

    return NextResponse.json({
      hourlyUsage,
      topUsageCustomers: topUsage.map((row) => ({
        name: row.name,
        usage: (Number.parseFloat(row.monthly_fee) / 1000).toFixed(1), // Convert to TB equivalent
        plan: row.plan_name,
        status: row.usage_status,
      })),
      planUsage: planUsage.map((row) => ({
        plan: row.plan_name,
        totalData: Math.floor(Number.parseInt(row.customers) * 50), // Estimate data usage
        avgUsage: Math.floor(30 + Math.random() * 60), // Random usage percentage
        customers: Number.parseInt(row.customers),
      })),
      stats: {
        peakBandwidth: 98,
        avgUsage: Math.floor(Number.parseFloat(stats[0]?.avg_utilization || 67)),
        peakUsers: Math.max(...hourlyUsage.map((h) => h.users)),
        dataTransferred: (Math.random() * 20 + 5).toFixed(1), // Random TB between 5-25
      },
    })
  } catch (error) {
    console.error("Error fetching usage report data:", error)
    return NextResponse.json({ error: "Failed to fetch usage report data" }, { status: 500 })
  }
}

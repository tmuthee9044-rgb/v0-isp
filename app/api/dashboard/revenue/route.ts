import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const revenueData = await sql`
      SELECT 
        TO_CHAR(payment_date, 'Mon') as month,
        EXTRACT(MONTH FROM payment_date) as month_num,
        EXTRACT(YEAR FROM payment_date) as year_num,
        SUM(amount) as revenue
      FROM payments 
      WHERE payment_date >= CURRENT_DATE - INTERVAL '12 months'
        AND status = 'completed'
      GROUP BY EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date), TO_CHAR(payment_date, 'Mon')
      ORDER BY year_num DESC, month_num DESC
      LIMIT 12
    `

    if (!revenueData || revenueData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    const maxRevenue = Math.max(...revenueData.map((d) => Number(d.revenue)))

    const chartData = revenueData
      .map((item, index, array) => {
        const prevRevenue = array[index + 1]?.revenue || item.revenue
        const growth = prevRevenue > 0 ? (((item.revenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : "0.0"

        const heightPercentage = maxRevenue > 0 ? Math.max((Number(item.revenue) / maxRevenue) * 80, 10) : 10

        return {
          month: item.month,
          value: Number.parseFloat(item.revenue),
          height: `${heightPercentage}%`,
          growth: `${Number(growth) >= 0 ? "+" : ""}${growth}%`,
        }
      })
      .reverse()
      .slice(-6) // Show last 6 months

    return NextResponse.json({
      success: true,
      data: chartData,
    })
  } catch (error) {
    console.error("[v0] Revenue data error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch revenue data" }, { status: 500 })
  }
}

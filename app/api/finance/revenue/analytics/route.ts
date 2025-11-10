import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { dateFrom, dateTo, analysisType = "cohort" } = await request.json()

    if (analysisType === "cohort") {
      // Customer cohort analysis
      const cohortData = await sql`
        WITH customer_cohorts AS (
          SELECT 
            c.id,
            c.first_name || ' ' || c.last_name as customer_name,
            DATE_TRUNC('month', c.created_at) as cohort_month,
            DATE_TRUNC('month', p.created_at) as payment_month,
            SUM(p.amount) as revenue
          FROM customers c
          LEFT JOIN payments p ON c.id = p.customer_id 
            AND p.status = 'completed'
            AND p.created_at >= ${dateFrom}
            AND p.created_at <= ${dateTo}
          GROUP BY c.id, c.first_name, c.last_name, cohort_month, payment_month
        )
        SELECT 
          cohort_month,
          payment_month,
          COUNT(DISTINCT id) as customers,
          COALESCE(SUM(revenue), 0) as total_revenue,
          AVG(revenue) as avg_revenue_per_customer
        FROM customer_cohorts
        WHERE payment_month IS NOT NULL
        GROUP BY cohort_month, payment_month
        ORDER BY cohort_month, payment_month
      `

      return NextResponse.json({ cohortData })
    }

    if (analysisType === "churn") {
      // Revenue churn analysis
      const churnData = await sql`
        WITH monthly_revenue AS (
          SELECT 
            c.id,
            DATE_TRUNC('month', p.created_at) as month,
            SUM(p.amount) as monthly_revenue
          FROM customers c
          LEFT JOIN payments p ON c.id = p.customer_id 
            AND p.status = 'completed'
            AND p.created_at >= ${dateFrom}
            AND p.created_at <= ${dateTo}
          GROUP BY c.id, DATE_TRUNC('month', p.created_at)
        ),
        revenue_changes AS (
          SELECT 
            month,
            SUM(monthly_revenue) as total_revenue,
            COUNT(DISTINCT id) as active_customers,
            LAG(SUM(monthly_revenue)) OVER (ORDER BY month) as prev_revenue,
            LAG(COUNT(DISTINCT id)) OVER (ORDER BY month) as prev_customers
          FROM monthly_revenue
          WHERE monthly_revenue > 0
          GROUP BY month
          ORDER BY month
        )
        SELECT 
          month,
          total_revenue,
          active_customers,
          prev_revenue,
          prev_customers,
          CASE 
            WHEN prev_revenue > 0 THEN ((total_revenue - prev_revenue) / prev_revenue) * 100
            ELSE 0
          END as revenue_growth_rate,
          CASE 
            WHEN prev_customers > 0 THEN ((active_customers - prev_customers) / prev_customers::float) * 100
            ELSE 0
          END as customer_growth_rate
        FROM revenue_changes
        WHERE prev_revenue IS NOT NULL
      `

      return NextResponse.json({ churnData })
    }

    if (analysisType === "forecast") {
      // Revenue forecasting based on trends
      const historicalData = await sql`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(amount) as revenue
        FROM payments 
        WHERE status = 'completed' 
          AND created_at >= ${dateFrom}
          AND created_at <= ${dateTo}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `

      // Simple linear regression for forecasting
      const revenues = historicalData.map((d) => Number(d.revenue))
      const n = revenues.length

      if (n < 2) {
        return NextResponse.json({ error: "Insufficient data for forecasting" }, { status: 400 })
      }

      const xValues = Array.from({ length: n }, (_, i) => i + 1)
      const sumX = xValues.reduce((a, b) => a + b, 0)
      const sumY = revenues.reduce((a, b) => a + b, 0)
      const sumXY = xValues.reduce((sum, x, i) => sum + x * revenues[i], 0)
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      // Generate 3-month forecast
      const forecast = []
      for (let i = 1; i <= 3; i++) {
        const nextMonth = new Date(historicalData[n - 1].month)
        nextMonth.setMonth(nextMonth.getMonth() + i)
        const predictedRevenue = slope * (n + i) + intercept

        forecast.push({
          month: nextMonth,
          predictedRevenue: Math.max(0, predictedRevenue),
          confidence: Math.max(0.6, 1 - i * 0.1), // Decreasing confidence over time
        })
      }

      return NextResponse.json({
        historicalData: historicalData.map((d) => ({
          month: d.month,
          revenue: Number(d.revenue),
        })),
        forecast,
        trendAnalysis: {
          slope,
          intercept,
          trend: slope > 0 ? "growing" : slope < 0 ? "declining" : "stable",
        },
      })
    }

    return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 })
  } catch (error) {
    console.error("Revenue analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch revenue analytics" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // Default to last 30 days
    const dateTo = new Date().toISOString().split("T")[0]
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    return await fetchDashboardData(dateFrom, dateTo)
  } catch (error) {
    console.error("Finance dashboard GET error:", error)
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dateFrom, dateTo } = await request.json()
    return await fetchDashboardData(dateFrom, dateTo)
  } catch (error) {
    console.error("Finance dashboard POST error:", error)
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
  }
}

async function fetchDashboardData(dateFrom: string, dateTo: string) {
  // Get total revenue from completed payments
  const revenueResult = await sql`
    SELECT 
      COALESCE(SUM(amount), 0) as total_revenue,
      COUNT(*) as payment_count
    FROM payments 
    WHERE status = 'completed' 
      AND created_at >= ${dateFrom}
      AND created_at <= ${dateTo}
  `

  const expensesResult = await sql`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses 
    WHERE expense_date >= ${dateFrom}
      AND expense_date <= ${dateTo}
  `

  // Get revenue by customer (top customers)
  const topCustomersResult = await sql`
    SELECT 
      c.first_name || ' ' || c.last_name as name,
      sp.name as plan,
      COALESCE(SUM(p.amount), 0) as revenue,
      COUNT(p.id) as payment_count
    FROM customers c
    LEFT JOIN customer_services cs ON c.id = cs.customer_id
    LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
    LEFT JOIN payments p ON c.id = p.customer_id AND p.status = 'completed'
      AND p.created_at >= ${dateFrom} AND p.created_at <= ${dateTo}
    GROUP BY c.id, c.first_name, c.last_name, sp.name
    HAVING SUM(p.amount) > 0
    ORDER BY revenue DESC
    LIMIT 10
  `

  // Get revenue by service plan
  const revenueByPlanResult = await sql`
    SELECT 
      sp.name as plan_name,
      COALESCE(SUM(p.amount), 0) as revenue,
      COUNT(DISTINCT c.id) as customer_count
    FROM customer_services cs
    LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
    LEFT JOIN customers c ON cs.customer_id = c.id
    LEFT JOIN payments p ON c.id = p.customer_id AND p.status = 'completed'
      AND p.created_at >= ${dateFrom} AND p.created_at <= ${dateTo}
    GROUP BY sp.name
    HAVING SUM(p.amount) > 0
    ORDER BY revenue DESC
  `

  // Get monthly growth (compare with previous period)
  const previousPeriodStart = new Date(dateFrom)
  const previousPeriodEnd = new Date(dateTo)
  const daysDiff = Math.ceil((previousPeriodEnd.getTime() - previousPeriodStart.getTime()) / (1000 * 60 * 60 * 24))

  previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff)
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - daysDiff)

  const previousRevenueResult = await sql`
    SELECT COALESCE(SUM(amount), 0) as previous_revenue
    FROM payments 
    WHERE status = 'completed' 
      AND created_at >= ${previousPeriodStart.toISOString().split("T")[0]}
      AND created_at <= ${previousPeriodEnd.toISOString().split("T")[0]}
  `

  // Calculate metrics
  const totalRevenue = Number(revenueResult[0].total_revenue)
  const totalExpenses = Number(expensesResult[0].total_expenses)
  const previousRevenue = Number(previousRevenueResult[0].previous_revenue)
  const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

  // Get accounts receivable (pending payments)
  const receivableResult = await sql`
    SELECT COALESCE(SUM(amount), 0) as accounts_receivable
    FROM payments 
    WHERE status = 'pending'
  `

  const payableResult = await sql`
    SELECT COALESCE(SUM(amount), 0) as accounts_payable
    FROM expenses 
    WHERE status = 'pending'
  `

  // Format revenue streams from service plans
  const totalPlanRevenue = revenueByPlanResult.reduce((sum, plan) => sum + Number(plan.revenue), 0)
  const revenueStreams = revenueByPlanResult.map((plan) => ({
    name: plan.plan_name,
    amount: Number(plan.revenue),
    percentage: totalPlanRevenue > 0 ? (Number(plan.revenue) / totalPlanRevenue) * 100 : 0,
    growth: Math.random() * 20 - 5, // Placeholder for now
  }))

  // Format top customers
  const topCustomers = topCustomersResult.map((customer) => ({
    name: customer.name,
    plan: customer.plan || "No Plan",
    revenue: Number(customer.revenue),
    growth: Math.random() * 30 - 10, // Placeholder for now
  }))

  const responseData = {
    totalRevenue,
    totalExpenses,
    monthlyGrowth,
    accountsReceivable: Number(receivableResult[0].accounts_receivable),
    accountsPayable: Number(payableResult[0].accounts_payable),
    cashFlow: totalRevenue - totalExpenses,
    revenueStreams,
    topCustomers,
    paymentCount: Number(revenueResult[0].payment_count),
  }

  return NextResponse.json(responseData)
}

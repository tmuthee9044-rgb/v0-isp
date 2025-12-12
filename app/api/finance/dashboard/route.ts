import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
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
  const sql = await getSql()

  const [revenueResult, expensesResult, receivableResult, payableResult] = await Promise.all([
    sql`SELECT COALESCE(SUM(amount), 0) as total_revenue, COUNT(*) as payment_count
        FROM payments 
        WHERE status = 'completed' AND created_at >= ${dateFrom} AND created_at <= ${dateTo}`,

    sql`SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses 
        WHERE expense_date >= ${dateFrom} AND expense_date <= ${dateTo}`,

    sql`SELECT COALESCE(SUM(amount), 0) as accounts_receivable
        FROM payments WHERE status = 'pending'`,

    sql`SELECT COALESCE(SUM(amount), 0) as accounts_payable
        FROM expenses WHERE status = 'pending'`,
  ])

  const totalRevenue = Number(revenueResult[0].total_revenue)
  const totalExpenses = Number(expensesResult[0].total_expenses)

  const responseData = {
    totalRevenue,
    totalExpenses,
    monthlyGrowth: 0,
    accountsReceivable: Number(receivableResult[0].accounts_receivable),
    accountsPayable: Number(payableResult[0].accounts_payable),
    cashFlow: totalRevenue - totalExpenses,
    revenueStreams: [],
    topCustomers: [],
    paymentCount: Number(revenueResult[0].payment_count),
  }

  return NextResponse.json(responseData)
}

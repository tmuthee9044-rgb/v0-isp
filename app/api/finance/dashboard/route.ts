import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const dateTo = new Date().toISOString().split("T")[0]
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    console.log("[v0] Finance dashboard GET - Date range:", { dateFrom, dateTo })
    return await fetchDashboardData(dateFrom, dateTo)
  } catch (error) {
    console.error("Finance dashboard GET error:", error)
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dateFrom, dateTo } = await request.json()
    console.log("[v0] Finance dashboard POST - Date range:", { dateFrom, dateTo })
    return await fetchDashboardData(dateFrom, dateTo)
  } catch (error) {
    console.error("Finance dashboard POST error:", error)
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
  }
}

async function fetchDashboardData(dateFrom: string, dateTo: string) {
  const sql = await getSql()

  console.log("[v0] Executing dashboard queries with date range:", { dateFrom, dateTo })

  const [revenueResult, expensesResult, receivableResult, payableResult] = await Promise.all([
    // Revenue from paid invoices in the date range
    sql`SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(*) as invoice_count
        FROM invoices 
        WHERE status IN ('paid', 'completed') 
        AND created_at::date BETWEEN ${dateFrom}::date AND ${dateTo}::date`,

    // Expenses in the date range
    sql`SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count
        FROM expenses 
        WHERE expense_date BETWEEN ${dateFrom}::date AND ${dateTo}::date`,

    // Accounts receivable from unpaid invoices
    sql`SELECT COALESCE(SUM(total_amount), 0) as accounts_receivable, COUNT(*) as pending_invoices
        FROM invoices 
        WHERE status IN ('pending', 'overdue', 'sent')`,

    // Accounts payable from pending expenses (if any)
    sql`SELECT COALESCE(SUM(amount), 0) as accounts_payable, COUNT(*) as pending_expenses
        FROM expenses 
        WHERE status = 'pending'`,
  ])

  console.log("[v0] Dashboard query results:", {
    revenue: revenueResult[0],
    expenses: expensesResult[0],
    receivable: receivableResult[0],
    payable: payableResult[0],
  })

  const totalRevenue = Number(revenueResult[0]?.total_revenue) || 0
  const totalExpenses = Number(expensesResult[0]?.total_expenses) || 0

  const responseData = {
    totalRevenue,
    totalExpenses,
    monthlyGrowth: 0, // Calculate from previous period if needed
    accountsReceivable: Number(receivableResult[0]?.accounts_receivable) || 0,
    accountsPayable: Number(payableResult[0]?.accounts_payable) || 0,
    cashFlow: totalRevenue - totalExpenses,
    revenueStreams: [],
    topCustomers: [],
    invoiceCount: Number(revenueResult[0]?.invoice_count) || 0,
    expenseCount: Number(expensesResult[0]?.expense_count) || 0,
    pendingInvoices: Number(receivableResult[0]?.pending_invoices) || 0,
  }

  console.log("[v0] Dashboard response data:", responseData)

  return NextResponse.json(responseData)
}

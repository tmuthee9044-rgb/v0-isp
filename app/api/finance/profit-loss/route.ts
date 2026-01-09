import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json({ message: "Start date and end date are required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Fetch revenue data (from invoices and payments)
    const revenueResult = await sql`
      SELECT 
        COALESCE(SUM(i.amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.amount ELSE 0 END), 0) as pending_revenue
      FROM invoices i
      WHERE i.created_at >= ${startDate}::date
        AND i.created_at <= ${endDate}::date
    `

    // Fetch expense data
    const expensesResult = await sql`
      SELECT 
        COALESCE(SUM(e.amount), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as approved_expenses,
        COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0) as pending_expenses
      FROM expenses e
      WHERE e.expense_date >= ${startDate}::date
        AND e.expense_date <= ${endDate}::date
    `

    // Fetch expenses by category
    const expensesByCategoryResult = await sql`
      SELECT 
        COALESCE(ec.name, 'Uncategorized') as category_name,
        COALESCE(SUM(e.amount), 0) as amount
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.expense_date >= ${startDate}::date
        AND e.expense_date <= ${endDate}::date
        AND e.status = 'approved'
      GROUP BY ec.name
      ORDER BY amount DESC
    `

    // Revenue by service will be calculated from customer_services instead
    const revenueByServiceResult = await sql`
      SELECT 
        sp.name as service_name,
        COUNT(DISTINCT cs.customer_id) as customer_count,
        COALESCE(SUM(cs.monthly_fee), 0) as amount
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.status = 'active'
        AND cs.start_date <= ${endDate}::date
        AND (cs.end_date IS NULL OR cs.end_date >= ${startDate}::date)
      GROUP BY sp.name
      ORDER BY amount DESC
    `

    const revenue = revenueResult[0]
    const expenses = expensesResult[0]

    const totalRevenue = Number.parseFloat(revenue.total_revenue || "0")
    const totalExpenses = Number.parseFloat(expenses.total_expenses || "0")
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          paidRevenue: Number.parseFloat(revenue.paid_revenue || "0"),
          pendingRevenue: Number.parseFloat(revenue.pending_revenue || "0"),
          totalExpenses,
          approvedExpenses: Number.parseFloat(expenses.approved_expenses || "0"),
          pendingExpenses: Number.parseFloat(expenses.pending_expenses || "0"),
          netProfit,
          profitMargin,
        },
        expensesByCategory: expensesByCategoryResult.map((row) => ({
          category: row.category_name || "Uncategorized",
          amount: Number.parseFloat(row.amount || "0"),
        })),
        revenueByService: revenueByServiceResult.map((row) => ({
          service: row.service_name || "Other",
          amount: Number.parseFloat(row.amount || "0"),
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching profit & loss:", error)
    return NextResponse.json({ message: "Failed to fetch profit & loss data", error: String(error) }, { status: 500 })
  }
}

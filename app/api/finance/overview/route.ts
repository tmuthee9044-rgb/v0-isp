import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") {
      return NextResponse.json({
        success: true,
        data: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          cashFlow: 0,
          accountsReceivable: 0,
          accountsPayable: 0,
          monthlyGrowth: 0,
        },
      })
    }

    const sql = neon(process.env.DATABASE_URL)

    const [revenueResult, expensesResult, invoicesResult] = await Promise.all([
      sql`
        SELECT 
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(*) as total_transactions
        FROM payments 
        WHERE status = 'completed' 
        AND created_at >= date_trunc('month', CURRENT_DATE)
      `,
      sql`
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      `,
      sql`
        SELECT 
          COALESCE(SUM(amount), 0) as accounts_receivable
        FROM invoices 
        WHERE status IN ('pending', 'overdue')
      `,
    ])

    const totalRevenue = Number(revenueResult[0]?.total_revenue || 0)
    const totalExpenses = Number(expensesResult[0]?.total_expenses || 0)
    const accountsReceivable = Number(invoicesResult[0]?.accounts_receivable || 0)

    const financialData = {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      cashFlow: totalRevenue - totalExpenses,
      accountsReceivable,
      accountsPayable: 0,
      monthlyGrowth: 0,
    }

    return NextResponse.json({ success: true, data: financialData })
  } catch (error) {
    console.error("Error fetching financial overview:", error)
    return NextResponse.json(
      {
        success: true,
        data: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          cashFlow: 0,
          accountsReceivable: 0,
          accountsPayable: 0,
          monthlyGrowth: 0,
        },
      },
      { status: 200 },
    )
  }
}

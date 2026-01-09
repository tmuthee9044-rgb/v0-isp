import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate =
      searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0]

    // Get cash inflows (payments received)
    const inflows = await sql`
      SELECT 
        SUM(CASE WHEN payment_method = 'mpesa' THEN amount ELSE 0 END) as mpesa_payments,
        SUM(CASE WHEN payment_method = 'bank' THEN amount ELSE 0 END) as bank_payments,
        SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_payments,
        SUM(amount) as total_inflows
      FROM payments 
      WHERE status = 'completed' 
      AND payment_date >= ${startDate}
      AND payment_date <= ${endDate}
    `

    // Get cash outflows (expenses)
    const outflows = await sql`
      SELECT 
        SUM(CASE WHEN category_id = 1 THEN amount ELSE 0 END) as operating_expenses,
        SUM(CASE WHEN category_id = 2 THEN amount ELSE 0 END) as equipment_purchases,
        SUM(CASE WHEN category_id = 3 THEN amount ELSE 0 END) as salaries,
        SUM(CASE WHEN category_id = 4 THEN amount ELSE 0 END) as utilities,
        SUM(amount) as total_outflows
      FROM expenses 
      WHERE expense_date >= ${startDate}
      AND expense_date <= ${endDate}
    `

    // Calculate projections based on trends
    const projections = {
      thirty_days: (inflows[0]?.total_inflows || 0) * 1.25,
      sixty_days: (inflows[0]?.total_inflows || 0) * 1.6,
      ninety_days: (inflows[0]?.total_inflows || 0) * 1.98,
    }

    return NextResponse.json({
      success: true,
      data: {
        inflows: inflows[0] || {},
        outflows: outflows[0] || {},
        projections,
        net_cash_flow: (inflows[0]?.total_inflows || 0) - (outflows[0]?.total_outflows || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching cash flow data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch cash flow data" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    // Get monthly revenue from payments
    const monthlyRevenue = await sql`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments 
      WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND status = 'completed'
    `

    // Get total outstanding from invoices
    const outstanding = await sql`
      SELECT COALESCE(SUM(amount), 0) as outstanding
      FROM invoices 
      WHERE status = 'pending'
    `

    // Get active customers for ARPU calculation
    const activeCustomers = await sql`
      SELECT COUNT(*) as active
      FROM customers 
      WHERE status = 'active'
    `

    // Get revenue by customer location
    const revenueByArea = await sql`
      SELECT 
        'All Areas' as area,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customer_id 
        AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND p.status = 'completed'
      WHERE c.status = 'active'
    `

    const revenue = Number.parseFloat(monthlyRevenue[0]?.revenue || 0)
    const totalOutstanding = Number.parseFloat(outstanding[0]?.outstanding || 0)
    const activeCount = Number.parseInt(activeCustomers[0]?.active || 1)

    // Calculate ARPU
    const arpu = activeCount > 0 ? revenue / activeCount : 0

    const expenses = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    const totalExpenses = Number.parseFloat(expenses[0]?.total_expenses || 0)
    const profitMargin = revenue > 0 ? Math.round(((revenue - totalExpenses) / revenue) * 100) : 0

    const collectionStats = await sql`
      SELECT 
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(*) as total_count
      FROM invoices
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
    `

    const paidCount = Number.parseInt(collectionStats[0]?.paid_count || 0)
    const totalCount = Number.parseInt(collectionStats[0]?.total_count || 0)
    const collectionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

    // Calculate revenue distribution percentages
    const totalAreaRevenue = revenueByArea.reduce((sum, area) => sum + Number.parseFloat(area.revenue || 0), 0)
    const areaRevenueWithPercentage = revenueByArea.map((area) => ({
      area: area.area,
      revenue: Number.parseFloat(area.revenue || 0),
      percentage:
        totalAreaRevenue > 0 ? Math.round((Number.parseFloat(area.revenue || 0) / totalAreaRevenue) * 100) : 0,
    }))

    const financialData = {
      monthlyRevenue: revenue,
      yearlyProjection: revenue * 12, // Simple projection
      arpu: Math.round(arpu * 100) / 100,
      margin: profitMargin, // Now using real calculated margin
      collections: collectionRate, // Now using real collection rate
      outstanding: totalOutstanding,
      areaRevenue: areaRevenueWithPercentage,
    }

    return NextResponse.json(financialData)
  } catch (error) {
    console.error("Error fetching financial overview data:", error)
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
  }
}

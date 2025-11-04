import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || "")

export async function GET() {
  try {
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
      margin: 65 + Math.random() * 10, // Mock margin 65-75%
      collections: 90 + Math.random() * 8, // Mock collection rate 90-98%
      outstanding: totalOutstanding,
      areaRevenue: areaRevenueWithPercentage,
    }

    return NextResponse.json(financialData)
  } catch (error) {
    console.error("Error fetching financial overview data:", error)
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
  }
}

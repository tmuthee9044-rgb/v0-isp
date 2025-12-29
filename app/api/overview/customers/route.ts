import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    // Get total customers
    const totalCustomers = await sql`
      SELECT COUNT(*) as total
      FROM customers
    `

    // Get active customers
    const activeCustomers = await sql`
      SELECT COUNT(*) as active
      FROM customers 
      WHERE status = 'active'
    `

    // Get new customers this month
    const newCustomers = await sql`
      SELECT COUNT(*) as new_count
      FROM customers 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `

    // Get churned customers this month
    const churnedCustomers = await sql`
      SELECT COUNT(*) as churned
      FROM customers 
      WHERE status = 'inactive' 
      AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)
    `

    const satisfactionData = await sql`
      SELECT AVG(rating) as avg_rating
      FROM customer_feedback
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `

    const openTickets = await sql`
      SELECT COUNT(*) as count
      FROM support_tickets
      WHERE status IN ('open', 'pending', 'in_progress')
    `

    const resolvedTickets = await sql`
      SELECT COUNT(*) as count
      FROM support_tickets
      WHERE status = 'resolved'
      AND resolved_at >= DATE_TRUNC('week', CURRENT_DATE)
    `

    const avgResolutionTime = await sql`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
      FROM support_tickets
      WHERE status = 'resolved'
      AND resolved_at >= CURRENT_DATE - INTERVAL '30 days'
    `

    // Get customer distribution by location
    const distribution = await sql`
      SELECT 
        COALESCE(city, 'Unknown') as area,
        COUNT(*) as count
      FROM customers 
      WHERE status = 'active'
      GROUP BY city
      ORDER BY count DESC
    `

    const total = Number.parseInt(totalCustomers[0]?.total || 0)
    const distributionWithPercentage = distribution.map((item) => ({
      area: item.area,
      count: Number.parseInt(item.count),
      percentage: total > 0 ? Math.round((Number.parseInt(item.count) / total) * 100) : 0,
    }))

    const avgHours = Number.parseFloat(avgResolutionTime[0]?.avg_hours || 0)
    const avgTime = avgHours > 0 ? `${avgHours.toFixed(1)} hours` : "N/A"
    const satisfaction = Number.parseFloat(satisfactionData[0]?.avg_rating || 0)

    const customerData = {
      total: total,
      new: Number.parseInt(newCustomers[0]?.new_count || 0),
      churn: Number.parseInt(churnedCustomers[0]?.churned || 0),
      satisfaction: satisfaction > 0 ? Number.parseFloat(satisfaction.toFixed(1)) : 0,
      support: {
        open: Number.parseInt(openTickets[0]?.count || 0),
        resolved: Number.parseInt(resolvedTickets[0]?.count || 0),
        avgTime: avgTime,
      },
      distribution: distributionWithPercentage,
    }

    return NextResponse.json(customerData)
  } catch (error) {
    console.error("Error fetching customer overview data:", error)
    return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 })
  }
}

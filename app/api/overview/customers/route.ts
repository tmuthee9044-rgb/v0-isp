import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || "")

export async function GET() {
  try {
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

    const customerData = {
      total: total,
      new: Number.parseInt(newCustomers[0]?.new_count || 0),
      churn: Number.parseInt(churnedCustomers[0]?.churned || 0),
      satisfaction: 4.2 + Math.random() * 0.8, // Mock satisfaction score
      support: {
        open: Math.floor(Math.random() * 20) + 5, // Mock open tickets
        resolved: Math.floor(Math.random() * 50) + 80, // Mock resolved tickets
        avgTime: `${(Math.random() * 3 + 1).toFixed(1)} hours`, // Mock avg time
      },
      distribution: distributionWithPercentage,
    }

    return NextResponse.json(customerData)
  } catch (error) {
    console.error("Error fetching customer overview data:", error)
    return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 })
  }
}

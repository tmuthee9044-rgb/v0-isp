import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const totalResult = await sql`SELECT COUNT(*) as count FROM customers`
    const activeResult = await sql`SELECT COUNT(*) as count FROM customers WHERE status = 'active'`
    const suspendedResult = await sql`SELECT COUNT(*) as count FROM customers WHERE status = 'suspended'`
    const inactiveResult = await sql`SELECT COUNT(*) as count FROM customers WHERE status = 'inactive'`
    const recentResult =
      await sql`SELECT COUNT(*) as count FROM customers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
    const weekResult =
      await sql`SELECT COUNT(*) as count FROM customers WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)`
    const monthResult =
      await sql`SELECT COUNT(*) as count FROM customers WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`

    // Get financial stats separately
    const outstandingResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM invoices 
      WHERE status = 'unpaid'
    `

    const revenueResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE status = 'completed' 
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `

    const result = {
      total_customers: Number(totalResult[0].count),
      active_customers: Number(activeResult[0].count),
      suspended_customers: Number(suspendedResult[0].count),
      inactive_customers: Number(inactiveResult[0].count),
      recent_customers: Number(recentResult[0].count),
      new_this_week: Number(weekResult[0].count),
      new_this_month: Number(monthResult[0].count),
      total_outstanding: Number(outstandingResult[0].total),
      revenue_this_month: Number(revenueResult[0].total),
    }

    console.log("[v0] Customer stats from database:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch customer stats:", error)
    return NextResponse.json({ error: "Failed to fetch customer stats" }, { status: 500 })
  }
}

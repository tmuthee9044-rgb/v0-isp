import { NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0]

    // Fetch expenses grouped by category and subcategory
    const costs = await sql`
      SELECT 
        ec.name as category,
        ec.color,
        e.description as subcategory,
        SUM(e.amount) as total_amount,
        COUNT(e.id) as transaction_count
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.expense_date >= ${startDate}
      AND e.expense_date <= ${endDate}
      AND e.status IN ('paid', 'approved')
      GROUP BY ec.name, ec.color, e.description
      ORDER BY ec.name, total_amount DESC
    `

    // Group by main category
    const groupedCosts: Record<string, any> = {}
    
    for (const cost of costs) {
      const categoryKey = cost.category
      
      if (!groupedCosts[categoryKey]) {
        groupedCosts[categoryKey] = {
          category: cost.category,
          color: cost.color,
          items: [],
          total: 0
        }
      }
      
      groupedCosts[categoryKey].items.push({
        subcategory: cost.subcategory,
        amount: Number(cost.total_amount),
        count: cost.transaction_count
      })
      
      groupedCosts[categoryKey].total += Number(cost.total_amount)
    }

    // Map categories to display icons
    const categoryMapping: Record<string, string> = {
      "Bandwidth & Connectivity": "wifi",
      "Infrastructure & Equipment": "server",
      "Personnel Costs": "user",
      "Regulatory & Compliance": "shield"
    }

    const result = Object.values(groupedCosts).map((group: any) => ({
      ...group,
      icon: categoryMapping[group.category] || "dollar"
    }))

    return NextResponse.json({
      success: true,
      data: result,
      period: { startDate, endDate }
    })
  } catch (error: any) {
    console.error("[v0] Error fetching infrastructure costs:", error)
    return NextResponse.json(
      { error: "Failed to fetch infrastructure costs", details: error.message },
      { status: 500 }
    )
  }
}

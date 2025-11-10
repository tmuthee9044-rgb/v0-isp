import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    console.log("[v0] Fetching customer return rates report:", { startDate, endDate })

    // Get customer return metrics with proper date filtering
    let customerReturns

    if (startDate && endDate) {
      customerReturns = await sql`
        SELECT 
          c.id as customer_id,
          c.first_name || ' ' || c.last_name as customer_name,
          c.email,
          c.phone,
          c.customer_type,
          c.status as customer_status,
          COUNT(DISTINCT er.id) as total_returns,
          COUNT(DISTINCT ce.id) as total_equipment_assigned,
          COUNT(DISTINCT CASE WHEN er.return_condition = 'working' THEN er.id END) as working_returns,
          COUNT(DISTINCT CASE WHEN er.return_condition IN ('faulty', 'broken', 'damaged') THEN er.id END) as problem_returns,
          ROUND(
            (COUNT(DISTINCT er.id)::numeric / NULLIF(COUNT(DISTINCT ce.id), 0) * 100), 2
          ) as return_rate,
          ROUND(AVG(er.days_in_use), 0) as avg_days_before_return,
          MIN(er.return_date) as first_return_date,
          MAX(er.return_date) as last_return_date
        FROM customers c
        LEFT JOIN customer_equipment ce ON ce.customer_id = c.id
        LEFT JOIN equipment_returns er ON er.customer_id = c.id 
          AND er.return_date BETWEEN ${startDate}::date AND ${endDate}::date
        GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.customer_type, c.status
        HAVING COUNT(DISTINCT ce.id) > 0
        ORDER BY return_rate DESC NULLS LAST, total_returns DESC
      `
    } else {
      customerReturns = await sql`
        SELECT 
          c.id as customer_id,
          c.first_name || ' ' || c.last_name as customer_name,
          c.email,
          c.phone,
          c.customer_type,
          c.status as customer_status,
          COUNT(DISTINCT er.id) as total_returns,
          COUNT(DISTINCT ce.id) as total_equipment_assigned,
          COUNT(DISTINCT CASE WHEN er.return_condition = 'working' THEN er.id END) as working_returns,
          COUNT(DISTINCT CASE WHEN er.return_condition IN ('faulty', 'broken', 'damaged') THEN er.id END) as problem_returns,
          ROUND(
            (COUNT(DISTINCT er.id)::numeric / NULLIF(COUNT(DISTINCT ce.id), 0) * 100), 2
          ) as return_rate,
          ROUND(AVG(er.days_in_use), 0) as avg_days_before_return,
          MIN(er.return_date) as first_return_date,
          MAX(er.return_date) as last_return_date
        FROM customers c
        LEFT JOIN customer_equipment ce ON ce.customer_id = c.id
        LEFT JOIN equipment_returns er ON er.customer_id = c.id
        GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.customer_type, c.status
        HAVING COUNT(DISTINCT ce.id) > 0
        ORDER BY return_rate DESC NULLS LAST, total_returns DESC
      `
    }

    console.log("[v0] Customer returns query executed, found customers:", customerReturns.length)

    // Categorize customers by return behavior
    const customersWithCategories = customerReturns.map((customer: any) => {
      const returnRate = Number.parseFloat(customer.return_rate) || 0
      const totalReturns = Number.parseInt(customer.total_returns) || 0
      const problemReturns = Number.parseInt(customer.problem_returns) || 0

      let category = "Unknown"
      let risk_level = "low"

      if (totalReturns === 0) {
        category = "No Returns"
        risk_level = "low"
      } else if (returnRate <= 10) {
        category = "Low Return Rate"
        risk_level = "low"
      } else if (returnRate <= 30) {
        category = "Moderate Return Rate"
        risk_level = "medium"
      } else {
        category = "High Return Rate"
        risk_level = "high"
      }

      // Adjust risk based on problem returns
      if (problemReturns > 0 && totalReturns > 0) {
        const problemRate = (problemReturns / totalReturns) * 100
        if (problemRate > 50) {
          risk_level = "high"
        }
      }

      return {
        ...customer,
        category,
        risk_level,
        problem_return_rate: totalReturns > 0 ? Math.round((problemReturns / totalReturns) * 100) : 0,
      }
    })

    // Sort: lowest return rate first (best customers)
    customersWithCategories.sort((a: any, b: any) => {
      const rateA = Number.parseFloat(a.return_rate) || 0
      const rateB = Number.parseFloat(b.return_rate) || 0
      return rateA - rateB
    })

    console.log("[v0] Customer return rates report generated:", {
      totalCustomers: customersWithCategories.length,
      dateRange: { startDate, endDate },
    })

    return NextResponse.json({
      success: true,
      customers: customersWithCategories,
      summary: {
        total_customers: customersWithCategories.length,
        no_returns: customersWithCategories.filter((c: any) => c.category === "No Returns").length,
        low_return_rate: customersWithCategories.filter((c: any) => c.category === "Low Return Rate").length,
        moderate_return_rate: customersWithCategories.filter((c: any) => c.category === "Moderate Return Rate").length,
        high_return_rate: customersWithCategories.filter((c: any) => c.category === "High Return Rate").length,
        high_risk_customers: customersWithCategories.filter((c: any) => c.risk_level === "high").length,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating customer return rates report:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate customer return rates report",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    console.log("[v0] Fetching supplier quality report:", { startDate, endDate })

    // Get supplier quality metrics
    const supplierQuality = await sql`
      SELECT 
        s.id as supplier_id,
        s.company_name,
        s.contact_name,
        s.email,
        s.phone,
        COUNT(DISTINCT er.id) as total_returns,
        COUNT(DISTINCT CASE WHEN er.return_condition = 'working' THEN er.id END) as working_returns,
        COUNT(DISTINCT CASE WHEN er.return_condition = 'faulty' THEN er.id END) as faulty_returns,
        COUNT(DISTINCT CASE WHEN er.return_condition = 'damaged' THEN er.id END) as damaged_returns,
        COUNT(DISTINCT CASE WHEN er.return_condition = 'broken' THEN er.id END) as broken_returns,
        COUNT(DISTINCT ii.id) as total_items_supplied,
        ROUND(
          (COUNT(DISTINCT CASE WHEN er.return_condition IN ('faulty', 'broken') THEN er.id END)::numeric / 
          NULLIF(COUNT(DISTINCT er.id), 0) * 100), 2
        ) as fault_rate,
        ROUND(AVG(er.days_in_use), 0) as avg_days_before_return,
        MIN(er.return_date) as first_return_date,
        MAX(er.return_date) as last_return_date
      FROM suppliers s
      LEFT JOIN inventory_items ii ON ii.supplier_id = s.id
      LEFT JOIN equipment_returns er ON er.supplier_id = s.id
        ${startDate && endDate ? sql`AND er.return_date BETWEEN ${startDate}::date AND ${endDate}::date` : sql``}
      GROUP BY s.id, s.company_name, s.contact_name, s.email, s.phone
      HAVING COUNT(DISTINCT ii.id) > 0
      ORDER BY fault_rate ASC NULLS LAST, total_returns DESC
    `

    // Calculate quality scores and recommendations
    const suppliersWithScores = supplierQuality.map((supplier: any) => {
      const faultRate = Number.parseFloat(supplier.fault_rate) || 0
      const totalReturns = Number.parseInt(supplier.total_returns) || 0
      const workingReturns = Number.parseInt(supplier.working_returns) || 0

      // Quality score: 100 - fault_rate, adjusted for volume
      let qualityScore = 100 - faultRate

      // Bonus for high working return rate (customer upgrade/change, not fault)
      if (totalReturns > 0) {
        const workingReturnRate = (workingReturns / totalReturns) * 100
        qualityScore += workingReturnRate * 0.1 // Small bonus for working returns
      }

      // Quality rating
      let rating = "Unknown"
      let recommendation = "Insufficient data"

      if (totalReturns >= 5) {
        if (faultRate <= 5) {
          rating = "Excellent"
          recommendation = "Highly recommended - Very low fault rate"
        } else if (faultRate <= 15) {
          rating = "Good"
          recommendation = "Recommended - Acceptable fault rate"
        } else if (faultRate <= 30) {
          rating = "Fair"
          recommendation = "Use with caution - Moderate fault rate"
        } else {
          rating = "Poor"
          recommendation = "Not recommended - High fault rate"
        }
      } else if (totalReturns > 0) {
        rating = "Limited Data"
        recommendation = "Monitor closely - Insufficient return history"
      }

      return {
        ...supplier,
        quality_score: Math.round(qualityScore * 10) / 10,
        rating,
        recommendation,
      }
    })

    console.log("[v0] Supplier quality report generated:", {
      totalSuppliers: suppliersWithScores.length,
      dateRange: { startDate, endDate },
    })

    return NextResponse.json({
      success: true,
      suppliers: suppliersWithScores,
      summary: {
        total_suppliers: suppliersWithScores.length,
        excellent_suppliers: suppliersWithScores.filter((s: any) => s.rating === "Excellent").length,
        good_suppliers: suppliersWithScores.filter((s: any) => s.rating === "Good").length,
        fair_suppliers: suppliersWithScores.filter((s: any) => s.rating === "Fair").length,
        poor_suppliers: suppliersWithScores.filter((s: any) => s.rating === "Poor").length,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating supplier quality report:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate supplier quality report",
      },
      { status: 500 },
    )
  }
}

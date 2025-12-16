import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const reviews = await sql`
      SELECT 
        pr.*,
        e.first_name,
        e.last_name,
        e.employee_id,
        e.position
      FROM performance_reviews pr
      LEFT JOIN employees e ON pr.employee_id = e.employee_id
      ORDER BY pr.review_date DESC
      LIMIT 100
    `

    return NextResponse.json({ success: true, reviews: reviews || [] })
  } catch (error) {
    console.error("Error fetching performance reviews:", error)
    return NextResponse.json({ success: false, reviews: [] })
  }
}

export async function POST(request: Request) {
  try {
    const sql = await getSql()
    const body = await request.json()

    const {
      employeeId,
      reviewPeriod,
      reviewType,
      rating,
      score,
      goals,
      achievements,
      areasForImprovement,
      developmentPlan,
      reviewedBy,
      reviewDate,
      nextReviewDate,
    } = body

    console.log("[v0] Creating performance review for employee:", employeeId)

    // Insert the performance review
    const result = await sql`
      INSERT INTO performance_reviews (
        employee_id,
        review_period,
        review_type,
        rating,
        score,
        goals,
        achievements,
        areas_for_improvement,
        development_plan,
        reviewed_by,
        review_date,
        next_review_date,
        status
      ) VALUES (
        ${employeeId},
        ${reviewPeriod},
        ${reviewType || "quarterly"},
        ${rating},
        ${score || 0},
        ${goals},
        ${achievements},
        ${areasForImprovement || null},
        ${developmentPlan || null},
        ${reviewedBy},
        ${reviewDate},
        ${nextReviewDate || null},
        'completed'
      )
      RETURNING id
    `

    // Update employee's performance rating
    await sql`
      UPDATE employees
      SET performance_rating = ${rating}
      WHERE employee_id = ${employeeId}
    `

    // Log activity
    await sql`
      INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details
      ) VALUES (
        1,
        'CREATE',
        'performance_review',
        ${result[0].id},
        ${JSON.stringify({
          employee_id: employeeId,
          review_period: reviewPeriod,
          rating: rating,
          reviewed_by: reviewedBy,
        })}
      )
    `.catch((err) => console.error("[v0] Failed to log activity:", err))

    console.log("[v0] Performance review created successfully")

    return NextResponse.json({
      success: true,
      message: "Performance review created successfully",
      reviewId: result[0].id,
    })
  } catch (error) {
    console.error("[v0] Error creating performance review:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create performance review",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

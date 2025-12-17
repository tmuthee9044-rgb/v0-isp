import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const sql = await getSql()
    const body = await request.json()

    const { employeeId, leaveType, startDate, endDate, days, reason } = body

    console.log("[v0] Creating leave request:", { employeeId, leaveType, days })

    const result = await sql`
      INSERT INTO leave_requests (
        employee_id, 
        leave_type, 
        start_date, 
        end_date, 
        days_requested, 
        reason, 
        status,
        created_at
      )
      VALUES (
        ${employeeId},
        ${leaveType},
        ${startDate},
        ${endDate},
        ${days},
        ${reason},
        'pending',
        CURRENT_TIMESTAMP
      )
      RETURNING id, employee_id, leave_type, start_date, end_date, days_requested as days, status
    `

    console.log("[v0] Leave request created successfully:", result[0])

    // Log activity
    try {
      await sql`
        INSERT INTO activity_logs (
          user_id, 
          action, 
          entity_type, 
          entity_id, 
          details, 
          created_at
        )
        VALUES (
          ${employeeId},
          'create',
          'leave_request',
          ${result[0].id},
          ${JSON.stringify({ leaveType, days, startDate, endDate })},
          CURRENT_TIMESTAMP
        )
      `
    } catch (logError) {
      console.error("[v0] Failed to log leave request activity:", logError)
    }

    return NextResponse.json({
      success: true,
      leaveRequest: result[0],
    })
  } catch (error) {
    console.error("[v0] Error creating leave request:", error)
    return NextResponse.json({ error: "Failed to create leave request", details: error }, { status: 500 })
  }
}

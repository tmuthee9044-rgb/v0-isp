import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const leaveRequests = await sql`
      SELECT 
        lr.*,
        e.first_name,
        e.last_name,
        e.employee_id
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      ORDER BY lr.created_at DESC
      LIMIT 50
    `

    const pending = leaveRequests.filter((lr: any) => lr.status === "pending").length
    const approved = leaveRequests.filter(
      (lr: any) => lr.status === "approved" && new Date(lr.start_date).getMonth() === new Date().getMonth(),
    ).length
    const onLeave = leaveRequests.filter(
      (lr: any) =>
        lr.status === "approved" && new Date(lr.start_date) <= new Date() && new Date(lr.end_date) >= new Date(),
    ).length

    const approvedDays = leaveRequests
      .filter((lr: any) => lr.status === "approved" && new Date(lr.start_date).getMonth() === new Date().getMonth())
      .reduce((sum: number, lr: any) => sum + (lr.days_requested || 0), 0)

    return NextResponse.json({
      success: true,
      leaveRequests: leaveRequests || [],
      stats: {
        pending,
        approved,
        onLeave,
        approvedDays,
      },
    })
  } catch (error) {
    console.error("Error fetching leave requests:", error)
    return NextResponse.json({
      success: false,
      leaveRequests: [],
      stats: { pending: 0, approved: 0, onLeave: 0, approvedDays: 0 },
    })
  }
}

export async function POST(request: Request) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const { employeeId, leaveType, startDate, endDate, days, reason } = body

    console.log("[v0] Submitting leave request:", { employeeId, leaveType, startDate, endDate, days })

    // Get employee ID from employee_id
    const employee = await sql`
      SELECT id FROM employees WHERE employee_id = ${employeeId}
    `

    if (!employee || employee.length === 0) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
    }

    // Insert leave request
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
      ) VALUES (
        ${employee[0].id},
        ${leaveType},
        ${startDate},
        ${endDate},
        ${days},
        ${reason},
        'pending',
        NOW()
      )
      RETURNING *
    `

    console.log("[v0] Leave request created:", result[0])

    // Log activity
    await sql`
      INSERT INTO activity_logs (
        entity_type,
        entity_id,
        action,
        user_id,
        details,
        created_at
      ) VALUES (
        'leave_request',
        ${result[0].id},
        'created',
        1,
        ${JSON.stringify({ employeeId, leaveType, days })},
        NOW()
      )
    `

    return NextResponse.json({ success: true, leaveRequest: result[0] })
  } catch (error: any) {
    console.error("[v0] Error creating leave request:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leave request" },
      { status: 500 },
    )
  }
}

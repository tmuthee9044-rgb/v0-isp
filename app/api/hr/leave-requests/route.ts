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
      leaveRequests: [],
      stats: { pending: 0, approved: 0, onLeave: 0, approvedDays: 0 },
    })
  }
}

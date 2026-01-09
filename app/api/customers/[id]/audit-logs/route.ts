import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const activityType = searchParams.get("type")
    const searchQuery = searchParams.get("search")

    console.log("[v0] Fetching comprehensive activity logs for customer:", customerId)

    const activities = []

    // Fetch payments
    const payments = await sql`
      SELECT 
        p.id,
        'payment' as type,
        p.amount,
        p.payment_method,
        p.status,
        p.created_at as timestamp,
        p.transaction_id as notes,
        NULL as admin_name,
        NULL as ip_address
      FROM payments p
      WHERE p.customer_id = ${Number.parseInt(customerId)}
      ORDER BY p.created_at DESC
      LIMIT 50
    `

    // Fetch credit notes
    const creditNotes = await sql`
      SELECT 
        cn.id,
        'credit_note' as type,
        cn.amount,
        cn.credit_note_number,
        cn.status,
        cn.created_at as timestamp,
        cn.reason,
        cn.notes,
        u.username as admin_name,
        NULL as ip_address
      FROM credit_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      WHERE cn.customer_id = ${Number.parseInt(customerId)}
      ORDER BY cn.created_at DESC
      LIMIT 50
    `

    // Fetch admin actions
    const adminLogs = await sql`
      SELECT 
        al.id,
        'admin_action' as type,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_values,
        al.new_values,
        al.created_at as timestamp,
        al.ip_address,
        u.username as admin_name
      FROM admin_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      WHERE (
        (al.resource_type = 'customer' AND al.resource_id = ${Number.parseInt(customerId)})
        OR al.new_values::text LIKE ${`%"customer_id":${customerId}%`}
        OR al.new_values::text LIKE ${`%"customer_id":"${customerId}"%`}
      )
      ORDER BY al.created_at DESC
      LIMIT 50
    `

    // Fetch service changes
    const serviceChanges = await sql`
      SELECT 
        cs.id,
        'service_change' as type,
        cs.status,
        cs.created_at as timestamp,
        sp.name as service_name,
        NULL as admin_name
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${Number.parseInt(customerId)}
      ORDER BY cs.created_at DESC
      LIMIT 50
    `

    // Combine and format all activities
    const allActivities = [
      ...payments.map((p: any) => ({
        id: `payment-${p.id}`,
        timestamp: p.timestamp,
        type: "PAYMENT",
        description: `Payment received: ${p.payment_method} - KES ${Number(p.amount).toFixed(2)}`,
        amount: `KES ${Number(p.amount).toFixed(2)}`,
        status: p.status?.toUpperCase() || "COMPLETED",
        admin: p.admin_name || "-",
        ip: p.ip_address || "-",
        icon: "payment",
      })),
      ...creditNotes.map((cn: any) => ({
        id: `credit-note-${cn.id}`,
        timestamp: cn.timestamp,
        type: "CREDIT NOTE",
        description: `Credit note ${cn.credit_note_number} issued - KES ${Number(cn.amount).toFixed(2)} (${cn.reason || "refund"})`,
        amount: `KES ${Number(cn.amount).toFixed(2)}`,
        status: cn.status?.toUpperCase() || "APPROVED",
        admin: cn.admin_name || "-",
        ip: "-",
        icon: "credit_note",
      })),
      ...adminLogs.map((al: any) => ({
        id: `admin-${al.id}`,
        timestamp: al.timestamp,
        type: "ADMIN ACTION",
        description: `${al.action} ${al.resource_type} #${al.resource_id}`,
        amount: "-",
        status: "INFO",
        admin: al.admin_name || "-",
        ip: al.ip_address || "-",
        icon: "admin",
      })),
      ...serviceChanges.map((sc: any) => ({
        id: `service-${sc.id}`,
        timestamp: sc.timestamp,
        type: "SERVICE CHANGE",
        description: `Service ${sc.service_name} ${sc.status}`,
        amount: "-",
        status: sc.status?.toUpperCase() || "INFO",
        admin: sc.admin_name || "-",
        ip: "-",
        icon: "service",
      })),
    ]

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply filters
    let filteredActivities = allActivities

    if (activityType && activityType !== "all") {
      filteredActivities = filteredActivities.filter((a) => a.type.toLowerCase().includes(activityType.toLowerCase()))
    }

    if (searchQuery) {
      filteredActivities = filteredActivities.filter(
        (a) =>
          a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    console.log("[v0] Found total activities:", filteredActivities.length)

    return NextResponse.json({
      success: true,
      activities: filteredActivities.slice(0, 100),
      total: filteredActivities.length,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching activity logs:", error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const purchaseOrderId = searchParams.get("purchase_order_id")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = `
      SELECT 
        al.*,
        po.order_number,
        s.name as supplier_name,
        u.username as user_name
      FROM activity_logs al
      LEFT JOIN purchase_orders po ON al.purchase_order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (purchaseOrderId) {
      query += ` AND al.purchase_order_id = $${paramIndex}`
      params.push(Number.parseInt(purchaseOrderId))
      paramIndex++
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const logs = await sql.query(query, params)

    return NextResponse.json({
      success: true,
      data: logs.rows || [],
    })
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch activity logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const ipAddress = data.ip_address === "unknown" || !data.ip_address ? null : data.ip_address

    const customerId = data.customer_id
      ? typeof data.customer_id === "string" && !isNaN(Number(data.customer_id))
        ? Number(data.customer_id)
        : null
      : null

    const userId = data.user_id
      ? typeof data.user_id === "string" && !isNaN(Number(data.user_id))
        ? Number(data.user_id)
        : null
      : null

    await sql`
      INSERT INTO system_logs (
        level, source, category, message, ip_address, 
        user_id, customer_id, details, session_id, user_agent
      ) VALUES (
        ${data.level}, ${data.source}, ${data.category}, ${data.message}, ${ipAddress},
        ${userId}, ${customerId}, ${data.details ? JSON.stringify(data.details) : null}, 
        ${data.session_id}, ${data.user_agent}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to log activity:", error)
    return NextResponse.json({ success: false, error: "Failed to log activity" }, { status: 500 })
  }
}

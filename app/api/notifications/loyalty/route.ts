import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, type, title, message, data } = body

    const [notification] = await sql`
      INSERT INTO loyalty_notifications (
        customer_id,
        type,
        title,
        message,
        data,
        read,
        created_at
      ) VALUES (
        ${customer_id},
        ${type},
        ${title},
        ${message},
        ${JSON.stringify(data)},
        false,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    console.error("Failed to create loyalty notification:", error)
    return NextResponse.json({ success: false, error: "Failed to create notification" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer_id")
    const unreadOnly = searchParams.get("unread_only") === "true"

    let query = `
      SELECT * FROM loyalty_notifications
      WHERE customer_id = $1
    `
    const params = [customerId]

    if (unreadOnly) {
      query += ` AND read = false`
    }

    query += ` ORDER BY created_at DESC LIMIT 50`

    const notifications = await sql.query(query, params)

    return NextResponse.json({
      success: true,
      data: notifications,
    })
  } catch (error) {
    console.error("Failed to fetch loyalty notifications:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

// GET - List active RADIUS sessions
export async function GET(request: NextRequest) {
  try {
    const sql = getSql()
    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get("customer_id")
    const nas_id = searchParams.get("nas_id")

    let query = `
      SELECT 
        rsa.*,
        ru.username,
        c.full_name as customer_name,
        rn.name as nas_name,
        rn.ip_address as nas_ip,
        EXTRACT(EPOCH FROM (NOW() - rsa.start_time))::INTEGER as duration_seconds
      FROM radius_sessions_active rsa
      LEFT JOIN radius_users ru ON rsa.user_id = ru.id
      LEFT JOIN customers c ON ru.customer_id = c.id
      LEFT JOIN radius_nas rn ON rsa.nas_id = rn.id
    `

    const conditions = []
    if (customer_id) conditions.push(`ru.customer_id = ${customer_id}`)
    if (nas_id) conditions.push(`rsa.nas_id = ${nas_id}`)

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`
    }

    query += ` ORDER BY rsa.start_time DESC LIMIT 200`

    const sessions = await sql.unsafe(query)

    return NextResponse.json({ sessions }, { status: 200 })
  } catch (error: any) {
    console.error("[v0] Error fetching RADIUS sessions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Disconnect session (CoA)
export async function DELETE(request: NextRequest) {
  try {
    const sql = getSql()
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get("session_id")

    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 })
    }

    // Get session details
    const sessions = await sql`
      SELECT * FROM radius_sessions_active
      WHERE acct_session_id = ${session_id}
      LIMIT 1
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Archive session
    await sql`
      INSERT INTO radius_sessions_archive 
      SELECT *, NOW() as stop_time, 'Admin-Disconnect' as terminate_cause, NOW() as archived_at
      FROM radius_sessions_active
      WHERE acct_session_id = ${session_id}
    `

    // Remove from active
    await sql`
      DELETE FROM radius_sessions_active
      WHERE acct_session_id = ${session_id}
    `

    // Log action
    await sql`
      INSERT INTO system_logs (source, level, message, created_at)
      VALUES ('RADIUS', 'INFO', ${`Admin disconnected session: ${session_id}`}, NOW())
    `

    return NextResponse.json({ message: "Session disconnected" }, { status: 200 })
  } catch (error: any) {
    console.error("[v0] Error disconnecting session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

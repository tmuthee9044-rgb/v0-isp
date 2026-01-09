import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// PPP Secrets Management API
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const routerId = searchParams.get("router_id")
    const username = searchParams.get("username")

    let query = `
      SELECT 
        c.id as customer_id,
        c.portal_username as username,
        c.portal_password as password,
        cs.ip_address,
        cs.status as service_status,
        sp.download_speed,
        sp.upload_speed,
        nd.name as router_name,
        nd.ip_address as router_ip
      FROM customers c
      JOIN customer_services cs ON c.id = cs.customer_id
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      JOIN network_devices nd ON cs.router_id = nd.id
      WHERE cs.status = 'active' AND c.status = 'active'
    `

    const params: any[] = []
    let paramCount = 0

    if (routerId) {
      paramCount++
      query += ` AND nd.id = $${paramCount}`
      params.push(routerId)
    }

    if (username) {
      paramCount++
      query += ` AND c.portal_username = $${paramCount}`
      params.push(username)
    }

    query += ` ORDER BY c.portal_username`

    const result = await sql.query(query, params)

    const pppSecrets = result.rows.map((row) => ({
      name: row.username,
      password: row.password,
      service: "pppoe",
      "local-address": row.router_ip,
      "remote-address": row.ip_address,
      profile: `profile_${row.download_speed}M_${row.upload_speed}M`,
      comment: `Customer ID: ${row.customer_id}`,
      disabled: row.service_status !== "active",
    }))

    return NextResponse.json({
      success: true,
      secrets: pppSecrets,
      count: pppSecrets.length,
    })
  } catch (error) {
    console.error("PPP secrets fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch PPP secrets",
      },
      { status: 500 },
    )
  }
}

// Create or update PPP secret
export async function POST(request: Request) {
  try {
    const { customer_id, username, password, ip_address, profile } = await request.json()

    if (!customer_id || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    await sql`
      UPDATE customers 
      SET 
        portal_username = ${username},
        portal_password = ${password},
        updated_at = NOW()
      WHERE id = ${customer_id}
    `

    await sql`
      INSERT INTO system_logs (
        level, source, category, message, details, customer_id
      )
      VALUES (
        'INFO', 'PPP Management', 'authentication', 'PPP secret updated for customer',
        ${JSON.stringify({ username, ip_address, profile })}, ${customer_id}
      )
    `

    return NextResponse.json({
      success: true,
      message: "PPP secret updated successfully",
    })
  } catch (error) {
    console.error("PPP secret update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update PPP secret",
      },
      { status: 500 },
    )
  }
}

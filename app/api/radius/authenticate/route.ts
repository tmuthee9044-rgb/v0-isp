import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { username, password, nas_ip_address, service_type = "PPPoE", calling_station_id } = await request.json()

    console.log("[v0] RADIUS Auth request for:", username, "from NAS:", nas_ip_address)

    // Validate NAS
    const nas = await sql`
      SELECT id, name, secret, status 
      FROM radius_nas 
      WHERE ip_address = ${nas_ip_address} AND status = 'active'
      LIMIT 1
    `

    if (nas.length === 0) {
      console.log("[v0] NAS not found or inactive:", nas_ip_address)
      return NextResponse.json(
        {
          result: "Access-Reject",
          reason: "NAS not authorized",
        },
        { status: 200 },
      )
    }

    // Get user from radius_users
    const users = await sql`
      SELECT ru.*, c.full_name, sp.speed_download, sp.speed_upload, sp.name as plan_name
      FROM radius_users ru
      LEFT JOIN customers c ON ru.customer_id = c.id
      LEFT JOIN customer_services cs ON ru.service_id = cs.id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE ru.username = ${username}
      LIMIT 1
    `

    if (users.length === 0) {
      console.log("[v0] User not found:", username)
      return NextResponse.json(
        {
          result: "Access-Reject",
          reason: "User not found",
        },
        { status: 200 },
      )
    }

    const user = users[0]

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      console.log("[v0] Password mismatch for:", username)

      // Log failed auth attempt
      await sql`
        INSERT INTO system_logs (source, level, message, user_id, created_at)
        VALUES ('RADIUS', 'WARNING', ${`Failed authentication attempt for ${username} from ${nas_ip_address}`}, ${user.id}, NOW())
      `

      return NextResponse.json(
        {
          result: "Access-Reject",
          reason: "Invalid credentials",
        },
        { status: 200 },
      )
    }

    // Check user status
    if (user.status !== "active") {
      console.log("[v0] User not active:", username, "status:", user.status)
      return NextResponse.json(
        {
          result: "Access-Reject",
          reason: `User ${user.status}`,
        },
        { status: 200 },
      )
    }

    // Check expiry
    if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
      console.log("[v0] User expired:", username)

      await sql`
        UPDATE radius_users 
        SET status = 'expired' 
        WHERE id = ${user.id}
      `

      return NextResponse.json(
        {
          result: "Access-Reject",
          reason: "Service expired",
        },
        { status: 200 },
      )
    }

    // Check simultaneous use
    const activeSessions = await sql`
      SELECT COUNT(*) as count 
      FROM radius_sessions_active 
      WHERE user_id = ${user.id}
    `

    if (activeSessions[0].count >= user.simultaneous_use) {
      console.log("[v0] Simultaneous use limit exceeded:", username)
      return NextResponse.json(
        {
          result: "Access-Reject",
          reason: "Already logged in",
        },
        { status: 200 },
      )
    }

    // Build authorization attributes (MikroTik specific)
    const attributes: any = {
      result: "Access-Accept",
      attributes: {
        "User-Name": username,
        "Service-Type": service_type,
      },
    }

    // Rate limiting (bandwidth)
    if (user.download_limit && user.upload_limit) {
      attributes.attributes["Mikrotik-Rate-Limit"] = `${user.upload_limit}M/${user.download_limit}M`
    } else if (user.speed_upload && user.speed_download) {
      attributes.attributes["Mikrotik-Rate-Limit"] = `${user.speed_upload}M/${user.speed_download}M`
    }

    // Session timeout
    if (user.session_timeout) {
      attributes.attributes["Session-Timeout"] = user.session_timeout
    }

    // Idle timeout
    if (user.idle_timeout) {
      attributes.attributes["Idle-Timeout"] = user.idle_timeout
    }

    // IP address assignment
    if (user.ip_address) {
      attributes.attributes["Framed-IP-Address"] = user.ip_address
    } else if (user.ip_pool) {
      attributes.attributes["Framed-Pool"] = user.ip_pool
    }

    // Interim interval for accounting
    attributes.attributes["Acct-Interim-Interval"] = 300 // 5 minutes

    console.log("[v0] Access-Accept for:", username, "with attributes:", attributes.attributes)

    // Log successful auth
    await sql`
      INSERT INTO system_logs (source, level, message, user_id, created_at)
      VALUES ('RADIUS', 'INFO', ${`Successful authentication for ${username} from ${nas_ip_address}`}, ${user.id}, NOW())
    `

    return NextResponse.json(attributes, { status: 200 })
  } catch (error: any) {
    console.error("[v0] RADIUS auth error:", error)
    return NextResponse.json(
      {
        result: "Access-Reject",
        reason: "Internal server error",
      },
      { status: 200 },
    )
  }
}

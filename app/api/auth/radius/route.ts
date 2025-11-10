import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// RADIUS Authentication API for routers
export async function POST(request: Request) {
  try {
    const { username, password, nas_ip, nas_port, calling_station_id, service_type } = await request.json()

    if (!username || !password || !nas_ip) {
      await logRADIUSEvent("ERROR", "auth_reject", username, nas_ip, "Missing required authentication parameters")
      return NextResponse.json(
        {
          success: false,
          reply_code: "Access-Reject",
          reply_message: "Missing authentication parameters",
        },
        { status: 400 },
      )
    }

    const customerAuth = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.status as customer_status,
        cs.id as service_id,
        cs.status as service_status,
        cs.ip_address,
        cs.monthly_fee,
        cs.start_date,
        cs.end_date,
        sp.name as plan_name,
        sp.download_speed,
        sp.upload_speed,
        ab.balance,
        ab.status as billing_status,
        nd.id as router_id,
        nd.name as router_name,
        nd.ip_address as router_ip
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN account_balances ab ON c.id = ab.customer_id
      LEFT JOIN network_devices nd ON cs.router_id = nd.id
      WHERE (c.portal_username = ${username} OR c.email = ${username})
      AND c.portal_password = ${password}
      LIMIT 1
    `

    if (customerAuth.length === 0) {
      await logRADIUSEvent("WARNING", "auth_reject", username, nas_ip, "Invalid credentials")
      return NextResponse.json({
        success: false,
        reply_code: "Access-Reject",
        reply_message: "Invalid username or password",
      })
    }

    const customer = customerAuth[0]

    const validationErrors = []

    // Check customer status
    if (customer.customer_status !== "active") {
      validationErrors.push(`Customer account is ${customer.customer_status}`)
    }

    // Check service status
    if (!customer.service_id || customer.service_status !== "active") {
      validationErrors.push("No active service found")
    }

    // Check billing status
    if (customer.billing_status === "suspended" || customer.balance < -1000) {
      validationErrors.push("Account suspended due to outstanding balance")
    }

    // Check service dates
    if (customer.end_date && new Date(customer.end_date) < new Date()) {
      validationErrors.push("Service has expired")
    }

    if (validationErrors.length > 0) {
      await logRADIUSEvent("WARNING", "auth_reject", username, nas_ip, validationErrors.join(", "))
      return NextResponse.json({
        success: false,
        reply_code: "Access-Reject",
        reply_message: validationErrors.join(", "),
      })
    }

    const sessionId = `radius_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await sql`
      INSERT INTO radius_logs (
        level, event_type, username, client_ip, nas_ip, nas_port, 
        service_type, framed_ip, session_id, reply_message, details
      )
      VALUES (
        'INFO', 'auth_accept', ${username}, ${calling_station_id}, ${nas_ip}, ${nas_port},
        ${service_type}, ${customer.ip_address}, ${sessionId}, 'Authentication successful',
        ${JSON.stringify({
          customer_id: customer.customer_id,
          service_id: customer.service_id,
          plan_name: customer.plan_name,
          router_id: customer.router_id,
          download_speed: customer.download_speed,
          upload_speed: customer.upload_speed,
        })}
      )
    `

    return NextResponse.json({
      success: true,
      reply_code: "Access-Accept",
      reply_message: "Authentication successful",
      attributes: {
        "Framed-IP-Address": customer.ip_address,
        "Framed-Route": `${customer.ip_address}/32`,
        "Mikrotik-Rate-Limit": `${customer.download_speed}M/${customer.upload_speed}M`,
        "Session-Timeout": 86400, // 24 hours
        "Acct-Interim-Interval": 300, // 5 minutes
        Class: `customer_${customer.customer_id}_service_${customer.service_id}`,
      },
      session_id: sessionId,
      customer_info: {
        id: customer.customer_id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        plan: customer.plan_name,
        ip_address: customer.ip_address,
      },
    })
  } catch (error) {
    console.error("RADIUS authentication error:", error)
    const username = "unknown"
    const nas_ip = "unknown"
    await logRADIUSEvent("ERROR", "auth_error", username, nas_ip, error.message)

    return NextResponse.json(
      {
        success: false,
        reply_code: "Access-Reject",
        reply_message: "Internal authentication error",
      },
      { status: 500 },
    )
  }
}

// RADIUS Accounting API
export async function PUT(request: Request) {
  try {
    const {
      username,
      session_id,
      acct_status_type,
      nas_ip,
      nas_port,
      acct_session_time,
      acct_input_octets,
      acct_output_octets,
      acct_terminate_cause,
      calling_station_id,
    } = await request.json()

    await sql`
      INSERT INTO radius_logs (
        level, event_type, username, client_ip, nas_ip, nas_port,
        session_id, session_time, input_octets, output_octets,
        terminate_cause, details
      )
      VALUES (
        'INFO', ${`acct_${acct_status_type.toLowerCase()}`}, ${username}, ${calling_station_id},
        ${nas_ip}, ${nas_port}, ${session_id}, ${acct_session_time || 0},
        ${acct_input_octets || 0}, ${acct_output_octets || 0}, ${acct_terminate_cause},
        ${JSON.stringify({ acct_status_type, timestamp: new Date().toISOString() })}
      )
    `

    if (acct_status_type === "Stop" && acct_input_octets && acct_output_octets) {
      const totalBytes = (acct_input_octets || 0) + (acct_output_octets || 0)

      await sql`
        UPDATE customer_services 
        SET 
          total_data_used = COALESCE(total_data_used, 0) + ${totalBytes},
          last_session_end = NOW()
        WHERE customer_id = (
          SELECT id FROM customers WHERE portal_username = ${username} OR email = ${username}
        )
      `
    }

    return NextResponse.json({
      success: true,
      reply_code: "Accounting-Response",
      reply_message: "Accounting recorded successfully",
    })
  } catch (error) {
    console.error("RADIUS accounting error:", error)
    return NextResponse.json(
      {
        success: false,
        reply_code: "Accounting-Response",
        reply_message: "Accounting error",
      },
      { status: 500 },
    )
  }
}

async function logRADIUSEvent(level: string, eventType: string, username: string, nasIp: string, message: string) {
  try {
    await sql`
      INSERT INTO radius_logs (level, event_type, username, nas_ip, reply_message, details)
      VALUES (${level}, ${eventType}, ${username}, ${nasIp}, ${message}, ${JSON.stringify({ timestamp: new Date().toISOString() })})
    `
  } catch (error) {
    console.error("Failed to log RADIUS event:", error)
  }
}

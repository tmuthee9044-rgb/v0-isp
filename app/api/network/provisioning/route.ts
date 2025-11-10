import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const requests = await sql`
      SELECT 
        cs.id,
        cs.customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        cs.service_plan_id,
        sp.name as service_plan_name,
        cs.router_id,
        nd.name as router_name,
        cs.ip_address,
        cs.status,
        cs.created_at,
        cs.updated_at
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN network_devices nd ON cs.router_id = nd.id AND nd.type = 'router'
      WHERE cs.router_id IS NOT NULL
      ORDER BY cs.created_at DESC
    `

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error fetching provisioning requests:", error)
    return NextResponse.json({ message: "Failed to fetch provisioning requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, service_plan_id, router_id, allocation_mode } = body

    // Validate required fields
    if (!customer_id || !service_plan_id || !router_id) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Check if customer already has an active service
    const existingService = await sql`
      SELECT id FROM customer_services 
      WHERE customer_id = ${customer_id} AND status IN ('active', 'pending')
    `

    if (existingService.length > 0) {
      return NextResponse.json({ message: "Customer already has an active or pending service" }, { status: 400 })
    }

    // Get service plan details
    const servicePlan = await sql`
      SELECT * FROM service_plans WHERE id = ${service_plan_id}
    `

    if (servicePlan.length === 0) {
      return NextResponse.json({ message: "Service plan not found" }, { status: 404 })
    }

    // Get router details
    const router = await sql`
      SELECT * FROM network_devices 
      WHERE id = ${router_id} AND type = 'router' AND status = 'online'
    `

    if (router.length === 0) {
      return NextResponse.json({ message: "Router not found or not connected" }, { status: 404 })
    }

    let assignedIP = null

    if (allocation_mode === "dynamic") {
      // Find available IP from router's subnets
      const availableIP = await sql`
        SELECT ip.id, ip.ip_address, ip.subnet_id
        FROM ip_addresses ip
        JOIN subnets s ON ip.subnet_id = s.id
        WHERE s.router_id = ${router_id} 
        AND ip.status = 'available' 
        AND ip.assigned_to_customer IS NULL
        ORDER BY ip.id
        LIMIT 1
      `

      if (availableIP.length === 0) {
        return NextResponse.json({ message: "No available IP addresses in router subnets" }, { status: 400 })
      }

      assignedIP = availableIP[0].ip_address

      // Mark IP as assigned
      await sql`
        UPDATE ip_addresses 
        SET status = 'assigned', 
            assigned_to_customer = ${customer_id},
            assigned_at = NOW()
        WHERE id = ${availableIP[0].id}
      `
    }

    // Create customer service record
    const result = await sql`
      INSERT INTO customer_services (
        customer_id, service_plan_id, router_id, ip_address, 
        monthly_fee, status, start_date, created_at
      ) VALUES (
        ${customer_id}, ${service_plan_id}, ${router_id}, ${assignedIP},
        ${servicePlan[0].price}, 'pending', CURRENT_DATE, NOW()
      )
      RETURNING *
    `

    // Create sync status record
    await sql`
      INSERT INTO router_sync_status (
        router_id, customer_service_id, sync_status, retry_count
      ) VALUES (
        ${router_id}, ${result[0].id}, 'pending', 0
      )
    `

    // Log the provisioning request
    await sql`
      INSERT INTO router_logs (router_id, action, status, message)
      VALUES (
        ${router_id}, 
        'provisioning_requested', 
        'success', 
        'Service provisioning requested for customer ${customer_id}'
      )
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating provisioning request:", error)
    return NextResponse.json({ message: "Failed to create provisioning request" }, { status: 500 })
  }
}

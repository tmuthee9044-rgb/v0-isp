import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Connection Methods Management API (Public IP / OpenVPN)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer_id")
    const method = searchParams.get("method") // "public_ip" or "openvpn"

    const result = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        cs.connection_type,
        cs.ip_address,
        nd.ip_address as router_ip,
        nd.name as router_name,
        sp.name as plan_name,
        CASE 
          WHEN cs.connection_type = 'openvpn' THEN 'OpenVPN Tunnel'
          ELSE 'Public IP Direct'
        END as connection_method
      FROM customers c
      JOIN customer_services cs ON c.id = cs.customer_id
      JOIN network_devices nd ON cs.router_id = nd.id
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE c.id = ${customerId} AND cs.status = 'active'
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer or active service not found",
        },
        { status: 404 },
      )
    }

    const customer = result[0]

    let connectionConfig = {}

    if (customer.connection_type === "openvpn" || method === "openvpn") {
      // OpenVPN tunnel configuration
      connectionConfig = {
        method: "openvpn",
        server_ip: customer.router_ip,
        server_port: 1194,
        protocol: "udp",
        client_ip: customer.ip_address,
        ca_cert: "/etc/openvpn/ca.crt",
        client_cert: `/etc/openvpn/clients/${customer.customer_id}.crt`,
        client_key: `/etc/openvpn/clients/${customer.customer_id}.key`,
        config_template: generateOpenVPNConfig(customer),
      }
    } else {
      // Public IP direct connection
      connectionConfig = {
        method: "public_ip",
        router_ip: customer.router_ip,
        client_ip: customer.ip_address,
        gateway: customer.router_ip,
        dns_servers: ["8.8.8.8", "8.8.4.4"],
        authentication: "radius_or_ppp",
      }
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.customer_id,
        name: `${customer.first_name} ${customer.last_name}`,
        plan: customer.plan_name,
      },
      connection: connectionConfig,
    })
  } catch (error) {
    console.error("Connection method fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch connection configuration",
      },
      { status: 500 },
    )
  }
}

// Update connection method
export async function POST(request: Request) {
  try {
    const { customer_id, connection_type, router_id } = await request.json()

    if (!customer_id || !connection_type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    await sql`
      UPDATE customer_services 
      SET 
        connection_type = ${connection_type},
        router_id = COALESCE(${router_id}, router_id),
        updated_at = NOW()
      WHERE customer_id = ${customer_id} AND status = 'active'
    `

    await sql`
      INSERT INTO system_logs (
        level, source, category, message, details, customer_id
      )
      VALUES (
        'INFO', 'Connection Management', 'network', 'Connection method updated',
        ${JSON.stringify({ connection_type, router_id })}, ${customer_id}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Connection method updated successfully",
    })
  } catch (error) {
    console.error("Connection method update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update connection method",
      },
      { status: 500 },
    )
  }
}

function generateOpenVPNConfig(customer: any): string {
  return `
# OpenVPN Client Configuration for ${customer.first_name} ${customer.last_name}
client
dev tun
proto udp
remote ${customer.router_ip} 1194
resolv-retry infinite
nobind
persist-key
persist-tun
ca ca.crt
cert ${customer.customer_id}.crt
key ${customer.customer_id}.key
cipher AES-256-GCM
auth SHA256
comp-lzo
verb 3
# Customer ID: ${customer.customer_id}
# Plan: ${customer.plan_name}
# Assigned IP: ${customer.ip_address}
`.trim()
}

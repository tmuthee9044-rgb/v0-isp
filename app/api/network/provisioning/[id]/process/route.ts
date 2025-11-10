import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const serviceId = Number.parseInt(params.id)

    // Get service details
    const service = await sql`
      SELECT 
        cs.*,
        r.type as router_type,
        r.hostname,
        r.username,
        r.password,
        r.api_port,
        sp.download_speed,
        sp.upload_speed,
        c.first_name,
        c.last_name
      FROM customer_services cs
      JOIN routers r ON cs.router_id = r.id
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.id = ${serviceId}
    `

    if (service.length === 0) {
      return NextResponse.json({ message: "Service not found" }, { status: 404 })
    }

    const serviceData = service[0]

    // Update service status to in_progress
    await sql`
      UPDATE customer_services 
      SET status = 'in_progress', updated_at = NOW()
      WHERE id = ${serviceId}
    `

    // Update sync status
    await sql`
      UPDATE router_sync_status 
      SET sync_status = 'pending', last_checked = NOW()
      WHERE customer_service_id = ${serviceId}
    `

    try {
      // Simulate router configuration based on router type
      const configResult = await configureRouterService(serviceData)

      if (configResult.success) {
        // Mark service as active
        await sql`
          UPDATE customer_services 
          SET status = 'active', updated_at = NOW()
          WHERE id = ${serviceId}
        `

        // Update sync status to in_sync
        await sql`
          UPDATE router_sync_status 
          SET sync_status = 'in_sync', 
              last_synced = NOW(),
              sync_message = 'Service configured successfully'
          WHERE customer_service_id = ${serviceId}
        `

        // Log successful provisioning
        await sql`
          INSERT INTO router_logs (router_id, action, status, message)
          VALUES (
            ${serviceData.router_id}, 
            'service_provisioned', 
            'success', 
            'Service activated for customer ${serviceData.customer_id} with IP ${serviceData.ip_address}'
          )
        `

        return NextResponse.json({
          success: true,
          message: "Service provisioned successfully",
          ip_address: serviceData.ip_address,
        })
      } else {
        throw new Error(configResult.message)
      }
    } catch (configError) {
      // Mark service as failed
      await sql`
        UPDATE customer_services 
        SET status = 'failed', updated_at = NOW()
        WHERE id = ${serviceId}
      `

      // Update sync status with error
      await sql`
        UPDATE router_sync_status 
        SET sync_status = 'out_of_sync',
            retry_count = retry_count + 1,
            sync_message = ${String(configError)}
        WHERE customer_service_id = ${serviceId}
      `

      // Log failed provisioning
      await sql`
        INSERT INTO router_logs (router_id, action, status, message)
        VALUES (
          ${serviceData.router_id}, 
          'service_provisioning_failed', 
          'failed', 
          'Failed to provision service: ${String(configError)}'
        )
      `

      return NextResponse.json(
        {
          success: false,
          message: "Failed to configure router: " + String(configError),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error processing provisioning request:", error)
    return NextResponse.json({ message: "Failed to process provisioning request" }, { status: 500 })
  }
}

// Mock router configuration functions
// In a real implementation, these would use actual router APIs
async function configureRouterService(serviceData: any) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const username = `${serviceData.first_name.toLowerCase()}.${serviceData.last_name.toLowerCase()}`
  const password = Math.random().toString(36).substring(2, 12)

  switch (serviceData.router_type) {
    case "mikrotik":
      return configureMikroTikService(serviceData, username, password)
    case "ubiquiti":
      return configureUbiquitiService(serviceData, username, password)
    case "juniper":
      return configureJuniperService(serviceData, username, password)
    default:
      return configureGenericService(serviceData, username, password)
  }
}

async function configureMikroTikService(serviceData: any, username: string, password: string) {
  // Mock MikroTik RouterOS configuration
  // In real implementation, use RouterOS API

  const isReachable = !serviceData.hostname.includes("unreachable")

  if (!isReachable) {
    throw new Error("Router unreachable")
  }

  // Simulate configuration steps
  const steps = ["Creating PPP secret", "Setting bandwidth limits", "Configuring IP pool", "Applying firewall rules"]

  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    // In real implementation, execute actual RouterOS commands
  }

  return {
    success: true,
    message: "MikroTik service configured successfully",
    config: {
      username,
      password,
      ip_address: serviceData.ip_address,
      download_speed: serviceData.download_speed,
      upload_speed: serviceData.upload_speed,
    },
  }
}

async function configureUbiquitiService(serviceData: any, username: string, password: string) {
  // Mock Ubiquiti configuration
  const isReachable = !serviceData.hostname.includes("unreachable")

  if (!isReachable) {
    throw new Error("Router unreachable")
  }

  return {
    success: true,
    message: "Ubiquiti service configured successfully",
    config: {
      username,
      password,
      ip_address: serviceData.ip_address,
    },
  }
}

async function configureJuniperService(serviceData: any, username: string, password: string) {
  // Mock Juniper configuration
  const isReachable = !serviceData.hostname.includes("unreachable")

  if (!isReachable) {
    throw new Error("Router unreachable")
  }

  return {
    success: true,
    message: "Juniper service configured successfully",
    config: {
      username,
      password,
      ip_address: serviceData.ip_address,
    },
  }
}

async function configureGenericService(serviceData: any, username: string, password: string) {
  // Mock generic configuration
  const isReachable = !serviceData.hostname.includes("unreachable")

  if (!isReachable) {
    throw new Error("Router unreachable")
  }

  return {
    success: true,
    message: "Generic service configured successfully",
    config: {
      username,
      password,
      ip_address: serviceData.ip_address,
    },
  }
}

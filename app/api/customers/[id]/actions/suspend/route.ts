import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"
import { RouterService } from "@/lib/router-service"
import { releaseIPAddress } from "@/lib/ip-management"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { reason, suspensionType = "manual", releaseIPs = false } = await request.json()

    console.log(`[v0] Suspending customer ${customerId}, releaseIPs: ${releaseIPs}`)

    // Get customer details
    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    if (customer.status === "suspended") {
      return NextResponse.json({ error: "Customer is already suspended" }, { status: 400 })
    }

    // Get all active services for this customer
    const services = await sql`
      SELECT cs.*, sp.name as service_name
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId} AND cs.status = 'active'
    `

    // Update customer status
    await sql`
      UPDATE customers 
      SET status = 'suspended'
      WHERE id = ${customerId}
    `

    await sql`
      UPDATE customer_services 
      SET 
        status = 'suspended'
      WHERE customer_id = ${customerId} AND status = 'active'
    `

    const ipReleaseResults = []
    if (releaseIPs) {
      console.log(`[v0] Releasing IPs for suspended customer ${customerId}`)
      for (const service of services) {
        if (service.ip_address) {
          const releaseResult = await releaseIPAddress(service.id, `Customer suspended: ${reason}`)
          ipReleaseResults.push({
            serviceId: service.id,
            ipAddress: service.ip_address,
            released: releaseResult.success,
            message: releaseResult.message,
          })
        }
      }
    }

    const routerResults = []
    for (const service of services) {
      try {
        // Get router info from device_id if available
        let routerId = null
        if (service.device_id) {
          const [device] = await sql`
            SELECT id FROM network_devices WHERE id = ${service.device_id}
          `
          routerId = device?.id
        }

        if (routerId) {
          const routerResult = await RouterService.suspendService({
            customerId,
            serviceId: service.id,
            serviceType: "pppoe",
            ipAddress: service.ip_address,
            routerId: routerId,
            reason: reason || "Manual suspension",
          })

          routerResults.push({
            serviceId: service.id,
            success: routerResult.success,
            message: routerResult.message,
          })
        } else {
          routerResults.push({
            serviceId: service.id,
            success: false,
            message: "No router assigned to this service",
          })
        }
      } catch (routerError) {
        console.error(`Router suspension failed for service ${service.id}:`, routerError)
        routerResults.push({
          serviceId: service.id,
          success: false,
          message: routerError.message || "Router communication failed",
        })
      }
    }

    await ActivityLogger.logAdminActivity(
      `Customer suspended: ${customer.first_name} ${customer.last_name} - Reason: ${reason || "Manual suspension"}`,
      "admin",
      {
        customer_id: customerId,
        previous_status: customer.status,
        new_status: "suspended",
        action: "suspend_customer",
        suspension_type: suspensionType,
        services_affected: services.length,
        router_results: routerResults,
        ip_release_results: ipReleaseResults,
      },
    )

    return NextResponse.json({
      success: true,
      message: "Customer suspended successfully",
      servicesAffected: services.length,
      routerResults,
      ipReleaseResults,
    })
  } catch (error) {
    console.error("[v0] Suspend customer error:", error)
    return NextResponse.json({ error: "Failed to suspend customer" }, { status: 500 })
  }
}

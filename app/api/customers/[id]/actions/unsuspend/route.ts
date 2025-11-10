import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"
import { RouterService } from "@/lib/router-service"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { reactivationReason = "Manual reactivation" } = await request.json()

    // Get customer details
    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    if (customer.status === "active") {
      return NextResponse.json({ error: "Customer is already active" }, { status: 400 })
    }

    // Get all suspended services for this customer
    const services = await sql`
      SELECT cs.*, sp.service_type, sp.name as service_name
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId} AND cs.status = 'suspended'::service_status_enum
    `

    // Update customer status
    await sql`
      UPDATE customers 
      SET status = 'active', updated_at = NOW()
      WHERE id = ${customerId}
    `

    // Reactivate suspended services with detailed tracking
    await sql`
      UPDATE customer_services 
      SET 
        status = 'active'::service_status_enum,
        reactivated_at = NOW(),
        reactivated_by = 'admin',
        router_sync_status = 'pending',
        updated_at = NOW()
      WHERE customer_id = ${customerId} AND status = 'suspended'::service_status_enum
    `

    // Process router reactivation for each service
    const routerResults = []
    for (const service of services) {
      try {
        const routerResult = await RouterService.reactivateService({
          customerId,
          serviceId: service.id,
          serviceType: service.service_type || "pppoe",
          ipAddress: service.ip_address,
          routerId: service.router_id,
          reason: reactivationReason,
        })

        routerResults.push({
          serviceId: service.id,
          success: routerResult.success,
          message: routerResult.message,
        })

        // Log router action
        await sql`
          INSERT INTO router_logs (
            customer_id, service_id, router_id, action, service_type,
            command_sent, response_received, status, executed_by, metadata
          ) VALUES (
            ${customerId}, ${service.id}, ${service.router_id || "unknown"},
            'reactivate', ${service.service_type || "pppoe"},
            ${routerResult.command}, ${routerResult.response},
            ${routerResult.success ? "success" : "failed"}, 'admin',
            ${JSON.stringify({ reason: reactivationReason, ipAddress: service.ip_address })}
          )
        `

        // Update service router sync status
        await sql`
          UPDATE customer_services 
          SET 
            router_sync_status = ${routerResult.success ? "synced" : "failed"},
            last_router_sync = NOW()
          WHERE id = ${service.id}
        `
      } catch (routerError) {
        console.error(`Router reactivation failed for service ${service.id}:`, routerError)
        routerResults.push({
          serviceId: service.id,
          success: false,
          message: routerError.message || "Router communication failed",
        })

        // Log failed router action
        await sql`
          INSERT INTO router_logs (
            customer_id, service_id, router_id, action, service_type,
            status, error_message, executed_by, metadata
          ) VALUES (
            ${customerId}, ${service.id}, ${service.router_id || "unknown"},
            'reactivate', ${service.service_type || "pppoe"},
            'failed', ${routerError.message}, 'admin',
            ${JSON.stringify({ reason: reactivationReason })}
          )
        `
      }
    }

    await ActivityLogger.logAdminActivity(
      `Customer service restored: ${customer.first_name} ${customer.last_name} - Reason: ${reactivationReason}`,
      "admin",
      {
        customer_id: customerId,
        previous_status: customer.status,
        new_status: "active",
        action: "unsuspend_customer",
        services_affected: services.length,
        router_results: routerResults,
      },
    )

    return NextResponse.json({
      success: true,
      message: "Customer service restored successfully",
      servicesAffected: services.length,
      routerResults,
    })
  } catch (error) {
    console.error("Unsuspend customer error:", error)
    return NextResponse.json({ error: "Failed to restore customer service" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { authorization } = Object.fromEntries(request.headers.entries())

    // Simple API key authentication for cron jobs
    if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const servicesToSuspend = await sql`
      SELECT 
        cs.*,
        sp.name as service_name,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        i.id as invoice_id,
        i.status as invoice_status
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN invoices i ON i.customer_id = cs.customer_id 
        AND i.description LIKE '%Service activation%'
        AND i.created_at::date = cs.created_at::date
      WHERE cs.admin_override = true
      AND cs.status = 'active'
      AND cs.activated_by = 'admin_override'
      AND cs.created_at::date < CURRENT_DATE
      AND (i.status IS NULL OR i.status IN ('pending', 'overdue'))
    `

    const results = {
      processed: 0,
      suspended: 0,
      errors: 0,
      details: [] as any[],
    }

    for (const service of servicesToSuspend) {
      try {
        results.processed++

        // Check if there are any payments for this customer today
        const recentPayments = await sql`
          SELECT COUNT(*) as payment_count
          FROM payments p
          WHERE p.customer_id = ${service.customer_id}
          AND p.status = 'completed'
          AND p.created_at >= CURRENT_DATE
        `

        if (recentPayments[0].payment_count > 0) {
          // Customer has made payment, skip suspension
          results.details.push({
            customer_id: service.customer_id,
            service_id: service.id,
            customer_name: service.customer_name,
            service_name: service.service_name,
            status: "skipped",
            reason: "Payment received",
          })
          continue
        }

        // Suspend the service
        await sql`
          UPDATE customer_services 
          SET 
            status = 'suspended',
            suspension_reason = 'no_payment_after_admin_override',
            suspended_at = NOW(),
            suspended_by = 'system_midnight_check'
          WHERE id = ${service.id}
        `

        // Call router API to actually suspend the service
        try {
          const suspendResponse = await fetch(`${getBaseUrl()}/api/customers/${service.customer_id}/actions/suspend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceId: service.id,
              reason: "no_payment_after_admin_override",
              automated: true,
            }),
          })

          if (!suspendResponse.ok) {
            console.error(`Failed to suspend service ${service.id} for customer ${service.customer_id}`)
          }
        } catch (error) {
          console.error(`Error calling suspend API for service ${service.id}:`, error)
        }

        // Log the suspension
        await sql`
          INSERT INTO system_logs (category, message, metadata, created_at)
          VALUES (
            'midnight_suspension',
            'Service ' || ${service.service_name} || ' suspended at midnight for customer ' || ${service.customer_name} || ' - no payment received after admin override',
            '{"customer_id": ' || ${service.customer_id} || ', "service_id": ' || ${service.id} || ', "invoice_id": ' || ${service.invoice_id} || ', "reason": "no_payment_after_admin_override"}',
            NOW()
          )
        `

        results.suspended++
        results.details.push({
          customer_id: service.customer_id,
          service_id: service.id,
          customer_name: service.customer_name,
          service_name: service.service_name,
          status: "suspended",
          reason: "No payment received after admin override",
        })
      } catch (error) {
        results.errors++
        results.details.push({
          customer_id: service.customer_id,
          service_id: service.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Log the midnight suspension run
    await sql`
      INSERT INTO system_logs (
        level,
        category,
        message,
        details,
        created_at
      ) VALUES (
        'info',
        'midnight_suspension',
        'Midnight suspension check completed',
        ${JSON.stringify(results)},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} services, suspended ${results.suspended}, ${results.errors} errors`,
    })
  } catch (error) {
    console.error("Error in midnight suspension check:", error)
    return NextResponse.json({ error: "Midnight suspension check failed" }, { status: 500 })
  }
}

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return "http://localhost:3000"
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === "generate_monthly_invoices") {
      // Get all active customer services that need billing
      const services = await sql`
        SELECT 
          cs.*,
          CONCAT(c.first_name, ' ', c.last_name) as customer_name,
          c.email,
          c.phone,
          sp.name as service_name,
          sp.price,
          sp.billing_cycle
        FROM customer_services cs
        JOIN customers c ON cs.customer_id = c.id
        JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.status = 'active'
        AND cs.start_date IS NOT NULL
      `

      const results = []

      for (const service of services) {
        const shouldBill = await sql`
          SELECT 
            CASE 
              WHEN ${service.billing_cycle} = 'monthly' THEN 
                DATE_TRUNC('month', CURRENT_DATE::timestamptz) > DATE_TRUNC('month', ${service.start_date}::timestamptz)
              WHEN ${service.billing_cycle} = 'quarterly' THEN 
                CURRENT_DATE >= ${service.start_date}::date + INTERVAL '3 months'
              WHEN ${service.billing_cycle} = 'annual' THEN 
                CURRENT_DATE >= ${service.start_date}::date + INTERVAL '1 year'
              ELSE 
                DATE_TRUNC('month', CURRENT_DATE::timestamptz) > DATE_TRUNC('month', ${service.start_date}::timestamptz)
            END as should_bill
        `

        if (!shouldBill[0]?.should_bill) continue

        // Check if invoice already exists for this period
        const existingInvoice = await sql`
          SELECT id FROM invoices 
          WHERE customer_id = ${service.customer_id}
          AND service_period_start = DATE_TRUNC('month', CURRENT_DATE::timestamptz)
          AND service_period_end = DATE_TRUNC('month', CURRENT_DATE::timestamptz) + INTERVAL '1 month' - INTERVAL '1 day'
        `

        if (existingInvoice.length === 0) {
          // Generate invoice
          const [invoice] = await sql`
            INSERT INTO invoices (
              customer_id,
              amount,
              subtotal,
              tax_amount,
              due_date,
              status,
              description,
              service_period_start,
              service_period_end,
              invoice_number,
              created_at
            ) VALUES (
              ${service.customer_id},
              ${service.price},
              ${service.price},
              0,
              CURRENT_DATE + INTERVAL '30 days',
              'pending',
              'Monthly service charges - ' || ${service.service_name},
              DATE_TRUNC('month', CURRENT_DATE::timestamptz),
              DATE_TRUNC('month', CURRENT_DATE::timestamptz) + INTERVAL '1 month' - INTERVAL '1 day',
              'INV-' || ${service.customer_id} || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER,
              NOW()
            ) RETURNING *
          `

          // Create invoice item
          await sql`
            INSERT INTO invoice_items (
              invoice_id,
              description,
              quantity,
              unit_price,
              total_amount
            ) VALUES (
              ${invoice.id},
              ${service.service_name},
              1,
              ${service.price},
              ${service.price}
            )
          `

          results.push({
            customer_id: service.customer_id,
            customer_name: service.customer_name,
            invoice_id: invoice.id,
            amount: service.price,
          })
        }
      }

      return NextResponse.json({
        success: true,
        generated_invoices: results.length,
        invoices: results,
      })
    }

    if (action === "process_overdue_accounts") {
      // Find overdue invoices and update customer status
      const overdueInvoices = await sql`
        SELECT 
          i.*,
          CONCAT(c.first_name, ' ', c.last_name) as customer_name,
          COALESCE(cbc.payment_terms, 30) as payment_due_days,
          COALESCE(cbc.grace_period_days, 7) as grace_period_days,
          COALESCE(cbc.auto_suspend_on_overdue, true) as auto_suspend_enabled,
          COALESCE(cbc.overdue_threshold_days, 30) as overdue_threshold_days
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        LEFT JOIN customer_billing_configurations cbc ON c.id = cbc.customer_id
        WHERE i.status = 'pending' 
        AND i.due_date < CURRENT_DATE
      `

      for (const invoice of overdueInvoices) {
        // Update invoice status to overdue
        await sql`
          UPDATE invoices 
          SET status = 'overdue' 
          WHERE id = ${invoice.id}
        `

        // Update customer account balance status
        await sql`
          UPDATE account_balances 
          SET status = 'overdue'
          WHERE customer_id = ${invoice.customer_id}
        `

        if (!invoice.auto_suspend_enabled) {
          console.log("[v0] Auto-suspend disabled for customer", invoice.customer_id)
          continue
        }

        // Calculate suspension date based on due date + grace period
        const gracePeriodDays = invoice.grace_period_days || 7
        const suspensionDate = new Date()
        suspensionDate.setDate(suspensionDate.getDate() - gracePeriodDays)

        const daysPastDue = Math.floor(
          (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24),
        )

        if (daysPastDue >= gracePeriodDays) {
          console.log(
            "[v0] Invoice",
            invoice.id,
            "is",
            daysPastDue,
            "days overdue, suspending services for customer",
            invoice.customer_id,
          )

          // Get customer services to suspend
          const customerServices = await sql`
            SELECT cs.*, sp.name as service_name
            FROM customer_services cs
            JOIN service_plans sp ON cs.service_plan_id = sp.id
            WHERE cs.customer_id = ${invoice.customer_id}
            AND cs.status = 'active'
          `

          for (const service of customerServices) {
            // Suspend the service
            await sql`
              UPDATE customer_services 
              SET 
                status = 'suspended',
                suspension_reason = 'overdue_payment',
                suspended_at = NOW(),
                suspended_by = 'system'
              WHERE id = ${service.id}
            `

            // Call router API to actually suspend the service
            try {
              const suspendResponse = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/customers/${invoice.customer_id}/actions/suspend`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    serviceId: service.id,
                    reason: "overdue_payment",
                    automated: true,
                    invoice_id: invoice.id,
                    days_overdue: daysPastDue,
                  }),
                },
              )

              if (!suspendResponse.ok) {
                console.error(`Failed to suspend service ${service.id} for customer ${invoice.customer_id}`)
              } else {
                console.log("[v0] Successfully suspended service", service.id, "for customer", invoice.customer_id)
              }
            } catch (error) {
              console.error(`Error suspending service ${service.id}:`, error)
            }

            // Log the suspension
            await sql`
              INSERT INTO system_logs (category, message, metadata, created_at)
              VALUES (
                'suspension',
                'Service ' || ${service.service_name} || ' automatically suspended for customer ' || ${invoice.customer_name} || ' due to overdue payment (' || ${daysPastDue} || ' days)',
                '{"customer_id": ' || ${invoice.customer_id} || ', "service_id": ' || ${service.id} || ', "invoice_id": ' || ${invoice.id} || ', "reason": "overdue_payment", "days_overdue": ' || ${daysPastDue} || '}',
                NOW()
              )
            `
          }
        } else {
          console.log(
            "[v0] Invoice",
            invoice.id,
            "is only",
            daysPastDue,
            "days overdue, within grace period of",
            gracePeriodDays,
            "days",
          )
        }

        // Log the overdue status
        await sql`
          INSERT INTO system_logs (category, message, metadata, created_at)
          VALUES (
            'billing',
            'Invoice ' || ${invoice.invoice_number} || ' marked as overdue for customer ' || ${invoice.customer_name} || ' (' || ${daysPastDue} || ' days past due)',
            '{"customer_id": ' || ${invoice.customer_id} || ', "invoice_id": ' || ${invoice.id} || ', "amount": ' || ${invoice.amount} || ', "days_overdue": ' || ${daysPastDue} || '}',
            NOW()
          )
        `
      }

      return NextResponse.json({
        success: true,
        overdue_invoices: overdueInvoices.length,
      })
    }

    if (action === "process_monthly_suspensions") {
      // Find services that have completed their monthly cycle without payment
      const servicesToSuspend = await sql`
        SELECT 
          cs.*,
          c.first_name,
          c.last_name,
          sp.name as service_name,
          sp.price,
          sp.billing_cycle,
          CASE 
            WHEN sp.billing_cycle = 'monthly' THEN 
              DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '1 month'
            WHEN sp.billing_cycle = 'quarterly' THEN 
              DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '3 months'
            WHEN sp.billing_cycle = 'annual' THEN 
              DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '1 year'
            ELSE 
              DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '1 month'
          END as next_billing_date,
          COALESCE(ab.balance, 0) as account_balance
        FROM customer_services cs
        JOIN customers c ON cs.customer_id = c.id
        JOIN service_plans sp ON cs.service_plan_id = sp.id
        LEFT JOIN account_balances ab ON c.id = ab.customer_id
        WHERE cs.status = 'active'
        AND cs.start_date IS NOT NULL
        AND (
          CASE 
            WHEN sp.billing_cycle = 'monthly' THEN 
              CURRENT_DATE >= DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '1 month'
            WHEN sp.billing_cycle = 'quarterly' THEN 
              CURRENT_DATE >= DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '3 months'
            WHEN sp.billing_cycle = 'annual' THEN 
              CURRENT_DATE >= DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '1 year'
            ELSE 
              CURRENT_DATE >= DATE_TRUNC('month', cs.start_date::timestamptz) + INTERVAL '1 month'
          END
        )
        AND COALESCE(ab.balance, 0) < sp.price
      `

      const suspensionResults = []

      for (const service of servicesToSuspend) {
        // Check if there's a recent payment that covers this service
        const recentPayment = await sql`
          SELECT SUM(amount) as total_paid
          FROM payments
          WHERE customer_id = ${service.customer_id}
          AND status = 'completed'
          AND payment_date >= ${service.next_billing_date}::date - INTERVAL '7 days'
        `

        const totalPaid = recentPayment[0]?.total_paid || 0

        // If insufficient payment, suspend the service
        if (totalPaid < service.price) {
          // Suspend the service
          await sql`
            UPDATE customer_services 
            SET 
              status = 'suspended',
              suspension_reason = 'monthly_cycle_unpaid',
              suspended_at = NOW(),
              suspended_by = 'system'
            WHERE id = ${service.id}
          `

          // Call router API to actually suspend the service
          try {
            const suspendResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}/api/customers/${service.customer_id}/actions/suspend`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  serviceId: service.id,
                  reason: "monthly_cycle_unpaid",
                  automated: true,
                }),
              },
            )

            if (!suspendResponse.ok) {
              console.error(`Failed to suspend service ${service.id} for customer ${service.customer_id}`)
            }
          } catch (error) {
            console.error(`Error suspending service ${service.id}:`, error)
          }

          // Log the suspension
          await sql`
            INSERT INTO system_logs (category, message, metadata, created_at)
            VALUES (
              'monthly_suspension',
              'Service ' || ${service.service_name} || ' suspended for customer ' || ${service.first_name} || ' ' || ${service.last_name} || ' - monthly cycle completed without payment',
              '{"customer_id": ' || ${service.customer_id} || ', "service_id": ' || ${service.id} || ', "reason": "monthly_cycle_unpaid", "required_amount": ' || ${service.price} || ', "account_balance": ' || ${service.account_balance} || '}',
              NOW()
            )
          `

          suspensionResults.push({
            customer_id: service.customer_id,
            customer_name: `${service.first_name} ${service.last_name}`,
            service_id: service.id,
            service_name: service.service_name,
            required_amount: service.price,
            account_balance: service.account_balance,
          })
        }
      }

      return NextResponse.json({
        success: true,
        suspended_services: suspensionResults.length,
        suspensions: suspensionResults,
      })
    }

    if (action === "process_payment_reactivation") {
      // Find customers with recent payments who have suspended services
      const recentPayments = await sql`
        SELECT DISTINCT p.customer_id, CONCAT(c.first_name, ' ', c.last_name) as customer_name
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        WHERE p.created_at >= NOW() - INTERVAL '1 hour'
        AND p.status = 'completed'
      `

      for (const payment of recentPayments) {
        // Check if customer has any overdue invoices remaining
        const remainingOverdue = await sql`
          SELECT COUNT(*) as count
          FROM invoices
          WHERE customer_id = ${payment.customer_id}
          AND status = 'overdue'
        `

        if (remainingOverdue[0].count === 0) {
          // No more overdue invoices, reactivate suspended services
          const suspendedServices = await sql`
            SELECT cs.*, sp.name as service_name
            FROM customer_services cs
            JOIN service_plans sp ON cs.service_plan_id = sp.id
            WHERE cs.customer_id = ${payment.customer_id}
            AND cs.status = 'suspended'
            AND cs.suspension_reason = 'overdue_payment'
          `

          for (const service of suspendedServices) {
            // Reactivate the service
            await sql`
              UPDATE customer_services 
              SET 
                status = 'active',
                suspension_reason = NULL,
                suspended_at = NULL,
                suspended_by = NULL,
                reactivated_at = NOW(),
                reactivated_by = 'system'
              WHERE id = ${service.id}
            `

            // Call router API to actually reactivate the service
            try {
              const reactivateResponse = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/customers/${payment.customer_id}/actions/unsuspend`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    serviceId: service.id,
                    automated: true,
                  }),
                },
              )

              if (!reactivateResponse.ok) {
                console.error(`Failed to reactivate service ${service.id} for customer ${payment.customer_id}`)
              }
            } catch (error) {
              console.error(`Error reactivating service ${service.id}:`, error)
            }

            // Log the reactivation
            await sql`
              INSERT INTO system_logs (category, message, metadata, created_at)
              VALUES (
                'reactivation',
                'Service ' || ${service.service_name} || ' automatically reactivated for customer ' || ${payment.customer_name} || ' after payment received',
                '{"customer_id": ' || ${payment.customer_id} || ', "service_id": ' || ${service.id} || ', "reason": "payment_received"}',
                NOW()
              )
            `
          }
        }
      }

      return NextResponse.json({
        success: true,
        processed_customers: recentPayments.length,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in automated billing:", error)
    return NextResponse.json({ error: "Failed to process automated billing" }, { status: 500 })
  }
}

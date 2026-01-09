import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { authorization } = Object.fromEntries(request.headers.entries())

    // Simple API key authentication for cron jobs
    if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    const results = {
      processed: 0,
      generated: 0,
      errors: 0,
      details: [] as any[],
    }

    // Get customers with auto-generate enabled and due for billing
    const customersForBilling = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        cbc.*,
        COALESCE(ab.last_invoice_date, c.created_at) as last_invoice_date
      FROM customers c
      JOIN customer_billing_configurations cbc ON c.id = cbc.customer_id
      LEFT JOIN account_balances ab ON c.id = ab.customer_id
      WHERE cbc.auto_generate_invoices = true
        AND c.status = 'active'
    `

    for (const customer of customersForBilling) {
      try {
        results.processed++

        // Check if invoice is due based on billing cycle
        const lastInvoiceDate = new Date(customer.last_invoice_date)
        const nextBillingDate = calculateNextBillingDate(lastInvoiceDate, customer.billing_cycle, customer.billing_day)

        if (today >= nextBillingDate) {
          // Generate invoice for this customer
          const invoiceResponse = await fetch(
            `${getBaseUrl()}/api/customers/${customer.customer_id}/finance/invoices/generate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                billing_period_start: lastInvoiceDate.toISOString(),
                billing_period_end: nextBillingDate.toISOString(),
                is_prorated: false,
              }),
            },
          )

          if (invoiceResponse.ok) {
            results.generated++
            results.details.push({
              customer_id: customer.customer_id,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              status: "success",
              next_billing_date: nextBillingDate,
            })

            // Update billing cycle record
            await sql`
              INSERT INTO billing_cycles (
                customer_id,
                cycle_start,
                cycle_end,
                amount,
                status,
                created_at
              ) VALUES (
                ${customer.customer_id},
                ${lastInvoiceDate},
                ${nextBillingDate},
                0, -- Will be updated after invoice calculation
                'completed',
                NOW()
              )
            `
          } else {
            results.errors++
            results.details.push({
              customer_id: customer.customer_id,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              status: "error",
              error: "Failed to generate invoice",
            })
          }
        } else {
          results.details.push({
            customer_id: customer.customer_id,
            customer_name: `${customer.first_name} ${customer.last_name}`,
            status: "skipped",
            reason: "Not due for billing",
            next_billing_date: nextBillingDate,
          })
        }
      } catch (error) {
        results.errors++
        results.details.push({
          customer_id: customer.customer_id,
          status: "error",
          error: error.message,
        })
      }
    }

    // Log the automated billing run
    await sql`
      INSERT INTO system_logs (
        level,
        category,
        message,
        details,
        created_at
      ) VALUES (
        'info',
        'automated_billing',
        'Automated billing run completed',
        ${JSON.stringify(results)},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} customers, generated ${results.generated} invoices, ${results.errors} errors`,
    })
  } catch (error) {
    console.error("Error in automated billing:", error)
    return NextResponse.json({ error: "Automated billing failed" }, { status: 500 })
  }
}

function calculateNextBillingDate(lastDate: Date, cycle: string, billingDay: number): Date {
  const nextDate = new Date(lastDate)

  switch (cycle) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1)
      nextDate.setDate(billingDay)
      break
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3)
      nextDate.setDate(billingDay)
      break
    case "semi-annual":
      nextDate.setMonth(nextDate.getMonth() + 6)
      nextDate.setDate(billingDay)
      break
    case "annual":
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      nextDate.setDate(billingDay)
      break
  }

  return nextDate
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

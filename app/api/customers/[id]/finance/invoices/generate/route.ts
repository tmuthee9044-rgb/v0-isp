import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const body = await request.json().catch(() => ({}))
    const { billing_period_start, billing_period_end, is_prorated = false } = body

    // Get customer billing configuration
    const [billingConfig] = await sql`
      SELECT * FROM customer_billing_configurations 
      WHERE customer_id = ${customerId}
    `

    if (!billingConfig) {
      return NextResponse.json({ error: "Billing configuration not found" }, { status: 400 })
    }

    // Generate invoice number
    const currentYear = new Date().getFullYear()
    const invoiceCountResult = await sql`
      SELECT COUNT(*) as count FROM invoices 
      WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
    `
    const invoiceCount = Number(invoiceCountResult[0].count) + 1
    const invoiceNumber = `INV-${currentYear}-${invoiceCount.toString().padStart(6, "0")}`

    // Get customer services
    const services = await sql`
      SELECT cs.*, sp.name as service_name, sp.price, sp.billing_cycle, sp.tax_rate as service_tax_rate
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId} AND cs.status = 'active'
    `

    if (services.length === 0) {
      return NextResponse.json({ error: "No active services found" }, { status: 400 })
    }

    // Calculate billing period
    const now = new Date()
    const periodStart = billing_period_start ? new Date(billing_period_start) : now
    const periodEnd = billing_period_end ? new Date(billing_period_end) : new Date(now)

    // Set period end based on billing cycle
    if (!billing_period_end) {
      switch (billingConfig.billing_cycle) {
        case "daily":
          periodEnd.setDate(periodEnd.getDate() + 1)
          break
        case "weekly":
          periodEnd.setDate(periodEnd.getDate() + 7)
          break
        case "monthly":
          periodEnd.setMonth(periodEnd.getMonth() + 1)
          break
        case "quarterly":
          periodEnd.setMonth(periodEnd.getMonth() + 3)
          break
        case "semi-annual":
          periodEnd.setMonth(periodEnd.getMonth() + 6)
          break
        case "annual":
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          break
      }
    }

    // Calculate due date based on payment terms
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + billingConfig.payment_terms)

    let subtotal = 0
    const invoiceItems = []

    // Calculate amounts for each service
    for (const service of services) {
      let serviceAmount = Number.parseFloat(service.price)

      // Apply pro-rata billing if enabled and requested
      if (billingConfig.pro_rata_enabled && is_prorated) {
        const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
        const billingCycleDays = getBillingCycleDays(billingConfig.billing_cycle)
        const proRataFactor = totalDays / billingCycleDays
        serviceAmount = serviceAmount * proRataFactor
      }

      subtotal += serviceAmount

      invoiceItems.push({
        service_plan_id: service.service_plan_id,
        description: service.service_name + (is_prorated ? " (Pro-rated)" : ""),
        unit_price: Number.parseFloat(service.price),
        quantity: is_prorated
          ? Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) /
            getBillingCycleDays(billingConfig.billing_cycle)
          : 1,
        total_amount: serviceAmount,
      })
    }

    // Calculate tax
    let taxAmount = 0
    if (!billingConfig.tax_exempt) {
      const taxRate = billingConfig.tax_rate / 100
      if (billingConfig.tax_inclusive) {
        // Tax is included in the price
        taxAmount = subtotal * (taxRate / (1 + taxRate))
        subtotal = subtotal - taxAmount
      } else {
        // Tax is added to the price
        taxAmount = subtotal * taxRate
      }
    }

    const totalAmount = subtotal + taxAmount

    // Create invoice
    const [invoice] = await sql`
      INSERT INTO invoices (
        customer_id,
        invoice_number,
        amount,
        subtotal,
        tax_amount,
        discount_amount,
        due_date,
        status,
        notes,
        invoice_date,
        service_period_start,
        service_period_end,
        payment_terms,
        is_prorated,
        created_at
      ) VALUES (
        ${customerId},
        ${invoiceNumber},
        ${totalAmount},
        ${subtotal},
        ${taxAmount},
        0,
        ${dueDate},
        'pending',
        ${billingConfig.custom_payment_terms || "Monthly service charges"},
        NOW(),
        ${periodStart},
        ${periodEnd},
        ${billingConfig.payment_terms},
        ${is_prorated},
        NOW()
      ) RETURNING *
    `

    // Create invoice items
    for (const item of invoiceItems) {
      await sql`
        INSERT INTO invoice_items (
          invoice_id,
          service_plan_id,
          description,
          unit_price,
          quantity,
          total_amount,
          tax_rate,
          created_at
        ) VALUES (
          ${invoice.id},
          ${item.service_plan_id},
          ${item.description},
          ${item.unit_price},
          ${item.quantity},
          ${item.total_amount},
          ${billingConfig.tax_exempt ? 0 : billingConfig.tax_rate},
          NOW()
        )
      `
    }

    // Update account balance
    await sql`
      UPDATE account_balances 
      SET 
        balance = balance - ${totalAmount},
        last_invoice_date = NOW(),
        updated_at = NOW()
      WHERE customer_id = ${customerId}
    `

    // Send invoice if auto-send is enabled
    if (billingConfig.auto_send_invoices) {
      // Queue invoice sending (implement notification system)
      await queueInvoiceNotification(invoice.id, customerId, billingConfig)
    }

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        items: invoiceItems,
      },
      message: "Invoice generated successfully",
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 })
  }
}

function getBillingCycleDays(cycle: string): number {
  switch (cycle) {
    case "daily":
      return 1
    case "weekly":
      return 7
    case "monthly":
      return 30
    case "quarterly":
      return 90
    case "semi-annual":
      return 180
    case "annual":
      return 365
    default:
      return 30
  }
}

async function queueInvoiceNotification(invoiceId: number, customerId: number, billingConfig: any) {
  try {
    // This would integrate with your notification system
    console.log(`Queuing invoice notification for invoice ${invoiceId}, customer ${customerId}`)

    // Example: Add to notification queue
    await sql`
      INSERT INTO messages (
        recipient_id,
        recipient_type,
        message_type,
        subject,
        content,
        status,
        scheduled_at,
        created_at
      ) VALUES (
        ${customerId},
        'customer',
        'invoice',
        'New Invoice Generated',
        'A new invoice has been generated for your account. Please log in to view and pay.',
        'scheduled',
        NOW(),
        NOW()
      )
    `
  } catch (error) {
    console.error("Error queuing invoice notification:", error)
  }
}

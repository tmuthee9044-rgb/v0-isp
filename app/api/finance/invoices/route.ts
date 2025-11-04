import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const invoices = await sql`
      SELECT 
        i.*,
        c.first_name,
        c.last_name,
        c.email,
        c.business_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { customer_id, amount, description, due_date, items } = await request.json()

    if (!customer_id || !amount || !description) {
      return NextResponse.json({ error: "Customer, amount, and description are required" }, { status: 400 })
    }

    // Generate invoice number
    const invoiceCount = await sql`SELECT COUNT(*) as count FROM invoices`
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Number(invoiceCount[0].count) + 1).padStart(3, "0")}`

    const [invoice] = await sql`
      INSERT INTO invoices (
        invoice_number,
        customer_id, 
        amount, 
        description, 
        due_date, 
        status,
        paid_amount
      )
      VALUES (
        ${invoiceNumber},
        ${customer_id}, 
        ${amount}, 
        ${description}, 
        ${due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}, 
        'pending',
        0
      )
      RETURNING *
    `

    // Insert invoice items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await sql`
          INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            total_price
          )
          VALUES (
            ${invoice.id},
            ${item.description},
            ${item.quantity || 1},
            ${item.unit_price},
            ${item.total_price || item.unit_price * (item.quantity || 1)}
          )
        `
      }
    }

    try {
      await sql`
        INSERT INTO admin_logs (
          action,
          resource_type,
          resource_id,
          new_values,
          ip_address,
          created_at
        )
        VALUES (
          'invoice_created',
          'invoice',
          ${invoice.id},
          ${JSON.stringify({ invoice_number: invoiceNumber, customer_id, amount, description })},
          'system',
          NOW()
        )
      `
      console.log("[v0] Invoice creation logged to admin_logs")
    } catch (logError) {
      console.error("[v0] Error logging invoice creation:", logError)
    }

    try {
      // Calculate customer's account balance: (Payments + Credit Notes) - Invoices
      const [balanceData] = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN type = 'credit_note' THEN amount ELSE 0 END), 0) as total_credit_notes,
          COALESCE(SUM(CASE WHEN type = 'invoice' THEN amount ELSE 0 END), 0) as total_invoiced
        FROM (
          SELECT 'invoice' as type, amount FROM invoices WHERE customer_id = ${customer_id} AND id != ${invoice.id}
          UNION ALL
          SELECT 'payment' as type, amount FROM payments WHERE customer_id = ${customer_id}
          UNION ALL
          SELECT 'credit_note' as type, amount FROM credit_notes WHERE customer_id = ${customer_id}
        ) as all_transactions
      `

      const accountBalance =
        Number(balanceData.total_paid) + Number(balanceData.total_credit_notes) - Number(balanceData.total_invoiced)

      console.log("[v0] Customer account balance before new invoice:", accountBalance)
      console.log("[v0] New invoice amount:", amount)

      // If customer has credit (positive balance), auto-apply it to the new invoice
      if (accountBalance > 0) {
        const creditToApply = Math.min(accountBalance, amount)
        console.log("[v0] Auto-applying credit to new invoice:", creditToApply)

        // Create a payment record for the credit application
        const [payment] = await sql`
          INSERT INTO payments (
            customer_id,
            amount,
            payment_method,
            transaction_id,
            payment_date,
            status,
            currency
          )
          VALUES (
            ${customer_id},
            ${creditToApply},
            'Credit Balance',
            ${`CREDIT-${invoiceNumber}`},
            NOW(),
            'completed',
            'KES'
          )
          RETURNING *
        `

        // Update invoice with the applied credit
        const newPaidAmount = creditToApply
        const newStatus = newPaidAmount >= amount ? "paid" : "partial"

        await sql`
          UPDATE invoices
          SET paid_amount = ${newPaidAmount},
              status = ${newStatus}
          WHERE id = ${invoice.id}
        `

        if (newStatus === "paid") {
          console.log("[v0] Invoice fully paid, checking for associated service to activate...")

          // Extract service ID from invoice number (format: INV-{customerId}-{date}-{serviceId})
          const invoiceNumberParts = invoiceNumber.split("-")
          if (invoiceNumberParts.length >= 4) {
            const serviceId = Number.parseInt(invoiceNumberParts[3])

            if (!isNaN(serviceId)) {
              console.log("[v0] Found service ID in invoice number:", serviceId)

              // Check if service exists and is pending
              const [service] = await sql`
                SELECT * FROM customer_services 
                WHERE id = ${serviceId} AND customer_id = ${customer_id} AND status = 'pending'
              `

              if (service) {
                console.log("[v0] Activating service:", serviceId)

                // Activate the service
                await sql`
                  UPDATE customer_services
                  SET status = 'active', activated_at = NOW(), updated_at = NOW()
                  WHERE id = ${serviceId}
                `

                // Log service activation
                await sql`
                  INSERT INTO admin_logs (
                    action,
                    resource_type,
                    resource_id,
                    new_values,
                    ip_address,
                    created_at
                  )
                  VALUES (
                    'service_activated',
                    'customer_service',
                    ${serviceId},
                    ${JSON.stringify({
                      customer_id,
                      service_id: serviceId,
                      invoice_id: invoice.id,
                      invoice_number: invoiceNumber,
                      payment_method: "Credit Balance",
                      reason: "Invoice paid by customer credit balance",
                    })},
                    'system',
                    NOW()
                  )
                `

                console.log("[v0] Service activated successfully:", serviceId)
              } else {
                console.log("[v0] No pending service found with ID:", serviceId)
              }
            }
          }
        }

        try {
          await sql`
            INSERT INTO admin_logs (
              action,
              resource_type,
              resource_id,
              new_values,
              ip_address,
              created_at
            )
            VALUES (
              'payment_auto_applied',
              'payment',
              ${payment.id},
              ${JSON.stringify({
                customer_id,
                invoice_id: invoice.id,
                invoice_number: invoiceNumber,
                amount: creditToApply,
                payment_method: "Credit Balance",
                status: newStatus,
              })},
              'system',
              NOW()
            )
          `
          console.log("[v0] Credit balance payment logged to admin_logs")
        } catch (logError) {
          console.error("[v0] Error logging credit payment:", logError)
        }

        console.log("[v0] Invoice updated with credit application:", {
          invoice_id: invoice.id,
          paid_amount: newPaidAmount,
          status: newStatus,
          credit_applied: creditToApply,
        })

        // Return updated invoice with payment info
        const [updatedInvoice] = await sql`
          SELECT * FROM invoices WHERE id = ${invoice.id}
        `

        return NextResponse.json({
          invoice: updatedInvoice,
          payment_id: payment.id,
          credit_applied: creditToApply,
          message: `Invoice created and ${creditToApply >= amount ? "fully paid" : "partially paid"} using account credit. ${newStatus === "paid" ? "Service activated." : ""} Receipt available for download.`,
        })
      }
    } catch (creditError) {
      console.error("[v0] Error applying credit to invoice:", creditError)
      // Continue without credit application if there's an error
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}

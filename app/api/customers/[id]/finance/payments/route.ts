import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { ActivityLogger } from "@/lib/activity-logger"
import { paymentGateway } from "@/lib/payment-gateway"
import { provisionRadiusUser } from "@/lib/radius-integration"

async function ensureAccountBalance(customerId: number) {
  try {
    const sql = await getSql()
    const [existingBalance] = await sql`
      SELECT id FROM account_balances WHERE customer_id = ${customerId}
    `

    if (!existingBalance) {
      await sql`
        INSERT INTO account_balances (customer_id, balance, credit_limit, status, updated_at)
        VALUES (${customerId}, 0, 0, 'active', NOW())
      `
    }
  } catch (error) {
    console.error("Error ensuring account balance:", error)
    throw error
  }
}

async function applyPaymentToInvoices(
  customerId: number,
  paymentAmount: number,
  paymentId: number,
  selectedInvoiceIds?: number[],
) {
  try {
    await ensureAccountBalance(customerId)

    let unpaidInvoices

    if (selectedInvoiceIds && selectedInvoiceIds.length > 0) {
      const sql = await getSql()
      unpaidInvoices = await sql`
        SELECT id, amount, paid_amount, (amount - COALESCE(paid_amount, 0)) as remaining_balance
        FROM invoices 
        WHERE customer_id = ${customerId} 
        AND id = ANY(${selectedInvoiceIds})
        AND status IN ('pending', 'overdue', 'partial')
        AND (amount - COALESCE(paid_amount, 0)) > 0
        ORDER BY due_date ASC, created_at ASC
      `
    } else {
      const sql = await getSql()
      unpaidInvoices = await sql`
        SELECT id, amount, paid_amount, (amount - COALESCE(paid_amount, 0)) as remaining_balance
        FROM invoices 
        WHERE customer_id = ${customerId} 
        AND status IN ('pending', 'overdue', 'partial')
        AND (amount - COALESCE(paid_amount, 0)) > 0
        ORDER BY due_date ASC, created_at ASC
      `
    }

    console.log("[v0] Found unpaid invoices for customer", customerId, ":", unpaidInvoices.length)

    let remainingPayment = paymentAmount
    const applications = []

    // Apply payment to invoices in FIFO order
    for (const invoice of unpaidInvoices) {
      if (remainingPayment <= 0) break

      const invoiceBalance = Number.parseFloat(invoice.remaining_balance)
      const applicationAmount = Math.min(remainingPayment, invoiceBalance)

      console.log("[v0] Applying", applicationAmount, "to invoice", invoice.id)

      const sql = await getSql()
      try {
        await sql`
          INSERT INTO payment_applications (payment_id, invoice_id, amount_applied, created_at)
          VALUES (${paymentId}, ${invoice.id}, ${applicationAmount}, NOW())
        `
      } catch (error) {
        console.log("[v0] payment_applications table not available, skipping application record")
      }

      const newAmountPaid = Number.parseFloat(invoice.paid_amount || 0) + applicationAmount
      const invoiceAmount = Number.parseFloat(invoice.amount)

      let newStatus = "partial"
      if (newAmountPaid >= invoiceAmount) {
        newStatus = "paid"
      }

      await sql`
        UPDATE invoices 
        SET paid_amount = ${newAmountPaid}, 
            status = ${newStatus}
        WHERE id = ${invoice.id}
      `

      console.log("[v0] Updated invoice", invoice.id, "status to", newStatus, "paid amount:", newAmountPaid)

      applications.push({
        invoice_id: invoice.id,
        amount_applied: applicationAmount,
      })

      remainingPayment -= applicationAmount
    }

    if (remainingPayment > 0) {
      console.log("[v0] Creating credit adjustment for remaining amount:", remainingPayment)
      const sql = await getSql()
      try {
        await sql`
          INSERT INTO financial_adjustments (
            customer_id, adjustment_type, amount, reason, status, created_at
          ) VALUES (
            ${customerId}, 'credit', ${remainingPayment}, 
            ${`Overpayment credit from payment ID ${paymentId}`}, 'approved', NOW()
          )
        `
      } catch (error) {
        console.log("[v0] financial_adjustments table not available, skipping credit record")
      }
    }

    const sql = await getSql()
    const updateResult = await sql`
      UPDATE account_balances 
      SET balance = balance + ${paymentAmount},
          last_payment_date = NOW(),
          updated_at = NOW()
      WHERE customer_id = ${customerId}
      RETURNING balance
    `

    console.log("[v0] Updated account balance for customer", customerId, "new balance:", updateResult[0]?.balance)

    if (updateResult.length === 0) {
      throw new Error("Failed to update account balance - customer account not found")
    }

    return { applications, overpayment: remainingPayment, newBalance: updateResult[0].balance }
  } catch (error) {
    console.error("[v0] Error applying payment to invoices:", error)
    throw error
  }
}

async function activateServicesAfterPayment(customerId: number, paymentId: number) {
  try {
    console.log("[v0] Checking for services to activate after payment for customer", customerId)

    const sql = await getSql()

    const pendingServices = await sql`
      SELECT 
        cs.*, 
        sp.name as service_name, 
        sp.id as service_plan_id,
        sp.speed_download,
        sp.speed_upload,
        c.email,
        c.phone
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.customer_id = ${customerId}
      AND cs.status = 'pending'
      AND cs.activation_date IS NULL
      AND (cs.installation_date IS NULL OR cs.installation_date <= CURRENT_DATE)
    `

    if (pendingServices.length === 0) {
      console.log("[v0] No pending services to activate")
      return { activated: 0, services: [] }
    }

    const activatedServices = []

    for (const service of pendingServices) {
      try {
        await sql`
          UPDATE customer_services 
          SET status = 'active',
              activation_date = NOW(),
              updated_at = NOW()
          WHERE id = ${service.id}
        `

        console.log("[v0] Successfully activated service", service.id, service.service_name)

        const username = `${service.email?.split("@")[0] || "user"}${customerId}`.toLowerCase()
        const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10)

        console.log("[v0] Provisioning RADIUS credentials for service", service.id, "username:", username)

        const radiusResult = await provisionRadiusUser({
          username: username,
          password: password,
          customerId: customerId,
          serviceId: service.id,
          ipAddress: service.ip_address,
          downloadSpeed: service.speed_download,
          uploadSpeed: service.speed_upload,
        })

        if (radiusResult.success) {
          console.log("[v0] RADIUS user provisioned successfully for", username)
        } else {
          console.error("[v0] Failed to provision RADIUS user:", radiusResult.error)
        }

        activatedServices.push({
          service_id: service.id,
          service_name: service.service_name,
          pppoe_username: username,
          pppoe_password: password,
        })

        const logDetails = JSON.stringify({
          customer_id: customerId,
          service_id: service.id,
          payment_id: paymentId,
          service_plan_id: service.service_plan_id,
          pppoe_username: username,
        })

        try {
          await sql`
            INSERT INTO system_logs (
              level,
              source,
              category, 
              message, 
              details, 
              created_at,
              updated_at
            )
            VALUES (
              'INFO',
              'payment_system',
              'service_activation',
              ${`Service ${service.service_name} automatically activated after payment`},
              ${logDetails}::jsonb,
              NOW(),
              NOW()
            )
          `
        } catch (logError) {
          console.log("[v0] system_logs insert error:", logError)
        }

        try {
          await ActivityLogger.logCustomerActivity(
            `Service ${service.service_name} activated after payment with PPPoE credentials`,
            customerId,
            {
              service_id: service.id,
              payment_id: paymentId,
              service_plan_id: service.service_plan_id,
              pppoe_username: username,
            },
          )
        } catch (activityError) {
          console.log("[v0] Activity logging error:", activityError)
        }
      } catch (error) {
        console.error("[v0] Error activating service", service.id, ":", error)
      }
    }

    return { activated: activatedServices.length, services: activatedServices }
  } catch (error) {
    console.error("[v0] Error in activateServicesAfterPayment:", error)
    return { activated: 0, services: [] }
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    let requestData
    try {
      requestData = await request.json()
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const {
      amount,
      phone_number,
      payment_method = "mpesa",
      description,
      reference_number,
      selected_invoices,
    } = requestData

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid positive amount is required" }, { status: 400 })
    }

    const numericAmount = Number.parseFloat(amount)
    if (numericAmount > 1000000) {
      return NextResponse.json({ error: "Amount exceeds maximum transaction limit" }, { status: 400 })
    }

    if (payment_method === "mpesa" && !phone_number) {
      return NextResponse.json({ error: "Phone number is required for M-Pesa payments" }, { status: 400 })
    }

    if (payment_method === "mpesa" && phone_number) {
      const phoneRegex = /^254[0-9]{9}$/
      if (!phoneRegex.test(phone_number.replace(/\s+/g, ""))) {
        return NextResponse.json({ error: "Invalid phone number format. Use 254XXXXXXXXX" }, { status: 400 })
      }
    }

    const sql = await getSql()
    const customerResult = await sql`
      SELECT id, first_name, last_name, status FROM customers WHERE id = ${customerId}
    `

    if (customerResult.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const customer = customerResult[0]

    if (customer.status === "suspended") {
      return NextResponse.json({ error: "Cannot process payment for suspended customer" }, { status: 400 })
    }

    await ensureAccountBalance(customerId)

    let paymentId: number

    try {
      console.log(
        "[v0] Processing payment for customer",
        customerId,
        "amount:",
        numericAmount,
        "method:",
        payment_method,
      )

      const paymentResult = await sql`
        INSERT INTO payments (
          customer_id, amount, payment_method, status, 
          transaction_id, currency, created_at
        ) VALUES (
          ${customerId}, ${numericAmount}, ${payment_method}, 'pending',
          ${`TXN-${Date.now()}`}, 
          'KES',
          NOW()
        ) RETURNING id, transaction_id
      `

      if (paymentResult.length === 0) {
        throw new Error("Failed to create payment record")
      }

      const payment = paymentResult[0]
      paymentId = payment.id

      console.log("[v0] Created payment record with ID:", paymentId)

      if (payment_method === "cash") {
        console.log("[v0] Processing cash payment")
        await sql`
          UPDATE payments 
          SET status = 'completed', 
              payment_date = NOW()
          WHERE id = ${paymentId}
        `

        const applicationResult = await applyPaymentToInvoices(customerId, numericAmount, paymentId, selected_invoices)

        console.log("[v0] Cash payment completed, applications:", applicationResult.applications.length)

        const activationResult = await activateServicesAfterPayment(customerId, paymentId)
        console.log("[v0] Activated", activationResult.activated, "services after payment")

        await ActivityLogger.logCustomerActivity(
          `Cash payment completed: KES ${numericAmount} applied to ${applicationResult.applications.length} invoices`,
          customerId,
          {
            payment_id: paymentId,
            amount: numericAmount,
            payment_method,
            applications: applicationResult.applications,
            overpayment: applicationResult.overpayment,
            new_balance: applicationResult.newBalance,
            activated_services: activationResult.services,
            selected_invoices: selected_invoices || null,
          },
        )

        return NextResponse.json({
          success: true,
          payment_id: paymentId,
          transaction_id: payment.transaction_id,
          reference_number: reference_number || `PAY-${customerId}-${Date.now()}`,
          message: "Cash payment processed and applied to invoices successfully",
          applications: applicationResult.applications,
          overpayment: applicationResult.overpayment,
          new_balance: applicationResult.newBalance,
          activated_services: activationResult.services,
        })
      }

      const paymentRequest = {
        customer_id: customerId,
        amount: numericAmount,
        currency: "KES",
        payment_method,
        notes: description || `Payment for ${customer.first_name} ${customer.last_name}`,
        reference: reference_number || `PAY-${customerId}-${Date.now()}`,
        metadata: {
          phone_number: phone_number?.replace(/\s+/g, ""),
          customer_name: `${customer.first_name} ${customer.last_name}`,
          payment_id: paymentId,
        },
      }

      console.log("[v0] Processing payment through gateway")
      const result = await paymentGateway.processPayment(paymentRequest)

      console.log("[v0] Gateway result:", result.success ? "SUCCESS" : "FAILED", result.message || result.error)

      if (result.success) {
        await sql`
          UPDATE payments 
          SET status = 'completed', 
              payment_date = NOW(),
              transaction_id = ${result.transaction_id || payment.transaction_id}
          WHERE id = ${paymentId}
        `

        console.log("[v0] Updated payment status to completed")

        const applicationResult = await applyPaymentToInvoices(customerId, numericAmount, paymentId, selected_invoices)

        console.log("[v0] Applied payment to", applicationResult.applications.length, "invoices")

        const activationResult = await activateServicesAfterPayment(customerId, paymentId)
        console.log("[v0] Activated", activationResult.activated, "services after payment")

        await ActivityLogger.logCustomerActivity(
          `Payment completed: ${payment_method.toUpperCase()} KES ${numericAmount} applied to ${applicationResult.applications.length} invoices`,
          customerId,
          {
            payment_id: paymentId,
            amount: numericAmount,
            payment_method,
            phone_number,
            applications: applicationResult.applications,
            overpayment: applicationResult.overpayment,
            new_balance: applicationResult.newBalance,
            activated_services: activationResult.services,
            selected_invoices: selected_invoices || null,
          },
        )

        return NextResponse.json({
          success: true,
          payment_id: paymentId,
          transaction_id: result.transaction_id || payment.transaction_id,
          reference_number: reference_number || `PAY-${customerId}-${Date.now()}`,
          message: result.message || "Payment processed and applied to invoices successfully",
          applications: applicationResult.applications,
          overpayment: applicationResult.overpayment,
          new_balance: applicationResult.newBalance,
          activated_services: activationResult.services,
        })
      } else {
        await sql`
          UPDATE payments 
          SET status = 'failed'
          WHERE id = ${paymentId}
        `

        await ActivityLogger.logCustomerActivity(
          `Payment failed: ${payment_method.toUpperCase()} KES ${numericAmount} - ${result.error}`,
          customerId,
          {
            payment_id: paymentId,
            amount: numericAmount,
            payment_method,
            phone_number,
            error: result.error,
          },
        )

        return NextResponse.json(
          {
            success: false,
            payment_id: paymentId,
            error: result.error || "Payment processing failed",
            message: "Payment could not be processed. Please try again or contact support.",
          },
          { status: 400 },
        )
      }
    } catch (processingError) {
      console.error("Payment processing error:", processingError)

      if (paymentId) {
        try {
          const sql = await getSql()
          await sql`
            UPDATE payments 
            SET status = 'failed'
            WHERE id = ${paymentId}
          `
        } catch (updateError) {
          console.error("Error updating failed payment:", updateError)
        }
      }

      await ActivityLogger.logCustomerActivity(
        `Payment processing error: ${processingError instanceof Error ? processingError.message : "Unknown error"}`,
        customerId,
        {
          payment_id: paymentId,
          amount: numericAmount,
          payment_method,
          error: processingError instanceof Error ? processingError.message : "Unknown error",
        },
      )

      throw processingError
    }
  } catch (error) {
    console.error("Payment API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Payment processing failed. Please try again or contact support.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const sql = await getSql()
    const payments = await sql`
      SELECT 
        p.*,
        ml.transaction_id as mpesa_receipt_number,
        ml.phone_number as mpesa_phone,
        CASE 
          WHEN p.status = 'completed' THEN 'success'
          WHEN p.status = 'failed' THEN 'failed'
          ELSE 'pending'
        END as display_status
      FROM payments p
      LEFT JOIN mpesa_logs ml ON p.transaction_id = ml.transaction_id
      WHERE p.customer_id = ${customerId}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) as count FROM payments WHERE customer_id = ${customerId}
    `

    return NextResponse.json({
      success: true,
      payments,
      total: Number.parseInt(count),
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching payment history:", error)
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 })
  }
}

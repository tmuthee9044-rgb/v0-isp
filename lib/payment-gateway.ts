import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export interface PaymentRequest {
  customer_id: number
  amount: number
  currency: string
  payment_method: "mpesa" | "card" | "bank_transfer" | "cash"
  description: string
  reference?: string
  metadata?: Record<string, any>
  callback_url?: string
}

export interface PaymentResponse {
  success: boolean
  payment_id?: string
  transaction_id?: string
  checkout_url?: string
  error?: string
  message?: string
}

export class UnifiedPaymentGateway {
  private static instance: UnifiedPaymentGateway
  private gateways: Map<string, PaymentGatewayInterface> = new Map()

  static getInstance(): UnifiedPaymentGateway {
    if (!UnifiedPaymentGateway.instance) {
      UnifiedPaymentGateway.instance = new UnifiedPaymentGateway()
    }
    return UnifiedPaymentGateway.instance
  }

  registerGateway(name: string, gateway: PaymentGatewayInterface) {
    this.gateways.set(name, gateway)
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log("[v0] Processing payment:", request)
      await ActivityLogger.logAdminActivity(
        `Payment initiated: ${request.payment_method} - KES ${request.amount}`,
        "system",
        {
          customer_id: request.customer_id,
          amount: request.amount,
          payment_method: request.payment_method,
          reference: request.reference,
        },
      )

      // Get appropriate gateway
      const gateway = this.getGateway(request.payment_method)
      if (!gateway) {
        throw new Error(`Payment gateway not found for method: ${request.payment_method}`)
      }

      // Create payment record
      const [payment] = await sql`
        INSERT INTO payments (
          customer_id, 
          amount, 
          payment_method, 
          description, 
          status, 
          reference_number,
          currency,
          metadata
        )
        VALUES (
          ${request.customer_id},
          ${request.amount},
          ${request.payment_method},
          ${request.description},
          'pending',
          ${request.reference || this.generateReference()},
          ${request.currency || "KES"},
          ${JSON.stringify(request.metadata || {})}
        )
        RETURNING *
      `

      console.log("[v0] Created payment record:", payment)

      // Process payment through gateway
      const result = await gateway.processPayment({
        ...request,
        payment_id: payment.id,
      })

      console.log("[v0] Gateway processing result:", result)

      if (result.success) {
        // Update payment status to completed
        await sql`
          UPDATE payments 
          SET 
            status = 'completed',
            payment_date = NOW(),
            external_transaction_id = ${result.transaction_id},
            gateway_response = ${JSON.stringify(result)},
            updated_at = NOW()
          WHERE id = ${payment.id}
        `

        console.log("[v0] Updated payment status to completed")

        // Apply payment to invoices and update balance
        await this.applyPaymentToInvoices(request.customer_id, request.amount, payment.id)

        // Trigger service activation
        await this.triggerServiceActivation(payment.id, request.customer_id, request.amount)

        // Generate receipt and run post-payment workflows
        await this.generateReceipt(payment)
        await this.triggerPostPaymentWorkflows(payment)
      } else {
        // Update payment status to failed
        await sql`
          UPDATE payments 
          SET 
            status = 'failed',
            external_transaction_id = ${result.transaction_id},
            gateway_response = ${JSON.stringify(result)},
            failure_reason = ${result.error},
            updated_at = NOW()
          WHERE id = ${payment.id}
        `
      }

      return {
        ...result,
        payment_id: payment.id,
      }
    } catch (error) {
      console.error("[v0] Payment processing error:", error)
      await ActivityLogger.logAdminActivity(
        `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "system",
        {
          customer_id: request.customer_id,
          amount: request.amount,
          payment_method: request.payment_method,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment processing failed",
      }
    }
  }

  async confirmPayment(payment_id: string, transaction_data: any): Promise<void> {
    try {
      await sql`
        UPDATE payments 
        SET 
          status = 'completed',
          payment_date = NOW(),
          gateway_response = ${JSON.stringify(transaction_data)},
          updated_at = NOW()
        WHERE id = ${payment_id}
      `

      // Get payment details
      const [payment] = await sql`
        SELECT * FROM payments WHERE id = ${payment_id}
      `

      if (payment) {
        await this.triggerPostPaymentWorkflows(payment)

        // Generate receipt
        await this.generateReceipt(payment)

        // Update customer services
        await this.updateCustomerServices(payment.customer_id, payment.amount)

        // Generate invoice if needed
        await this.generateInvoiceIfNeeded(payment)
      }
    } catch (error) {
      console.error("Error confirming payment:", error)
      throw error
    }
  }

  private getGateway(method: string): PaymentGatewayInterface | undefined {
    switch (method) {
      case "mpesa":
        return this.gateways.get("mpesa")
      case "card":
        return this.gateways.get("card")
      case "bank_transfer":
        return this.gateways.get("bank")
      case "cash":
        return this.gateways.get("cash")
      default:
        return undefined
    }
  }

  private generateReference(): string {
    return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }

  private async triggerServiceActivation(payment_id: string, customer_id: number, amount: number): Promise<void> {
    const services = await sql`
      SELECT cs.*, sp.name as service_name, sp.monthly_fee
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customer_id} AND cs.status IN ('pending', 'suspended')
      ORDER BY cs.created_at ASC
    `

    let remainingAmount = amount
    for (const service of services) {
      if (remainingAmount <= 0) break

      const monthlyFee = Number.parseFloat(service.monthly_fee || "0")
      if (remainingAmount >= monthlyFee) {
        // Activate service
        await sql`
          UPDATE customer_services 
          SET 
            status = 'active',
            last_payment_date = NOW(),
            next_billing_date = NOW() + INTERVAL '1 month',
            updated_at = NOW()
          WHERE id = ${service.id}
        `

        remainingAmount -= monthlyFee

        await ActivityLogger.logCustomerActivity(`Service activated: ${service.service_name}`, customer_id, {
          service_id: service.id,
          payment_id,
          amount_allocated: monthlyFee,
        })
      }
    }
  }

  private async triggerPostPaymentWorkflows(payment: any): Promise<void> {
    await ActivityLogger.logCustomerActivity(`Payment confirmed: KES ${payment.amount}`, payment.customer_id, {
      payment_id: payment.id,
      amount: payment.amount,
      payment_method: payment.payment_method,
    })

    // Send payment confirmation SMS/Email
    await this.sendPaymentConfirmation(payment)
  }

  private async generateReceipt(payment: any): Promise<void> {
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(payment.id).padStart(6, "0")}`

    await sql`
      INSERT INTO receipts (
        payment_id,
        customer_id,
        receipt_number,
        amount,
        payment_method,
        issued_date,
        status
      )
      VALUES (
        ${payment.id},
        ${payment.customer_id},
        ${receiptNumber},
        ${payment.amount},
        ${payment.payment_method},
        NOW(),
        'issued'
      )
    `
  }

  private async updateCustomerServices(customer_id: number, amount: number): Promise<void> {
    const services = await sql`
      SELECT cs.*, sp.monthly_fee, sp.name as service_name
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customer_id} AND cs.status = 'active'
    `

    // Calculate proportional allocation
    const totalOwed = services.reduce(
      (sum: number, service: any) => sum + Number.parseFloat(service.monthly_fee || "0"),
      0,
    )

    let remainingAmount = amount
    for (const service of services) {
      if (remainingAmount <= 0) break

      const serviceOwed = Number.parseFloat(service.monthly_fee || "0")
      const allocationPercentage = serviceOwed / totalOwed
      const allocatedAmount = Math.min(amount * allocationPercentage, remainingAmount, serviceOwed)

      if (allocatedAmount > 0) {
        // Update service payment status
        await sql`
          UPDATE customer_services 
          SET 
            last_payment_date = NOW(),
            next_billing_date = CASE 
              WHEN ${allocatedAmount} >= ${serviceOwed} 
              THEN next_billing_date + INTERVAL '1 month'
              ELSE next_billing_date
            END,
            updated_at = NOW()
          WHERE id = ${service.id}
        `

        remainingAmount -= allocatedAmount
      }
    }
  }

  private async generateInvoiceIfNeeded(payment: any): Promise<void> {
    const existingInvoice = await sql`
      SELECT id FROM invoices 
      WHERE customer_id = ${payment.customer_id} 
      AND amount = ${payment.amount}
      AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingInvoice.length === 0) {
      // Generate new invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      await sql`
        INSERT INTO invoices (
          invoice_number,
          customer_id,
          amount,
          description,
          status,
          payment_id,
          due_date,
          paid_date
        )
        VALUES (
          ${invoiceNumber},
          ${payment.customer_id},
          ${payment.amount},
          ${payment.description},
          'paid',
          ${payment.id},
          NOW(),
          NOW()
        )
      `
    } else {
      // Update existing invoice
      await sql`
        UPDATE invoices 
        SET 
          status = 'paid',
          payment_id = ${payment.id},
          paid_date = NOW(),
          updated_at = NOW()
        WHERE id = ${existingInvoice[0].id}
      `
    }
  }

  private async sendPaymentConfirmation(payment: any): Promise<void> {
    const [customer] = await sql`
      SELECT first_name, last_name, email, phone 
      FROM customers 
      WHERE id = ${payment.customer_id}
    `

    if (customer) {
      const message = `Payment confirmed! KES ${payment.amount} received. Thank you for your payment. Ref: ${payment.reference_number}`

      // Log SMS sending (actual SMS integration would be here)
      await ActivityLogger.logCustomerActivity(`Payment confirmation sent to ${customer.phone}`, payment.customer_id, {
        payment_id: payment.id,
        phone: customer.phone,
        message,
      })
    }
  }

  private async applyPaymentToInvoices(customerId: number, paymentAmount: number, paymentId: number) {
    try {
      console.log("[v0] Applying payment to invoices:", { customerId, paymentAmount, paymentId })

      // Ensure account balance exists
      await sql`
        INSERT INTO account_balances (customer_id, balance, credit_limit, status, created_at, updated_at)
        VALUES (${customerId}, 0, 0, 'active', NOW(), NOW())
        ON CONFLICT (customer_id) DO NOTHING
      `

      // Get unpaid invoices in FIFO order (oldest first)
      const unpaidInvoices = await sql`
        SELECT id, amount, amount_paid, (amount - COALESCE(amount_paid, 0)) as remaining_balance
        FROM invoices 
        WHERE customer_id = ${customerId} 
        AND status IN ('pending', 'overdue', 'partial')
        AND (amount - COALESCE(amount_paid, 0)) > 0
        ORDER BY due_date ASC, created_at ASC
      `

      console.log("[v0] Found unpaid invoices:", unpaidInvoices.length)

      let remainingPayment = paymentAmount
      const applications = []

      // Apply payment to invoices in FIFO order
      for (const invoice of unpaidInvoices) {
        if (remainingPayment <= 0) break

        const invoiceBalance = Number.parseFloat(invoice.remaining_balance)
        const applicationAmount = Math.min(remainingPayment, invoiceBalance)

        // Record payment application
        await sql`
          INSERT INTO payment_applications (payment_id, invoice_id, amount_applied, created_at)
          VALUES (${paymentId}, ${invoice.id}, ${applicationAmount}, NOW())
        `

        // Update invoice amount_paid and status
        const newAmountPaid = Number.parseFloat(invoice.amount_paid || 0) + applicationAmount
        const invoiceAmount = Number.parseFloat(invoice.amount)

        let newStatus = "partial"
        if (newAmountPaid >= invoiceAmount) {
          newStatus = "paid"
        }

        await sql`
          UPDATE invoices 
          SET amount_paid = ${newAmountPaid}, 
              status = ${newStatus},
              payment_date = ${newStatus === "paid" ? sql`NOW()` : null}
          WHERE id = ${invoice.id}
        `

        applications.push({
          invoice_id: invoice.id,
          amount_applied: applicationAmount,
        })

        remainingPayment -= applicationAmount
      }

      // If there's remaining payment, create customer credit
      if (remainingPayment > 0) {
        await sql`
          INSERT INTO financial_adjustments (
            customer_id, adjustment_type, amount, reason, status, created_at
          ) VALUES (
            ${customerId}, 'credit', ${remainingPayment}, 
            ${`Overpayment credit from payment ID ${paymentId}`}, 'approved', NOW()
          )
        `
      }

      // Update account balance
      const updateResult = await sql`
        UPDATE account_balances 
        SET balance = balance + ${paymentAmount},
            last_payment_date = NOW(),
            updated_at = NOW()
        WHERE customer_id = ${customerId}
        RETURNING balance
      `

      console.log("[v0] Updated account balance:", updateResult[0]?.balance)

      return { applications, overpayment: remainingPayment, newBalance: updateResult[0]?.balance }
    } catch (error) {
      console.error("[v0] Error applying payment to invoices:", error)
      throw error
    }
  }
}

export interface PaymentGatewayInterface {
  processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse>
  verifyPayment(transaction_id: string): Promise<boolean>
  refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse>
}

export class MpesaGateway implements PaymentGatewayInterface {
  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      // Get M-Pesa configuration
      const [config] = await sql`
        SELECT * FROM payment_gateway_configs LIMIT 1
      `

      if (!config?.enable_mpesa) {
        throw new Error("M-Pesa gateway is disabled")
      }

      // Simulate STK Push (replace with actual Daraja API call)
      const checkoutRequestId = `ws_CO_${Date.now()}`

      // Log M-Pesa transaction
      await sql`
        INSERT INTO mpesa_transactions (
          payment_id,
          checkout_request_id,
          amount,
          phone_number,
          account_reference,
          transaction_desc,
          status
        )
        VALUES (
          ${request.payment_id},
          ${checkoutRequestId},
          ${request.amount},
          ${request.metadata?.phone_number},
          ${request.reference},
          ${request.description},
          'pending'
        )
      `

      return {
        success: true,
        transaction_id: checkoutRequestId,
        message: "STK Push sent successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "M-Pesa processing failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    const [transaction] = await sql`
      SELECT status FROM mpesa_transactions 
      WHERE checkout_request_id = ${transaction_id} OR transaction_id = ${transaction_id}
    `

    return transaction?.status === "completed"
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    // Implement M-Pesa refund logic
    return {
      success: false,
      error: "M-Pesa refunds not implemented yet",
    }
  }
}

export class CashGateway implements PaymentGatewayInterface {
  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      const transactionId = `CASH-${Date.now()}-${request.payment_id}`

      await sql`
        INSERT INTO cash_transactions (
          payment_id,
          transaction_id,
          amount,
          received_by,
          notes,
          status,
          created_at
        )
        VALUES (
          ${request.payment_id},
          ${transactionId},
          ${request.amount},
          ${request.metadata?.received_by || "system"},
          ${request.metadata?.notes || "Cash payment received"},
          'completed',
          NOW()
        )
        ON CONFLICT (payment_id) DO UPDATE SET
          transaction_id = EXCLUDED.transaction_id,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          updated_at = NOW()
      `

      return {
        success: true,
        transaction_id: transactionId,
        message: "Cash payment processed successfully",
      }
    } catch (error) {
      console.error("Cash payment processing error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cash payment processing failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    const [transaction] = await sql`
      SELECT status FROM cash_transactions 
      WHERE transaction_id = ${transaction_id}
    `

    return transaction?.status === "completed"
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    // Cash refunds require manual processing
    return {
      success: false,
      error: "Cash refunds require manual processing",
    }
  }
}

export class CardGateway implements PaymentGatewayInterface {
  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      // For now, simulate card payment processing
      // In production, integrate with Stripe, Flutterwave, or other card processors
      const transactionId = `CARD-${Date.now()}-${request.payment_id}`

      console.log("[v0] Processing card payment:", {
        payment_id: request.payment_id,
        amount: request.amount,
        currency: request.currency,
      })

      // Simulate card processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // For demo purposes, assume all card payments succeed
      // In production, this would call actual payment processor APIs
      await sql`
        INSERT INTO card_transactions (
          payment_id,
          transaction_id,
          amount,
          currency,
          card_last_four,
          processor,
          status,
          created_at
        )
        VALUES (
          ${request.payment_id},
          ${transactionId},
          ${request.amount},
          ${request.currency || "KES"},
          ${request.metadata?.card_last_four || "****"},
          'demo',
          'completed',
          NOW()
        )
        ON CONFLICT (payment_id) DO UPDATE SET
          transaction_id = EXCLUDED.transaction_id,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          updated_at = NOW()
      `

      return {
        success: true,
        transaction_id: transactionId,
        message: "Card payment processed successfully",
      }
    } catch (error) {
      console.error("Card payment processing error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Card payment processing failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    const [transaction] = await sql`
      SELECT status FROM card_transactions 
      WHERE transaction_id = ${transaction_id}
    `

    return transaction?.status === "completed"
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    // Card refunds would integrate with payment processor
    return {
      success: false,
      error: "Card refunds not implemented yet",
    }
  }
}

export class BankTransferGateway implements PaymentGatewayInterface {
  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      const transactionId = `BANK-${Date.now()}-${request.payment_id}`

      console.log("[v0] Processing bank transfer payment:", {
        payment_id: request.payment_id,
        amount: request.amount,
        currency: request.currency,
      })

      // Create bank transfer transaction record
      await sql`
        INSERT INTO bank_transactions (
          payment_id,
          transaction_id,
          amount,
          currency,
          bank_reference,
          account_number,
          status,
          created_at
        )
        VALUES (
          ${request.payment_id},
          ${transactionId},
          ${request.amount},
          ${request.currency || "KES"},
          ${request.metadata?.bank_reference || transactionId},
          ${request.metadata?.account_number || "N/A"},
          'completed',
          NOW()
        )
        ON CONFLICT (payment_id) DO UPDATE SET
          transaction_id = EXCLUDED.transaction_id,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          updated_at = NOW()
      `

      return {
        success: true,
        transaction_id: transactionId,
        message: "Bank transfer payment processed successfully",
      }
    } catch (error) {
      console.error("Bank transfer payment processing error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bank transfer payment processing failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    const [transaction] = await sql`
      SELECT status FROM bank_transactions 
      WHERE transaction_id = ${transaction_id}
    `

    return transaction?.status === "completed"
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    return {
      success: false,
      error: "Bank transfer refunds require manual processing",
    }
  }
}

export const paymentGateway = UnifiedPaymentGateway.getInstance()
paymentGateway.registerGateway("mpesa", new MpesaGateway())
paymentGateway.registerGateway("cash", new CashGateway())
paymentGateway.registerGateway("card", new CardGateway())
paymentGateway.registerGateway("bank", new BankTransferGateway())

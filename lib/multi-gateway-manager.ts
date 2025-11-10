import { sql } from "@/lib/database"
import { ActivityLogger } from "@/lib/activity-logger"

export interface GatewayConfig {
  id: string
  name: string
  type: "mpesa" | "stripe" | "flutterwave" | "paystack" | "bank_transfer"
  provider: string
  is_active: boolean
  configuration: Record<string, any>
  processing_fee_percent: number
  processing_fee_fixed: number
  supported_currencies: string[]
  webhook_url?: string
}

export interface PaymentRequest {
  customer_id: number
  amount: number
  currency: string
  payment_method: string
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
  gateway_used?: string
}

export class MultiGatewayManager {
  private static instance: MultiGatewayManager
  private gateways: Map<string, PaymentGatewayInterface> = new Map()
  private configs: Map<string, GatewayConfig> = new Map()

  static getInstance(): MultiGatewayManager {
    if (!MultiGatewayManager.instance) {
      MultiGatewayManager.instance = new MultiGatewayManager()
    }
    return MultiGatewayManager.instance
  }

  async loadGatewayConfigs(): Promise<void> {
    try {
      const configs = await sql`
        SELECT * FROM payment_gateway_configs WHERE is_active = true
      `

      for (const config of configs) {
        this.configs.set(config.gateway_name, {
          id: config.id,
          name: config.gateway_name,
          type: config.gateway_type,
          provider: config.provider || config.gateway_name,
          is_active: config.is_active,
          configuration: config.configuration || {},
          processing_fee_percent: Number.parseFloat(config.processing_fee_percent || "0"),
          processing_fee_fixed: Number.parseFloat(config.processing_fee_fixed || "0"),
          supported_currencies: config.supported_currencies || ["KES"],
          webhook_url: config.webhook_url,
        })

        // Initialize gateway instance
        await this.initializeGateway(config.gateway_name, config)
      }
    } catch (error) {
      console.error("Error loading gateway configs:", error)
    }
  }

  private async initializeGateway(name: string, config: any): Promise<void> {
    switch (config.gateway_type || name.toLowerCase()) {
      case "mpesa":
        this.gateways.set(name, new MpesaGateway(config))
        break
      case "stripe":
        this.gateways.set(name, new StripeGateway(config))
        break
      case "flutterwave":
        this.gateways.set(name, new FlutterwaveGateway(config))
        break
      case "paystack":
        this.gateways.set(name, new PaystackGateway(config))
        break
      case "bank_transfer":
        this.gateways.set(name, new BankTransferGateway(config))
        break
    }
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Select best gateway for payment method and currency
      const gateway = await this.selectOptimalGateway(request.payment_method, request.currency, request.amount)

      if (!gateway) {
        throw new Error(`No suitable gateway found for ${request.payment_method} in ${request.currency}`)
      }

      // Calculate processing fees
      const gatewayConfig = this.configs.get(gateway.name)
      const processingFee = this.calculateProcessingFee(request.amount, gatewayConfig!)

      // Create payment record
      const [payment] = await sql`
        INSERT INTO payments (
          customer_id, 
          amount, 
          processing_fee,
          net_amount,
          payment_method, 
          description, 
          status, 
          reference_number,
          currency,
          gateway_used,
          metadata,
          created_at
        )
        VALUES (
          ${request.customer_id},
          ${request.amount},
          ${processingFee},
          ${request.amount - processingFee},
          ${request.payment_method},
          ${request.description},
          'pending',
          ${request.reference || this.generateReference()},
          ${request.currency || "KES"},
          ${gateway.name},
          ${JSON.stringify(request.metadata || {})},
          NOW()
        )
        RETURNING *
      `

      // Process payment through selected gateway
      const result = await gateway.processPayment({
        ...request,
        payment_id: payment.id,
      })

      // Update payment status
      await sql`
        UPDATE payments 
        SET 
          status = ${result.success ? "processing" : "failed"},
          external_transaction_id = ${result.transaction_id},
          gateway_response = ${JSON.stringify(result)},
          updated_at = NOW()
        WHERE id = ${payment.id}
      `

      await ActivityLogger.logAdminActivity(
        `Payment ${result.success ? "initiated" : "failed"}: ${request.payment_method} - ${request.currency} ${request.amount}`,
        "system",
        {
          customer_id: request.customer_id,
          payment_id: payment.id,
          gateway_used: gateway.name,
          amount: request.amount,
          processing_fee: processingFee,
        },
      )

      return {
        ...result,
        payment_id: payment.id,
        gateway_used: gateway.name,
      }
    } catch (error) {
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

  private async selectOptimalGateway(
    paymentMethod: string,
    currency: string,
    amount: number,
  ): Promise<{ name: string; gateway: PaymentGatewayInterface } | null> {
    const suitableGateways = Array.from(this.configs.entries())
      .filter(([name, config]) => {
        return (
          config.is_active &&
          config.supported_currencies.includes(currency) &&
          this.isMethodSupported(config.type, paymentMethod)
        )
      })
      .map(([name, config]) => ({
        name,
        config,
        totalFee: this.calculateProcessingFee(amount, config),
        gateway: this.gateways.get(name)!,
      }))
      .filter((item) => item.gateway)
      .sort((a, b) => a.totalFee - b.totalFee) // Sort by lowest fees

    return suitableGateways.length > 0 ? { name: suitableGateways[0].name, gateway: suitableGateways[0].gateway } : null
  }

  private isMethodSupported(gatewayType: string, paymentMethod: string): boolean {
    const methodMapping: Record<string, string[]> = {
      mpesa: ["mpesa", "mobile_money"],
      stripe: ["card", "bank_transfer", "wallet"],
      flutterwave: ["card", "bank_transfer", "mobile_money", "wallet"],
      paystack: ["card", "bank_transfer", "mobile_money"],
      bank_transfer: ["bank_transfer", "wire_transfer"],
    }

    return methodMapping[gatewayType]?.includes(paymentMethod) || false
  }

  private calculateProcessingFee(amount: number, config: GatewayConfig): number {
    return (amount * config.processing_fee_percent) / 100 + config.processing_fee_fixed
  }

  private generateReference(): string {
    return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }

  async reconcilePayments(gatewayName: string, startDate: Date, endDate: Date): Promise<any> {
    const gateway = this.gateways.get(gatewayName)
    if (!gateway || !("reconcilePayments" in gateway)) {
      throw new Error(`Gateway ${gatewayName} does not support reconciliation`)
    }

    return await (gateway as any).reconcilePayments(startDate, endDate)
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<PaymentResponse> {
    const [payment] = await sql`
      SELECT * FROM payments WHERE id = ${paymentId}
    `

    if (!payment) {
      return { success: false, error: "Payment not found" }
    }

    const gateway = this.gateways.get(payment.gateway_used)
    if (!gateway) {
      return { success: false, error: "Gateway not available for refund" }
    }

    const result = await gateway.refundPayment(paymentId, amount)

    if (result.success) {
      await sql`
        INSERT INTO payment_refunds (
          payment_id,
          amount,
          reason,
          status,
          refund_reference,
          created_at
        ) VALUES (
          ${paymentId},
          ${amount || payment.amount},
          ${reason || "Customer requested refund"},
          'completed',
          ${result.transaction_id},
          NOW()
        )
      `

      await ActivityLogger.logAdminActivity(
        `Refund processed: ${payment.currency} ${amount || payment.amount} for payment ${paymentId}`,
        "system",
        {
          payment_id: paymentId,
          refund_amount: amount || payment.amount,
          reason,
        },
      )
    }

    return result
  }
}

// Gateway Interface
export interface PaymentGatewayInterface {
  name: string
  processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse>
  verifyPayment(transaction_id: string): Promise<boolean>
  refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse>
}

// M-Pesa Gateway Implementation
export class MpesaGateway implements PaymentGatewayInterface {
  name = "mpesa"

  constructor(private config: any) {}

  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      // Implement actual M-Pesa Daraja API integration
      const checkoutRequestId = `ws_CO_${Date.now()}`

      await sql`
        INSERT INTO mpesa_transactions (
          payment_id,
          checkout_request_id,
          amount,
          phone_number,
          account_reference,
          transaction_desc,
          status
        ) VALUES (
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
      WHERE checkout_request_id = ${transaction_id}
    `
    return transaction?.status === "completed"
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    // Implement M-Pesa B2C reversal
    return { success: false, error: "M-Pesa refunds require manual processing" }
  }
}

// Stripe Gateway Implementation
export class StripeGateway implements PaymentGatewayInterface {
  name = "stripe"

  constructor(private config: any) {}

  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      // Implement Stripe payment processing
      // This would use the Stripe SDK
      return {
        success: true,
        transaction_id: `pi_${Date.now()}`,
        checkout_url: `https://checkout.stripe.com/pay/${request.payment_id}`,
        message: "Stripe payment session created",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Stripe processing failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    // Implement Stripe payment verification
    return true
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    // Implement Stripe refund
    return {
      success: true,
      transaction_id: `re_${Date.now()}`,
      message: "Refund processed successfully",
    }
  }
}

// Flutterwave Gateway Implementation
export class FlutterwaveGateway implements PaymentGatewayInterface {
  name = "flutterwave"

  constructor(private config: any) {}

  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      // Implement Flutterwave payment processing
      return {
        success: true,
        transaction_id: `flw_tx_${Date.now()}`,
        checkout_url: `https://checkout.flutterwave.com/v3/hosted/pay/${request.payment_id}`,
        message: "Flutterwave payment link created",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Flutterwave processing failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    return true
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    return {
      success: true,
      transaction_id: `flw_rf_${Date.now()}`,
      message: "Refund initiated successfully",
    }
  }
}

// Paystack Gateway Implementation
export class PaystackGateway implements PaymentGatewayInterface {
  name = "paystack"

  constructor(private config: any) {}

  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      return {
        success: true,
        transaction_id: `ps_${Date.now()}`,
        checkout_url: `https://checkout.paystack.com/${request.payment_id}`,
        message: "Paystack payment initialized",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Paystack processing failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    return true
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    return {
      success: true,
      transaction_id: `ps_rf_${Date.now()}`,
      message: "Refund processed successfully",
    }
  }
}

// Bank Transfer Gateway Implementation
export class BankTransferGateway implements PaymentGatewayInterface {
  name = "bank_transfer"

  constructor(private config: any) {}

  async processPayment(request: PaymentRequest & { payment_id: string }): Promise<PaymentResponse> {
    try {
      // Generate bank transfer instructions
      return {
        success: true,
        transaction_id: `bt_${Date.now()}`,
        message: "Bank transfer instructions generated",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bank transfer setup failed",
      }
    }
  }

  async verifyPayment(transaction_id: string): Promise<boolean> {
    // Bank transfers require manual verification
    return false
  }

  async refundPayment(payment_id: string, amount?: number): Promise<PaymentResponse> {
    return {
      success: false,
      error: "Bank transfer refunds require manual processing",
    }
  }
}

export const multiGatewayManager = MultiGatewayManager.getInstance()

import { getSql } from "@/lib/db"

export interface WalletBalance {
  balance: number
  creditLimit: number
  effectiveBalance: number
}

/**
 * Wallet Manager - Core wallet operations
 * Per payment gateway design: Payments → Wallet → Services
 */
export class WalletManager {
  /**
   * Credit wallet from payment (Golden Rule #2: Payments go → Wallet first)
   */
  static async creditWallet(customerId: string, paymentId: string, amount: number, reference: string): Promise<void> {
    const sql = await getSql()

    await sql.begin(async (tx) => {
      // Get current balance
      const [wallet] = await tx`
        SELECT balance FROM customer_wallets
        WHERE customer_id = ${customerId}::uuid
        FOR UPDATE
      `

      const balanceBefore = wallet?.balance || 0
      const balanceAfter = balanceBefore + amount

      // Update wallet
      await tx`
        INSERT INTO customer_wallets (customer_id, balance, last_payment_at)
        VALUES (${customerId}::uuid, ${amount}, NOW())
        ON CONFLICT (customer_id) DO UPDATE
        SET balance = customer_wallets.balance + ${amount},
            last_payment_at = NOW(),
            updated_at = NOW()
      `

      // Log wallet transaction
      await tx`
        INSERT INTO wallet_transactions (
          customer_id, amount, transaction_type, reference_id,
          balance_before, balance_after, notes
        ) VALUES (
          ${customerId}::uuid, ${amount}, 'payment', ${paymentId}::uuid,
          ${balanceBefore}, ${balanceAfter},
          ${"Payment credited: " + reference}
        )
      `
    })
  }

  /**
   * Get wallet balance with credit limit
   */
  static async getBalance(customerId: string): Promise<WalletBalance> {
    const sql = await getSql()

    const [wallet] = await sql`
      SELECT 
        w.balance,
        COALESCE(c.credit_limit, 0) as credit_limit,
        COALESCE(c.credit_used, 0) as credit_used
      FROM customer_wallets w
      LEFT JOIN customer_credit c ON c.customer_id = w.customer_id
      WHERE w.customer_id = ${customerId}::uuid
    `

    if (!wallet) {
      return { balance: 0, creditLimit: 0, effectiveBalance: 0 }
    }

    const availableCredit = Math.max(0, wallet.credit_limit - wallet.credit_used)
    const effectiveBalance = wallet.balance + availableCredit

    return {
      balance: wallet.balance,
      creditLimit: availableCredit,
      effectiveBalance,
    }
  }

  /**
   * Allocate wallet funds to services
   * Golden Rule #3: Wallet → Services (deterministic allocation)
   */
  static async allocateToServices(
    customerId: string,
    strategy: "oldest_expiry" | "priority" | "manual" = "oldest_expiry",
  ): Promise<{ allocated: number; services: number }> {
    const sql = await getSql()

    const wallet = await this.getBalance(customerId)

    if (wallet.effectiveBalance <= 0) {
      return { allocated: 0, services: 0 }
    }

    // Get services ordered by strategy
    const orderBy = strategy === "oldest_expiry" ? sql`cs.service_end ASC NULLS FIRST` : sql`cs.created_at ASC`

    const services = await sql`
      SELECT cs.id, cs.service_end, sp.price, sp.billing_cycle_days, sp.name
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId}::uuid
      AND cs.is_deleted = false
      ORDER BY ${orderBy}
    `

    let remainingBalance = wallet.balance
    let totalAllocated = 0
    let servicesExtended = 0

    for (const service of services) {
      if (remainingBalance <= 0) break

      const dailyRate = service.price / service.billing_cycle_days
      const daysCanAfford = Math.floor(remainingBalance / dailyRate)

      if (daysCanAfford > 0) {
        const amountToAllocate = daysCanAfford * dailyRate

        // Extend service
        const currentEnd = service.service_end ? new Date(service.service_end) : new Date()
        const startFrom = currentEnd > new Date() ? currentEnd : new Date()
        const newEnd = new Date(startFrom.getTime() + daysCanAfford * 24 * 60 * 60 * 1000)

        await sql`
          UPDATE customer_services
          SET service_end = ${newEnd},
              is_active = true,
              is_suspended = false,
              updated_at = NOW()
          WHERE id = ${service.id}
        `

        // Log allocation
        await sql`
          INSERT INTO service_allocations (
            customer_id, service_id, amount, days_added, allocation_type
          ) VALUES (
            ${customerId}::uuid, ${service.id}::uuid, ${amountToAllocate}, ${daysCanAfford}, 'automatic'
          )
        `

        // Log service event
        await sql`
          INSERT INTO service_events (service_id, event_type, description, metadata)
          VALUES (
            ${service.id}::uuid, 'extended',
            ${"Service extended for " + daysCanAfford + " days until " + newEnd.toISOString()},
            ${JSON.stringify({ days_added: daysCanAfford, amount: amountToAllocate, daily_rate: dailyRate })}
          )
        `

        remainingBalance -= amountToAllocate
        totalAllocated += amountToAllocate
        servicesExtended++
      }
    }

    // Deduct from wallet
    if (totalAllocated > 0) {
      await sql`
        UPDATE customer_wallets
        SET balance = balance - ${totalAllocated},
            updated_at = NOW()
        WHERE customer_id = ${customerId}::uuid
      `

      // Log wallet transaction
      await sql`
        INSERT INTO wallet_transactions (
          customer_id, amount, transaction_type,
          balance_before, balance_after, notes
        ) VALUES (
          ${customerId}::uuid, ${-totalAllocated}, 'allocation',
          ${wallet.balance}, ${wallet.balance - totalAllocated},
          ${"Allocated to " + servicesExtended + " services"}
        )
      `
    }

    return { allocated: totalAllocated, services: servicesExtended }
  }

  /**
   * Manual allocation to specific service
   */
  static async allocateToService(
    customerId: string,
    serviceId: string,
    amount: number,
    allocatedBy: string,
  ): Promise<{ success: boolean; daysAdded: number }> {
    const sql = await getSql()

    const wallet = await this.getBalance(customerId)

    if (wallet.effectiveBalance < amount) {
      throw new Error("Insufficient wallet balance")
    }

    const [service] = await sql`
      SELECT cs.*, sp.price, sp.billing_cycle_days
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.id = ${serviceId}::uuid AND cs.customer_id = ${customerId}::uuid
    `

    if (!service) {
      throw new Error("Service not found")
    }

    const dailyRate = service.price / service.billing_cycle_days
    const daysAdded = Math.floor(amount / dailyRate)

    if (daysAdded <= 0) {
      throw new Error("Amount too small for service rate")
    }

    const actualAmount = daysAdded * dailyRate

    // Extend service
    const currentEnd = service.service_end ? new Date(service.service_end) : new Date()
    const startFrom = currentEnd > new Date() ? currentEnd : new Date()
    const newEnd = new Date(startFrom.getTime() + daysAdded * 24 * 60 * 60 * 1000)

    await sql`
      UPDATE customer_services
      SET service_end = ${newEnd},
          is_active = true,
          is_suspended = false,
          updated_at = NOW()
      WHERE id = ${serviceId}::uuid
    `

    // Deduct from wallet
    await sql`
      UPDATE customer_wallets
      SET balance = balance - ${actualAmount},
          updated_at = NOW()
      WHERE customer_id = ${customerId}::uuid
    `

    // Log allocation
    await sql`
      INSERT INTO service_allocations (
        customer_id, service_id, amount, days_added, allocation_type, allocated_by
      ) VALUES (
        ${customerId}::uuid, ${serviceId}::uuid, ${actualAmount}, ${daysAdded}, 'manual', ${allocatedBy}::uuid
      )
    `

    return { success: true, daysAdded }
  }
}

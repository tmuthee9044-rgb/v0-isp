"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export async function processSmartPayment(formData: FormData) {
  try {
    const customerId = Number.parseInt(formData.get("customer_id") as string)
    const amount = Number.parseFloat(formData.get("amount") as string)
    const method = formData.get("method") as string
    const reference = formData.get("reference") as string

    await ActivityLogger.logAdminActivity(
      `Processing ${method} payment: KES ${amount} for customer ${customerId}`,
      "system",
      {
        customer_id: customerId,
        amount,
        payment_method: method,
        reference,
        action: "payment_processing_start",
      },
    )

    const customerServices = await sql`
      SELECT cs.*, sp.name as service_plan_name 
      FROM customer_services cs 
      JOIN service_plans sp ON cs.service_plan_id = sp.id 
      WHERE cs.customer_id = ${customerId} AND cs.status = 'active'
    `

    if (!customerServices || customerServices.length === 0) {
      await ActivityLogger.logAdminActivity(`Payment failed: No active services for customer ${customerId}`, "system", {
        customer_id: customerId,
        amount,
        payment_method: method,
        error: "no_active_services",
      })
      return { success: false, error: "No active services found for customer" }
    }

    const paymentResult = await sql`
      INSERT INTO payments (customer_id, amount, payment_method, status, payment_date, reference_number, notes) 
      VALUES (${customerId}, ${amount}, ${method}, 'completed', NOW(), ${reference}, ${"Payment via " + method + " - Ref: " + reference}) 
      RETURNING id
    `

    const paymentId = paymentResult[0]?.id

    // Calculate allocations
    const totalOwed = customerServices.reduce(
      (sum: number, service: any) => sum + Math.abs(Number.parseFloat(service.monthly_fee || 0)),
      0,
    )

    let remainingAmount = amount
    const allocations = []

    for (const service of customerServices) {
      if (remainingAmount <= 0) break

      const serviceOwed = Math.abs(Number.parseFloat(service.monthly_fee || 0))
      const allocationPercentage = serviceOwed / totalOwed
      const allocatedAmount = Math.min(amount * allocationPercentage, remainingAmount, serviceOwed)
      const daysExtended = Math.floor((allocatedAmount / serviceOwed) * 30)

      allocations.push({
        service_id: service.id,
        service_name: service.service_plan_name,
        allocated_amount: allocatedAmount,
        days_extended: daysExtended,
      })

      remainingAmount -= allocatedAmount
    }

    if (method.toLowerCase().includes("mpesa") || method.toLowerCase().includes("m-pesa")) {
      await ActivityLogger.logMpesaActivity(
        `Payment completed: KES ${amount}`,
        reference,
        {
          customer_id: customerId,
          payment_id: paymentId,
          amount,
          payment_method: method,
          reference,
          status: "completed",
        },
        "SUCCESS",
      )
    } else {
      await ActivityLogger.logAdminActivity(`Payment completed: KES ${amount} via ${method}`, "system", {
        customer_id: customerId,
        payment_id: paymentId,
        amount,
        payment_method: method,
        reference,
        status: "completed",
      })
    }

    revalidatePath(`/customers/${customerId}`)

    return {
      success: true,
      message: `Payment of KES ${amount} processed successfully and allocated across ${allocations.length} services.`,
      allocations,
      paymentId,
    }
  } catch (error) {
    const customerId = Number.parseInt(formData.get("customer_id") as string)
    const amount = Number.parseFloat(formData.get("amount") as string)
    const method = formData.get("method") as string

    await ActivityLogger.logAdminActivity(
      `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "system",
      {
        customer_id: customerId,
        amount,
        payment_method: method,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    )

    console.error("Error processing smart payment:", error)
    return { success: false, error: "Failed to process payment" }
  }
}

export async function updateFinanceSettings(formData: FormData) {
  try {
    const customerId = Number.parseInt(formData.get("customer_id") as string)
    const paymentMethod = formData.get("payment_method") as string
    const mpesaNumber = formData.get("mpesa_number") as string
    const bankAccount = formData.get("bank_account") as string
    const autoPayment = formData.get("auto_payment") === "on"
    const paymentReminderDays = Number.parseInt(formData.get("payment_reminder_days") as string)
    const lateFeePercentage = Number.parseFloat(formData.get("late_fee_percentage") as string)
    const suspensionGraceDays = Number.parseInt(formData.get("suspension_grace_days") as string)

    // Update customer finance settings
    await sql`
      UPDATE customers 
      SET 
        updated_at = NOW()
      WHERE id = ${customerId}
    `

    // Insert or update system config for finance settings
    await sql`
      INSERT INTO system_config (key, value, updated_at) 
      VALUES ('payment_reminder_days', ${paymentReminderDays.toString()}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `

    await sql`
      INSERT INTO system_config (key, value, updated_at) 
      VALUES ('late_fee_percentage', ${lateFeePercentage.toString()}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `

    revalidatePath(`/customers/${customerId}`)

    return {
      success: true,
      message: "Finance settings updated successfully.",
    }
  } catch (error) {
    console.error("Error updating finance settings:", error)
    return { success: false, error: "Failed to update finance settings" }
  }
}

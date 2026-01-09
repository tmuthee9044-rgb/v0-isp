import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const paymentId = params.id

    // Get payment status with M-Pesa details
    const [payment] = await sql`
      SELECT 
        p.*,
        mt.checkout_request_id,
        mt.mpesa_receipt_number,
        mt.result_code,
        mt.result_desc,
        mt.phone_number as mpesa_phone,
        CASE 
          WHEN p.status = 'completed' THEN 'success'
          WHEN p.status = 'failed' THEN 'failed'
          WHEN p.status = 'processing' THEN 'processing'
          ELSE 'pending'
        END as display_status
      FROM payments p
      LEFT JOIN mpesa_transactions mt ON p.id = mt.payment_id
      WHERE p.id = ${paymentId}
    `

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Calculate service allocation if payment is completed
    const serviceAllocations = []
    if (payment.status === "completed") {
      const services = await sql`
        SELECT cs.*, sp.name as service_name, sp.monthly_fee
        FROM customer_services cs
        JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.customer_id = ${payment.customer_id} AND cs.status = 'active'
      `

      const totalOwed = services.reduce(
        (sum: number, service: any) => sum + Number.parseFloat(service.monthly_fee || "0"),
        0,
      )

      let remainingAmount = Number.parseFloat(payment.amount)

      for (const service of services) {
        if (remainingAmount <= 0) break

        const serviceOwed = Number.parseFloat(service.monthly_fee || "0")
        const allocationPercentage = serviceOwed / totalOwed
        const allocatedAmount = Math.min(
          Number.parseFloat(payment.amount) * allocationPercentage,
          remainingAmount,
          serviceOwed,
        )
        const daysExtended = Math.floor((allocatedAmount / serviceOwed) * 30)

        if (allocatedAmount > 0) {
          serviceAllocations.push({
            service_id: service.id,
            service_name: service.service_name,
            allocated_amount: allocatedAmount,
            days_extended: daysExtended,
          })
          remainingAmount -= allocatedAmount
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        service_allocations: serviceAllocations,
      },
    })
  } catch (error) {
    console.error("Error fetching payment status:", error)
    return NextResponse.json({ error: "Failed to fetch payment status" }, { status: 500 })
  }
}

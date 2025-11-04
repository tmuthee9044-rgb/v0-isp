import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { phone_number, amount } = await request.json()

    // Validate input
    if (!phone_number || !amount || amount <= 0) {
      return NextResponse.json({ error: "Phone number and valid amount are required" }, { status: 400 })
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone_number.replace(/\D/g, "")
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1)
    } else if (formattedPhone.startsWith("7") || formattedPhone.startsWith("1")) {
      formattedPhone = "254" + formattedPhone
    }

    // Get customer details
    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Create payment record
    const [payment] = await sql`
      INSERT INTO payments (
        customer_id, 
        amount, 
        payment_method, 
        description, 
        status, 
        currency,
        reference_number
      )
      VALUES (
        ${customerId},
        ${amount},
        'mpesa',
        ${"M-Pesa payment for " + customer.first_name + " " + customer.last_name},
        'pending',
        'KES',
        ${"PAY-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase()}
      )
      RETURNING *
    `

    // Generate checkout request ID
    const checkoutRequestId = `ws_CO_${Date.now()}_${customerId}`

    // Create M-Pesa transaction record
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
        ${payment.id},
        ${checkoutRequestId},
        ${amount},
        ${formattedPhone},
        ${payment.reference_number},
        ${"Payment for customer " + customerId},
        'pending'
      )
    `

    // In production, this would integrate with actual Daraja API
    setTimeout(async () => {
      try {
        // Update payment status to completed
        await sql`
          UPDATE payments 
          SET status = 'completed', 
              completed_at = NOW(),
              mpesa_receipt_number = ${"MP" + Date.now()}
          WHERE id = ${payment.id}
        `

        // Update M-Pesa transaction
        await sql`
          UPDATE mpesa_transactions 
          SET status = 'completed',
              result_code = '0',
              result_desc = 'The service request is processed successfully.',
              mpesa_receipt_number = ${"MP" + Date.now()}
          WHERE payment_id = ${payment.id}
        `

        // Credit customer account balance
        await sql`
          UPDATE customers 
          SET balance = balance + ${amount},
              last_payment_date = NOW()
          WHERE id = ${customerId}
        `

        // Log the activity
        await ActivityLogger.logMpesaActivity(
          `Payment completed: KES ${amount} credited to customer ${customerId}`,
          checkoutRequestId,
          {
            customer_id: customerId,
            payment_id: payment.id,
            amount,
            phone_number: formattedPhone,
          },
          "SUCCESS",
        )
      } catch (error) {
        console.error("Error completing payment:", error)
      }
    }, 5000) // Simulate 5 second processing time

    await ActivityLogger.logMpesaActivity(
      `STK Push initiated: KES ${amount} to ${formattedPhone}`,
      checkoutRequestId,
      {
        customer_id: customerId,
        payment_id: payment.id,
        amount,
        phone_number: formattedPhone,
      },
      "INFO",
    )

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      checkout_request_id: checkoutRequestId,
      message: "STK Push sent successfully. Please check your phone.",
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
    })
  } catch (error) {
    console.error("M-Pesa STK Push error:", error)
    return NextResponse.json({ error: "Failed to initiate M-Pesa payment" }, { status: 500 })
  }
}

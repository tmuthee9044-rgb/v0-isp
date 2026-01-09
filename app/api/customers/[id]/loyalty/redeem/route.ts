import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { loyaltyNotificationService } from "@/lib/loyalty-notification-service"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { redemptionType, pointsToRedeem, description } = await request.json()

    if (!redemptionType || !pointsToRedeem || pointsToRedeem <= 0) {
      return NextResponse.json({ error: "Invalid redemption parameters" }, { status: 400 })
    }

    // Start transaction
    await sql`BEGIN`

    try {
      // Check customer's current loyalty points
      const customer = await sql`
        SELECT loyalty_points
        FROM customers
        WHERE id = ${customerId}
      `

      if (customer.length === 0) {
        throw new Error("Customer not found")
      }

      const currentPoints = customer[0].loyalty_points || 0
      if (currentPoints < pointsToRedeem) {
        throw new Error("Insufficient loyalty points")
      }

      let redemptionValue = 0
      let walletCreditAmount = 0

      // Calculate redemption value based on type
      switch (redemptionType) {
        case "wallet_credit":
          redemptionValue = pointsToRedeem / 100 // 100 points = 1 currency unit
          walletCreditAmount = redemptionValue
          break
        case "service_discount":
          redemptionValue = pointsToRedeem / 50 // 50 points = 1 currency unit discount
          break
        case "bandwidth_days":
          redemptionValue = pointsToRedeem / 200 // 200 points = 1 extra day
          break
        default:
          throw new Error("Invalid redemption type")
      }

      // Create loyalty redemption record
      const redemption = await sql`
        INSERT INTO loyalty_redemptions (
          customer_id, points_redeemed, redemption_type, redemption_value,
          description, wallet_credit_amount, status
        ) VALUES (
          ${customerId}, ${pointsToRedeem}, ${redemptionType}, ${redemptionValue},
          ${description || `Redeemed ${pointsToRedeem} points for ${redemptionType}`},
          ${walletCreditAmount}, 'completed'
        )
        RETURNING id
      `

      // Create loyalty transaction record
      await sql`
        INSERT INTO loyalty_transactions (
          customer_id, points, transaction_type, source_type, source_id, description, metadata
        ) VALUES (
          ${customerId}, ${-pointsToRedeem}, 'redeem', '${redemptionType}_redemption', 
          ${redemption[0].id}, ${description || `Redeemed points for ${redemptionType}`},
          ${JSON.stringify({ redemptionType, redemptionValue, walletCreditAmount })}
        )
      `

      // Update customer loyalty points
      await sql`
        UPDATE customers
        SET loyalty_points = loyalty_points - ${pointsToRedeem}
        WHERE id = ${customerId}
      `

      // If wallet credit redemption, add to wallet balance
      if (redemptionType === "wallet_credit" && walletCreditAmount > 0) {
        // Get current wallet balance
        const currentBalance = await sql`
          SELECT current_balance
          FROM wallet_balances
          WHERE customer_id = ${customerId}
        `

        const balanceBefore = currentBalance[0]?.current_balance || 0
        const balanceAfter = Number.parseFloat(balanceBefore) + walletCreditAmount

        // Add wallet transaction
        await sql`
          INSERT INTO wallet_transactions (
            customer_id, amount, transaction_type, source_type, source_id, description,
            balance_before, balance_after, metadata
          ) VALUES (
            ${customerId}, ${walletCreditAmount}, 'bonus', 'loyalty_redemption', 
            ${redemption[0].id}, 'Wallet credit from loyalty points redemption',
            ${balanceBefore}, ${balanceAfter},
            ${JSON.stringify({ pointsRedeemed: pointsToRedeem, redemptionRate: pointsToRedeem / walletCreditAmount })}
          )
        `

        // Update wallet balance
        await sql`
          UPDATE wallet_balances
          SET 
            current_balance = ${balanceAfter},
            total_bonuses = total_bonuses + ${walletCreditAmount},
            last_transaction_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = ${customerId}
        `
      }

      await sql`COMMIT`

      try {
        // Get customer details for notifications
        const customerDetails = await sql`
          SELECT name, phone, email, loyalty_points
          FROM customers
          WHERE id = ${customerId}
        `

        if (customerDetails.length > 0) {
          const customer = customerDetails[0]
          const remainingPoints = currentPoints - pointsToRedeem

          await loyaltyNotificationService.sendPointsRedeemedNotification({
            customerId: customerId.toString(),
            customerName: customer.name,
            customerPhone: customer.phone,
            pointsRedeemed: pointsToRedeem,
            remainingPoints,
            redemptionType,
            redemptionValue,
          })
        }
      } catch (notificationError) {
        console.error("Failed to send redemption notification:", notificationError)
        // Don't fail the transaction if notifications fail
      }

      return NextResponse.json({
        success: true,
        redemption: {
          id: redemption[0].id,
          pointsRedeemed: pointsToRedeem,
          redemptionType,
          redemptionValue,
          walletCreditAmount,
          remainingPoints: currentPoints - pointsToRedeem,
        },
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error processing loyalty redemption:", error)
    return NextResponse.json({ error: error.message || "Failed to process loyalty redemption" }, { status: 500 })
  }
}

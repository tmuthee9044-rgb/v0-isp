import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { loyaltyNotificationService } from "@/lib/loyalty-notification-service"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { amount, paymentMethod, referenceNumber } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Start transaction
    await sql`BEGIN`

    try {
      // Get current wallet balance
      const currentBalance = await sql`
        SELECT current_balance
        FROM wallet_balances
        WHERE customer_id = ${customerId}
      `

      const balanceBefore = currentBalance[0]?.current_balance || 0

      // Calculate bonus amount using database function
      const bonusResult = await sql`
        SELECT calculate_bonus_amount(${customerId}, ${amount}) as bonus_amount
      `
      const bonusAmount = bonusResult[0].bonus_amount || 0

      // Calculate loyalty points using database function
      const pointsResult = await sql`
        SELECT calculate_loyalty_points(${customerId}, ${amount}, 'topup') as points_earned
      `
      const pointsEarned = pointsResult[0].points_earned || 0

      const totalCredit = Number.parseFloat(amount) + Number.parseFloat(bonusAmount)
      const balanceAfter = Number.parseFloat(balanceBefore) + totalCredit

      // Insert main topup transaction
      const topupTransaction = await sql`
        INSERT INTO wallet_transactions (
          customer_id, amount, transaction_type, source_type, description,
          balance_before, balance_after, reference_number, metadata
        ) VALUES (
          ${customerId}, ${amount}, 'topup', 'payment', 
          'Wallet top-up via ${paymentMethod}',
          ${balanceBefore}, ${Number.parseFloat(balanceBefore) + Number.parseFloat(amount)}, 
          ${referenceNumber},
          ${JSON.stringify({ paymentMethod, originalAmount: amount })}
        )
        RETURNING id
      `

      // Insert bonus transaction if applicable
      if (bonusAmount > 0) {
        await sql`
          INSERT INTO wallet_transactions (
            customer_id, amount, transaction_type, source_type, description,
            balance_before, balance_after, reference_number, metadata
          ) VALUES (
            ${customerId}, ${bonusAmount}, 'bonus', 'bonus_rule',
            'Bonus credit for top-up of ${amount}',
            ${Number.parseFloat(balanceBefore) + Number.parseFloat(amount)}, ${balanceAfter},
            ${referenceNumber + "-BONUS"},
            ${JSON.stringify({ bonusPercentage: (bonusAmount / amount) * 100, baseAmount: amount })}
          )
        `
      }

      // Award loyalty points
      if (pointsEarned > 0) {
        await sql`
          INSERT INTO loyalty_transactions (
            customer_id, points, transaction_type, source_type, source_id, description, metadata
          ) VALUES (
            ${customerId}, ${pointsEarned}, 'earn', 'topup', ${topupTransaction[0].id},
            'Loyalty points earned for wallet top-up',
            ${JSON.stringify({ topupAmount: amount, bonusAmount })}
          )
        `

        // Update customer loyalty points
        await sql`
          UPDATE customers 
          SET loyalty_points = COALESCE(loyalty_points, 0) + ${pointsEarned}
          WHERE id = ${customerId}
        `
      }

      // Update wallet balance
      await sql`
        UPDATE wallet_balances
        SET 
          current_balance = ${balanceAfter},
          total_topups = total_topups + ${amount},
          total_bonuses = total_bonuses + ${bonusAmount},
          last_topup_date = CURRENT_TIMESTAMP,
          last_transaction_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = ${customerId}
      `

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

          // Send points earned notification
          if (pointsEarned > 0) {
            await loyaltyNotificationService.sendPointsEarnedNotification({
              customerId: customerId.toString(),
              customerName: customer.name,
              customerPhone: customer.phone,
              pointsEarned,
              totalPoints: customer.loyalty_points,
              source: `wallet top-up of KES ${amount}`,
            })
          }

          // Send bonus credited notification
          if (bonusAmount > 0) {
            await loyaltyNotificationService.sendBonusCreditedNotification({
              customerId: customerId.toString(),
              customerName: customer.name,
              customerPhone: customer.phone,
              bonusAmount: Number.parseFloat(bonusAmount),
              newWalletBalance: balanceAfter,
              source: `${((bonusAmount / amount) * 100).toFixed(1)}% top-up bonus`,
            })
          }
        }
      } catch (notificationError) {
        console.error("Failed to send loyalty notifications:", notificationError)
        // Don't fail the transaction if notifications fail
      }

      return NextResponse.json({
        success: true,
        transaction: {
          amount: Number.parseFloat(amount),
          bonusAmount: Number.parseFloat(bonusAmount),
          totalCredit: totalCredit,
          pointsEarned,
          newBalance: balanceAfter,
          referenceNumber,
        },
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error processing wallet topup:", error)
    return NextResponse.json({ error: "Failed to process wallet topup" }, { status: 500 })
  }
}

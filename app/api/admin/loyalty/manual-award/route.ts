import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, points, wallet_credit, reason, admin_user } = body

    await sql`BEGIN`

    try {
      // Award loyalty points if specified
      if (points && points > 0) {
        await sql`
          UPDATE customers 
          SET loyalty_points = loyalty_points + ${points}
          WHERE id = ${customer_id}
        `

        await sql`
          INSERT INTO loyalty_transactions (
            customer_id,
            points,
            type,
            description,
            reference_type,
            reference_id
          ) VALUES (
            ${customer_id},
            ${points},
            'earn',
            ${`Manual award by admin: ${reason}`},
            'admin_award',
            ${admin_user}
          )
        `
      }

      // Award wallet credit if specified
      if (wallet_credit && wallet_credit > 0) {
        await sql`
          INSERT INTO wallet_transactions (
            customer_id,
            amount,
            type,
            description,
            reference_type,
            reference_id,
            status
          ) VALUES (
            ${customer_id},
            ${wallet_credit},
            'bonus',
            ${`Manual credit by admin: ${reason}`},
            'admin_award',
            ${admin_user},
            'completed'
          )
        `
      }

      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        message: "Manual award processed successfully",
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Failed to process manual award:", error)
    return NextResponse.json({ success: false, error: "Failed to process manual award" }, { status: 500 })
  }
}

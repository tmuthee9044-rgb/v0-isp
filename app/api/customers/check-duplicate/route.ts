import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const phone = searchParams.get("phone")

    if (!email && !phone) {
      return NextResponse.json({ error: "Email or phone parameter required" }, { status: 400 })
    }

    let existingCustomer = null
    let message = ""

    // Check for duplicate email
    if (email) {
      const emailCheck = await sql`
        SELECT id, first_name, last_name, email FROM customers 
        WHERE LOWER(email) = LOWER(${email}) LIMIT 1
      `

      if (emailCheck.length > 0) {
        existingCustomer = emailCheck[0]
        message = `A customer with email ${email} already exists: ${existingCustomer.first_name} ${existingCustomer.last_name}`
      }
    }

    // Check for duplicate phone if no email duplicate found
    if (!existingCustomer && phone) {
      const phoneCheck = await sql`
        SELECT c.id, c.first_name, c.last_name, c.email FROM customers c
        WHERE c.phone = ${phone} 
        OR EXISTS (
          SELECT 1 FROM customer_phone_numbers cpn 
          WHERE cpn.customer_id = c.id AND cpn.phone_number = ${phone}
        )
        LIMIT 1
      `

      if (phoneCheck.length > 0) {
        existingCustomer = phoneCheck[0]
        message = `A customer with phone ${phone} already exists: ${existingCustomer.first_name} ${existingCustomer.last_name}`
      }
    }

    return NextResponse.json({
      exists: !!existingCustomer,
      message,
      customer: existingCustomer,
    })
  } catch (error) {
    console.error("Duplicate check error:", error)
    return NextResponse.json({ error: "Failed to check for duplicates" }, { status: 500 })
  }
}

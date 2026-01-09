import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      firstName,
      lastName,
      email,
      phone,
      idNumber,
      address,
      city,
      county,
      postalCode,
      serviceType,
      preferredPlan,
      installationAddress,
      password,
      agreeTerms,
      agreePrivacy,
      agreeMarketing,
    } = body

    if (!firstName?.trim()) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 })
    }

    if (!lastName?.trim()) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 })
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Validate phone format
    const cleanPhone = phone.replace(/[\s\-$$$$]/g, "")
    if (!/^[+]?[0-9]{10,15}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 })
    }

    if (!agreeTerms || !agreePrivacy) {
      return NextResponse.json({ error: "You must agree to the Terms of Service and Privacy Policy" }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if email already exists
    const existingCustomer = await sql`
      SELECT id, first_name, last_name FROM customers 
      WHERE LOWER(email) = ${normalizedEmail} LIMIT 1
    `

    if (existingCustomer.length > 0) {
      return NextResponse.json(
        {
          error: `An account with email ${email} already exists. Please use a different email or try logging in.`,
        },
        { status: 409 },
      )
    }

    if (phone) {
      const existingPhone = await sql`
        SELECT c.id, c.first_name, c.last_name FROM customers c
        WHERE c.phone = ${phone.trim()} 
        OR EXISTS (
          SELECT 1 FROM customer_phone_numbers cpn 
          WHERE cpn.customer_id = c.id AND cpn.phone_number = ${phone.trim()}
        )
        LIMIT 1
      `

      if (existingPhone.length > 0) {
        return NextResponse.json(
          {
            error: `An account with phone number ${phone} already exists. Please use a different phone number or try logging in.`,
          },
          { status: 409 },
        )
      }
    }

    // Generate customer account number
    const accountNumber = `TW${Date.now().toString().slice(-6)}`

    // Hash password (in production, use proper password hashing like bcrypt)
    const hashedPassword = Buffer.from(password).toString("base64") // Simple encoding for demo

    const newCustomer = await sql.begin(async (sql) => {
      const customerResult = await sql`
        INSERT INTO customers (
          account_number,
          first_name,
          last_name,
          email,
          phone,
          id_number,
          address,
          city,
          state,
          postal_code,
          customer_type,
          service_preferences,
          installation_address,
          portal_password,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${accountNumber},
          ${firstName.trim()},
          ${lastName.trim()},
          ${normalizedEmail},
          ${phone.trim()},
          ${idNumber?.trim() || null},
          ${address?.trim() || null},
          ${city?.trim() || null},
          ${county?.trim() || null},
          ${postalCode?.trim() || null},
          ${serviceType || "individual"},
          ${JSON.stringify({
            preferred_plan: preferredPlan,
            agree_terms: agreeTerms,
            agree_privacy: agreePrivacy,
            agree_marketing: agreeMarketing,
            email_verified: false,
            portal_access: true,
          })},
          ${installationAddress?.trim() || null},
          ${hashedPassword},
          'pending',
          NOW(),
          NOW()
        )
        RETURNING id, account_number, email, first_name, last_name
      `

      return customerResult[0]
    })

    console.log("[v0] New customer registered:", {
      id: newCustomer.id,
      accountNumber: newCustomer.account_number,
      email: newCustomer.email,
      name: `${newCustomer.first_name} ${newCustomer.last_name}`,
    })

    // TODO: Send welcome email with account verification link
    // TODO: Notify admin of new registration

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      customer: {
        id: newCustomer.id,
        accountNumber: newCustomer.account_number,
        email: newCustomer.email,
        name: `${newCustomer.first_name} ${newCustomer.last_name}`,
      },
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)

    if (error instanceof Error) {
      if (error.message.includes('duplicate key value violates unique constraint "customers_email_key"')) {
        return NextResponse.json(
          {
            error: "An account with this email already exists. Please use a different email address.",
          },
          { status: 409 },
        )
      }

      if (error.message.includes('duplicate key value violates unique constraint "customers_account_number_key"')) {
        return NextResponse.json(
          {
            error: "Account number conflict. Please try again.",
          },
          { status: 409 },
        )
      }

      if (error.message.includes("null value in column") && error.message.includes("violates not-null constraint")) {
        return NextResponse.json(
          {
            error: "Required information is missing. Please fill in all required fields.",
          },
          { status: 400 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Registration failed due to a server error. Please try again.",
      },
      { status: 500 },
    )
  }
}

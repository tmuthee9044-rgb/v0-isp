import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const location = searchParams.get("location")
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    let query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.business_name IS NOT NULL AND c.business_name != '' THEN c.business_name
          ELSE CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))
        END as name,
        c.city as location_name,
        (SELECT COUNT(*) FROM customer_services cs WHERE cs.customer_id = c.id) as service_count,
        (SELECT sp.name FROM customer_services cs 
         JOIN service_plans sp ON cs.service_plan_id = sp.id 
         WHERE cs.customer_id = c.id AND cs.status = 'active' 
         LIMIT 1) as service_plan_name,
        (SELECT sp.price FROM customer_services cs 
         JOIN service_plans sp ON cs.service_plan_id = sp.id 
         WHERE cs.customer_id = c.id AND cs.status = 'active' 
         LIMIT 1) as monthly_fee,
        COALESCE(
          (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.customer_id = c.id AND p.status = 'completed') +
          (SELECT COALESCE(SUM(cn.amount), 0) FROM credit_notes cn WHERE cn.customer_id = c.id AND cn.status = 'approved') -
          (SELECT SUM(i2.amount) FROM invoices i2 WHERE i2.customer_id = c.id), 
          0
        ) as outstanding_balance,
        COALESCE(
          (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.customer_id = c.id AND p.status = 'completed') +
          (SELECT COALESCE(SUM(cn.amount), 0) FROM credit_notes cn WHERE cn.customer_id = c.id AND cn.status = 'approved') -
          (SELECT SUM(i2.amount) FROM invoices i2 WHERE i2.customer_id = c.id), 
          0
        ) as actual_balance,
        (SELECT COUNT(*) FROM support_tickets t WHERE t.customer_id = c.id AND t.status IN ('open', 'pending')) as open_tickets
      FROM customers c
      WHERE 1=1
    `

    // Build WHERE conditions dynamically
    const conditions = []
    if (status && status !== "all") {
      conditions.push(`c.status = '${status.replace(/'/g, "''")}'`)
    }
    if (location && location !== "all") {
      conditions.push(`c.city = '${location.replace(/'/g, "''")}'`)
    }
    if (search) {
      const searchTerm = search.replace(/'/g, "''") // Escape single quotes
      conditions.push(
        `(CONCAT(c.first_name, ' ', c.last_name) ILIKE '%${searchTerm}%' OR c.business_name ILIKE '%${searchTerm}%' OR c.email ILIKE '%${searchTerm}%' OR c.phone ILIKE '%${searchTerm}%')`,
      )
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`
    }

    query += `
      ORDER BY c.created_at DESC
    `

    console.log("[v0] Executing customer query:", query)
    const customers = await sql.query(query)
    console.log("[v0] Found customers count:", customers.length)
    console.log("[v0] First customer sample:", customers[0])

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Failed to fetch customers:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    console.log("[v0] Received customer data:", JSON.stringify(data, null, 2))

    if (data.email) {
      const existingCustomer = await sql`
        SELECT id, email, 
        CASE 
          WHEN business_name IS NOT NULL AND business_name != '' THEN business_name
          ELSE CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
        END as name
        FROM customers 
        WHERE email = ${data.email.toLowerCase().trim()}
      `

      if (existingCustomer.length > 0) {
        console.log("[v0] Duplicate email detected:", data.email)
        return NextResponse.json(
          {
            error: "Email address already exists",
            message: `A customer with email ${data.email} already exists in the system.`,
            existingCustomer: {
              id: existingCustomer[0].id,
              name: existingCustomer[0].name,
              email: existingCustomer[0].email,
            },
          },
          { status: 409 },
        )
      }
    }

    const generateAccountNumber = async () => {
      let accountNumber
      let isUnique = false

      while (!isUnique) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
        const random = Math.floor(Math.random() * 9999)
          .toString()
          .padStart(4, "0")
        accountNumber = `ACC-${date}-${random}`

        const existing = await sql`
          SELECT id FROM customers WHERE account_number = ${accountNumber}
        `

        if (existing.length === 0) {
          isUnique = true
        }
      }

      return accountNumber
    }

    const accountNumber = await generateAccountNumber()

    const firstName = data.first_name || data.contact_person?.split(" ")[0] || "N/A"
    const lastName = data.last_name || data.contact_person?.split(" ").slice(1).join(" ") || "N/A"
    const businessName = data.name || data.business_name || null

    console.log("[v0] Processed names:", { firstName, lastName, businessName })

    const normalizedEmail = data.email ? data.email.toLowerCase().trim() : null

    const customerType = data.customer_type || "individual"
    console.log("[v0] Customer type:", customerType)

    const customerResult = await sql`
      INSERT INTO customers (
        account_number, first_name, last_name, business_name, customer_type, email, phone,
        address, city, state, country, postal_code, gps_coordinates,
        billing_address, installation_address,
        id_number, tax_number, business_type,
        preferred_contact_method, referral_source, service_preferences,
        status, created_at, updated_at
      ) VALUES (
        ${accountNumber}, ${firstName}, ${lastName},
        ${businessName}, ${customerType}, ${normalizedEmail}, ${data.phone_primary || data.phone},
        ${data.physical_address || data.address}, ${data.physical_city || data.city}, 
        ${data.physical_county || data.state}, ${data.country || "Kenya"}, 
        ${data.physical_postal_code || data.postal_code || null}, 
        ${data.physical_gps_coordinates || data.gps_coordinates || null},
        ${data.same_as_physical ? data.physical_address || data.address : data.billing_address || null},
        ${data.installation_address || data.physical_address || data.address},
        ${data.national_id || data.id_number || null},
        ${data.vat_pin || data.tax_id || data.tax_number || null},
        ${data.business_type || data.business_reg_no || null},
        ${data.preferred_contact_method || "phone"}, 
        ${data.referral_source || null},
        ${data.special_requirements || data.internal_notes ? JSON.stringify({ special_requirements: data.special_requirements, internal_notes: data.internal_notes, sales_rep: data.sales_rep, account_manager: data.account_manager }) : null},
        'active', NOW(), NOW()
      ) RETURNING *
    `

    const customer = customerResult[0]
    console.log("[v0] Customer created successfully:", customer.id)

    if (data.phone_primary) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_primary}, 'mobile', true, NOW())
      `
    }

    if (data.phone_secondary) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_secondary}, 'mobile', false, NOW())
      `
    }

    if (data.phone_office) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_office}, 'office', false, NOW())
      `
    }

    if (data.emergency_contact_name && data.emergency_contact_phone) {
      await sql`
        INSERT INTO customer_emergency_contacts (customer_id, name, phone, relationship, created_at)
        VALUES (
          ${customer.id}, 
          ${data.emergency_contact_name}, 
          ${data.emergency_contact_phone}, 
          ${data.emergency_contact_relationship || null},
          NOW()
        )
      `
    }

    if ((customerType === "company" || customerType === "school") && data.contact_person) {
      await sql`
        INSERT INTO customer_contacts (customer_id, name, contact_type, is_primary, created_at)
        VALUES (${customer.id}, ${data.contact_person}, 'primary', true, NOW())
      `
    }

    if (data.service_plan_id) {
      await sql`
        INSERT INTO customer_services (customer_id, service_plan_id, status, start_date, created_at)
        VALUES (${customer.id}, ${data.service_plan_id}, 'active', CURRENT_DATE, NOW())
      `
    }

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Failed to create customer:", error)

    if (error.code === "23505") {
      if (error.constraint === "customers_email_key") {
        return NextResponse.json(
          {
            error: "Email address already exists",
            message: "A customer with this email address already exists in the system.",
            code: "DUPLICATE_EMAIL",
          },
          { status: 409 },
        )
      }
      if (error.constraint === "customers_account_number_key") {
        return NextResponse.json(
          {
            error: "Account number conflict",
            message: "There was an issue generating a unique account number. Please try again.",
            code: "DUPLICATE_ACCOUNT_NUMBER",
          },
          { status: 409 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to create customer",
        message: "An unexpected error occurred while creating the customer. Please try again.",
      },
      { status: 500 },
    )
  }
}

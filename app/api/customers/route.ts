import { getSql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const location = searchParams.get("location")
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    const conditions: Array<string> = []

    if (status && status !== "all") {
      conditions.push(`c.status = $1`)
    }
    if (location && location !== "all") {
      conditions.push(`c.city = $2`)
    }
    if (type && type !== "all") {
      conditions.push(`c.customer_type = $3`)
    }

    let query = `
      SELECT 
        c.id,
        c.account_number,
        c.first_name,
        c.last_name,
        c.business_name,
        c.customer_type,
        c.email,
        c.phone,
        c.city,
        c.status,
        c.created_at
      FROM customers c
    `
    const values: Array<string> = []

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`
      values.push(status || "", location || "", type || "")
    }

    if (search) {
      const searchTerm = search.replace(/'/g, "''").toLowerCase()
      if (conditions.length > 0) {
        query += ` AND (`
      } else {
        query += ` WHERE (`
      }
      query += `c.first_name ILIKE '%' || $${values.length + 1} || '%' OR 
        c.last_name ILIKE '%' || $${values.length + 2} || '%' OR 
        c.business_name ILIKE '%' || $${values.length + 3} || '%' OR 
        c.email ILIKE '%' || $${values.length + 4} || '%' OR 
        c.account_number ILIKE '%' || $${values.length + 5} || '%')`
      values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    query += ` ORDER BY c.created_at DESC LIMIT 1000`

    const customers = await sql.unsafe(query, values)

    const transformedCustomers = customers.map((customer: any) => ({
      ...customer,
      name: customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "No Name",
      location_name: customer.city || "Not Set",
      service_count: 0,
      total_payments: 0,
      total_in_stock: 0,
      outstanding_balance: 0,
      open_tickets: 0,
    }))

    return NextResponse.json(transformedCustomers)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customers",
        details: (error as any).message,
        customers: [],
        count: 0,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const data = await request.json()

    console.log("[v0] Received customer data:", data)

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

    const normalizedEmail = data.email ? data.email.toLowerCase().trim() : null
    const customerType = data.customer_type || "individual"

    const customerName =
      customerType === "individual"
        ? `${firstName} ${lastName}`.trim()
        : businessName || `${firstName} ${lastName}`.trim()

    const customerResult = await sql`
      INSERT INTO customers (
        account_number, name, first_name, last_name, business_name, customer_type, 
        email, alternate_email, phone,
        address, city, state, country, postal_code, gps_coordinates,
        billing_address, installation_address, location_id,
        id_number, tax_number, business_type, contact_person,
        date_of_birth, gender,
        preferred_contact_method, referral_source, service_preferences,
        status, created_at, updated_at
      ) VALUES (
        ${accountNumber}, 
        ${customerName}, 
        ${firstName}, 
        ${lastName},
        ${businessName}, 
        ${customerType}, 
        ${normalizedEmail}, 
        ${data.alternate_email ? data.alternate_email.toLowerCase().trim() : null},
        ${data.phone_primary || data.phone},
        ${data.physical_address || data.address}, 
        ${data.physical_city || data.city}, 
        ${data.physical_county || data.state}, 
        ${data.country || "Kenya"}, 
        ${data.physical_postal_code || data.postal_code || null}, 
        ${data.physical_gps_coordinates || data.gps_coordinates || null},
        ${data.same_as_physical ? data.physical_address || data.address : data.billing_address || null},
        ${data.installation_address || data.physical_address || data.address},
        ${data.location_id || null},
        ${data.national_id || data.id_number || null},
        ${data.vat_pin || data.tax_id || data.tax_number || null},
        ${data.business_reg_no || data.business_type || null},
        ${data.contact_person || null},
        ${data.date_of_birth || null},
        ${data.gender || null},
        ${data.preferred_contact_method || "phone"}, 
        ${data.referral_source || null},
        ${
          data.special_requirements || data.internal_notes || data.sales_rep || data.account_manager
            ? JSON.stringify({
                special_requirements: data.special_requirements,
                internal_notes: data.internal_notes,
                sales_rep: data.sales_rep,
                account_manager: data.account_manager,
              })
            : null
        },
        'active', 
        NOW(), 
        NOW()
      ) RETURNING *
    `

    const customer = customerResult[0]
    console.log("[v0] Customer created:", customer)

    if (data.phone_primary) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_primary}, 'mobile', true, NOW())
        ON CONFLICT DO NOTHING
      `
    }

    if (data.phone_secondary) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_secondary}, 'mobile', false, NOW())
        ON CONFLICT DO NOTHING
      `
    }

    if (data.phone_office) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_office}, 'office', false, NOW())
        ON CONFLICT DO NOTHING
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
        ON CONFLICT DO NOTHING
      `
    }

    if ((customerType === "company" || customerType === "school") && data.contact_person) {
      await sql`
        INSERT INTO customer_contacts (customer_id, name, contact_type, is_primary, created_at)
        VALUES (${customer.id}, ${data.contact_person}, 'primary', true, NOW())
        ON CONFLICT DO NOTHING
      `
    }

    if (data.service_plan_id) {
      await sql`
        INSERT INTO customer_services (customer_id, service_plan_id, status, start_date, created_at)
        VALUES (${customer.id}, ${data.service_plan_id}, 'active', CURRENT_DATE, NOW())
      `
    }

    await sql`
      INSERT INTO finance_audit_trail (
        action, entity_type, entity_id, user_email, details, ip_address, created_at
      ) VALUES (
        'CREATE', 'customer', ${customer.id}, 'system', 
        ${JSON.stringify({ customer_type: customerType, location_id: data.location_id })},
        '127.0.0.1', NOW()
      )
    `.catch(() => {
      // Ignore if audit table doesn't exist
      console.log("[v0] Audit trail table not available")
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Failed to create customer:", error)

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
        success: false,
        error: "Failed to create customer",
        message: error.message || "An unexpected error occurred while creating the customer. Please try again.",
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}

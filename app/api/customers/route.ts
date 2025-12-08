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

    const queryConditions = []

    if (status && status !== "all") {
      queryConditions.push(`c.status = '${status.replace(/'/g, "''")}'`)
    }
    if (location && location !== "all") {
      queryConditions.push(`c.city = '${location.replace(/'/g, "''")}'`)
    }
    if (type && type !== "all") {
      queryConditions.push(`c.customer_type = '${type.replace(/'/g, "''")}'`)
    }
    if (search) {
      const searchTerm = search.replace(/'/g, "''").toLowerCase()
      queryConditions.push(`(
        c.first_name ILIKE '%${searchTerm}%' OR 
        c.last_name ILIKE '%${searchTerm}%' OR 
        c.business_name ILIKE '%${searchTerm}%' OR 
        c.email ILIKE '%${searchTerm}%' OR 
        c.phone ILIKE '%${searchTerm}%' OR 
        c.account_number ILIKE '%${searchTerm}%'
      )`)
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(" AND ")}` : ""

    const query = `
      SELECT 
        c.id,
        c.account_number,
        c.first_name,
        c.last_name,
        c.business_name,
        c.customer_type,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.country,
        c.postal_code,
        c.status,
        c.created_at,
        c.updated_at,
        -- Service count and details
        COALESCE(COUNT(DISTINCT cs.id), 0)::integer as service_count,
        sp.name as service_plan_name,
        sp.price as monthly_fee,
        -- Balance calculations
        COALESCE(SUM(DISTINCT i.amount), 0) as total_invoices,
        COALESCE(SUM(DISTINCT p.amount), 0) as total_payments,
        COALESCE(SUM(DISTINCT i.amount), 0) - COALESCE(SUM(DISTINCT p.amount), 0) as outstanding_balance,
        COALESCE(SUM(DISTINCT p.amount), 0) - COALESCE(SUM(DISTINCT i.amount), 0) as actual_balance,
        -- Open tickets count
        COALESCE(COUNT(DISTINCT CASE WHEN st.status IN ('open', 'in_progress', 'pending') THEN st.id END), 0)::integer as open_tickets
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id 
        AND cs.status NOT IN ('terminated')
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN invoices i ON c.id = i.customer_id
      LEFT JOIN payments p ON c.id = p.customer_id
      LEFT JOIN support_tickets st ON c.id = st.customer_id 
        AND st.status IN ('open', 'in_progress', 'pending')
      ${whereClause}
      GROUP BY 
        c.id, c.account_number, c.first_name, c.last_name, c.business_name,
        c.customer_type, c.email, c.phone, c.address, c.city, c.state,
        c.country, c.postal_code, c.status, c.created_at, c.updated_at,
        sp.name, sp.price
      ORDER BY c.created_at DESC
    `

    const customers = await sql.unsafe(query)

    const transformedCustomers = customers.map((customer: any) => ({
      ...customer,
      name: customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "No Name",
      location_name: customer.city || "Not Set",
      service_count: Number(customer.service_count) || 0,
      service_plan_name: customer.service_plan_name || "",
      monthly_fee: Number(customer.monthly_fee) || 0,
      total_payments: Number(customer.total_payments) || 0,
      total_invoices: Number(customer.total_invoices) || 0,
      outstanding_balance: Number(customer.outstanding_balance) || 0,
      actual_balance: Number(customer.actual_balance) || 0,
      open_tickets: Number(customer.open_tickets) || 0,
    }))

    return NextResponse.json(transformedCustomers)
  } catch (error) {
    console.error("Failed to fetch customers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customers",
        details: error.message,
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

    const customerName =
      customerType === "individual"
        ? `${firstName} ${lastName}`.trim()
        : businessName || `${firstName} ${lastName}`.trim()

    const customerResult = await sql`
      INSERT INTO customers (
        account_number, name, first_name, last_name, business_name, customer_type, email, phone,
        address, city, state, country, postal_code, gps_coordinates,
        billing_address, installation_address,
        id_number, tax_number, business_type,
        preferred_contact_method, referral_source, service_preferences,
        status, created_at, updated_at
      ) VALUES (
        ${accountNumber}, ${customerName}, ${firstName}, ${lastName},
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

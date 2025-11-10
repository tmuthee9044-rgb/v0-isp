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

    console.log("[v0] Fetching customers with filters:", { status, location, type, search })

    let customers

    // Build the query dynamically using tagged template literals
    if (!status && !location && !type && !search) {
      // No filters - simple query
      customers = await sql`
        SELECT 
          id,
          account_number,
          first_name,
          last_name,
          business_name,
          customer_type,
          email,
          phone,
          address,
          city,
          state,
          country,
          postal_code,
          status,
          created_at,
          updated_at
        FROM customers
        ORDER BY created_at DESC
      `
    } else {
      // With filters - build conditions
      const conditions = []
      const values = []

      if (status && status !== "all") {
        conditions.push(`status = ${sql(status.replace(/'/g, "''"))}`)
      }
      if (location && location !== "all") {
        conditions.push(`city = ${sql(location.replace(/'/g, "''"))}`)
      }
      if (type && type !== "all") {
        conditions.push(`customer_type = ${sql(type.replace(/'/g, "''"))}`)
      }
      if (search) {
        const searchTerm = `%${search.replace(/'/g, "''").toLowerCase()}%`
        conditions.push(
          `(first_name ILIKE ${sql(searchTerm)} OR last_name ILIKE ${sql(searchTerm)} OR business_name ILIKE ${sql(searchTerm)} OR email ILIKE ${sql(searchTerm)} OR phone ILIKE ${sql(searchTerm)} OR account_number ILIKE ${sql(searchTerm)})`,
        )
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

      // Use unsafe for dynamic queries (this is the correct way for dynamic SQL)
      const query = `
        SELECT 
          id,
          account_number,
          first_name,
          last_name,
          business_name,
          customer_type,
          email,
          phone,
          address,
          city,
          state,
          country,
          postal_code,
          status,
          created_at,
          updated_at
        FROM customers
        ${whereClause}
        ORDER BY created_at DESC
      `

      console.log("[v0] Executing query with filters:", query)

      // For dynamic queries, we need to use a different approach
      // Let's use the neon client's query method if available, or construct with template literals
      customers = await sql.unsafe(query)
    }

    console.log("[v0] Query executed, found customers:", customers.length)

    if (customers.length > 0) {
      console.log("[v0] First customer sample:", {
        id: customers[0].id,
        name: customers[0].business_name || `${customers[0].first_name} ${customers[0].last_name}`,
        email: customers[0].email,
      })
    }

    // Transform customers to match frontend expectations
    const transformedCustomers = customers.map((customer: any) => ({
      ...customer,
      name: customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "No Name",
      location_name: customer.city || "Not Set",
      service_count: 0,
      service_plan_name: "",
      monthly_fee: 0,
      total_payments: 0,
      total_invoices: 0,
      outstanding_balance: 0,
      actual_balance: 0,
      open_tickets: 0,
    }))

    console.log("[v0] Returning customers:", transformedCustomers.length)
    return NextResponse.json(transformedCustomers)
  } catch (error) {
    console.error("[v0] Failed to fetch customers:", error)
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

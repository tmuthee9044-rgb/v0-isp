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
    const limit = searchParams.get("limit") || "100"
    const offset = searchParams.get("offset") || "0"

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
        c.created_at,
        COUNT(DISTINCT cs.id) as service_count,
        MAX(sp.name) as service_plan_name,
        MAX(cs.monthly_fee) as monthly_fee,
        COALESCE(SUM(DISTINCT i.total_amount), 0) - COALESCE(SUM(DISTINCT p.amount), 0) as actual_balance,
        COALESCE(SUM(CASE WHEN i.status = 'unpaid' OR i.status = 'overdue' THEN i.total_amount ELSE 0 END), 0) as outstanding_balance
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN invoices i ON c.id = i.customer_id
      LEFT JOIN payments p ON c.id = p.customer_id AND p.status = 'completed'
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

    query += ` GROUP BY c.id, c.account_number, c.first_name, c.last_name, c.business_name, c.customer_type, c.email, c.phone, c.city, c.status, c.created_at ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}`

    const customers = await sql.unsafe(query, values)

    let countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM customers c`
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`
    }
    if (search) {
      const searchTerm = search.replace(/'/g, "''").toLowerCase()
      if (conditions.length > 0) {
        countQuery += ` AND (`
      } else {
        countQuery += ` WHERE (`
      }
      countQuery += `c.first_name ILIKE '%' || $${values.length + 1} || '%' OR 
        c.last_name ILIKE '%' || $${values.length + 2} || '%' OR 
        c.business_name ILIKE '%' || $${values.length + 3} || '%' OR 
        c.email ILIKE '%' || $${values.length + 4} || '%' OR 
        c.account_number ILIKE '%' || $${values.length + 5} || '%')`
    }

    const countResult = await sql.unsafe(countQuery, values)
    const totalCount = Number.parseInt(countResult[0]?.total || "0")

    const transformedCustomers = customers.map((customer: any) => ({
      ...customer,
      name: customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "No Name",
      location_name: customer.city || "Not Set",
      service_count: Number.parseInt(customer.service_count) || 0,
      actual_balance: Number.parseFloat(customer.actual_balance) || 0,
      outstanding_balance: Number.parseFloat(customer.outstanding_balance) || 0,
      total_payments: 0,
      total_in_stock: 0,
      open_tickets: 0,
    }))

    return NextResponse.json({
      customers: transformedCustomers,
      total: totalCount,
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
    })
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
  const startTime = Date.now()
  try {
    const sql = await getSql()
    const data = await request.json()

    const accountNumber = data.account_number
      ? data.account_number.trim().toUpperCase()
      : `ACC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const firstName = data.first_name || data.contact_person?.split(" ")[0] || ""
    const lastName = data.last_name || data.contact_person?.split(" ").slice(1).join(" ") || ""
    const businessName = data.name || data.business_name || ""
    const customerType = data.customer_type || "individual"

    const customerName =
      customerType === "individual"
        ? `${firstName} ${lastName}`.trim() || "N/A"
        : businessName || `${firstName} ${lastName}`.trim() || "N/A"

    const fullAddress = [
      data.physical_address || data.address,
      data.physical_city || data.city,
      data.physical_county || data.state,
      data.physical_postal_code || data.postal_code,
      data.country || "Kenya",
    ]
      .filter(Boolean)
      .join(", ")

    const normalizedEmail = data.email ? data.email.toLowerCase().trim() : null

    const customerResult = await sql`
      INSERT INTO customers (
        account_number,
        name, first_name, last_name, business_name,
        email, alternate_email,
        phone, phone_primary, phone_secondary, phone_office,
        date_of_birth, gender, national_id,
        contact_person, business_reg_no, vat_pin, tax_number, business_type, industry, company_size,
        school_type, student_count, staff_count,
        address, physical_address, physical_city, physical_county, physical_postal_code, physical_gps_coordinates,
        billing_address, billing_city, billing_county, billing_postal_code, installation_address,
        city, state, country, postal_code, gps_coordinates, region,
        location_id,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        connection_type, equipment_needed, installation_notes,
        technical_contact, technical_contact_phone,
        referral_source, sales_rep, account_manager, special_requirements, internal_notes,
        billing_cycle, auto_renewal, paperless_billing, sms_notifications,
        customer_type, status,
        created_at, updated_at
      ) VALUES (
        ${accountNumber},
        ${customerName}, ${firstName || null}, ${lastName || null}, ${businessName || null},
        ${normalizedEmail}, ${data.alternate_email || null},
        ${data.phone_primary || data.phone}, ${data.phone_primary || data.phone}, 
        ${data.phone_secondary || null}, ${data.phone_office || null},
        ${data.date_of_birth || null}, ${data.gender || null}, ${data.national_id || null},
        ${data.contact_person || null}, ${data.business_reg_no || null}, 
        ${data.vat_pin || null}, ${data.tax_id || data.tax_number || null}, 
        ${data.business_type || null}, ${data.industry || null}, ${data.company_size || null},
        ${data.school_type || null}, ${data.student_count || null}, ${data.staff_count || null},
        ${fullAddress || null}, ${data.physical_address || data.address || null}, 
        ${data.physical_city || data.city || null}, ${data.physical_county || data.state || null},
        ${data.physical_postal_code || data.postal_code || null}, 
        ${data.physical_gps_coordinates || data.gps_coordinates || null},
        ${data.same_as_physical ? data.physical_address || data.address : data.billing_address || null},
        ${data.same_as_physical ? data.physical_city : data.billing_city || null},
        ${data.same_as_physical ? data.physical_county : data.billing_county || null},
        ${data.same_as_physical ? data.physical_postal_code : data.billing_postal_code || null},
        ${data.installation_address || data.physical_address || data.address || null},
        ${data.physical_city || data.city || null}, ${data.physical_county || data.state || null},
        ${data.country || "Kenya"}, ${data.physical_postal_code || data.postal_code || null},
        ${data.physical_gps_coordinates || data.gps_coordinates || null}, ${data.region || null},
        ${data.location_id || null},
        ${data.emergency_contact_name || null}, ${data.emergency_contact_phone || null},
        ${data.emergency_contact_relationship || null},
        ${data.connection_type || null}, ${data.equipment_needed || null}, ${data.installation_notes || null},
        ${data.technical_contact || null}, ${data.technical_contact_phone || null},
        ${data.referral_source || null}, ${data.sales_rep || null}, ${data.account_manager || null},
        ${data.special_requirements || null}, ${data.internal_notes || null},
        ${data.billing_cycle || "monthly"}, ${data.auto_renewal || false},
        ${data.paperless_billing || false}, ${data.sms_notifications !== false},
        ${customerType}, 'active',
        NOW(), NOW()
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `

    if (customerResult.length === 0) {
      // Email conflict occurred
      return NextResponse.json(
        {
          error: "Email address already exists",
          message: `A customer with email ${data.email} already exists in the system.`,
          code: "DUPLICATE_EMAIL",
        },
        { status: 409 },
      )
    }

    const customer = customerResult[0]

    const elapsedTime = Date.now() - startTime

    Promise.all([
      data.phone_primary
        ? sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_primary}, 'mobile', true, NOW())
        ON CONFLICT DO NOTHING
      `.catch(() => {})
        : Promise.resolve(),

      data.phone_secondary
        ? sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary, created_at)
        VALUES (${customer.id}, ${data.phone_secondary}, 'mobile', false, NOW())
        ON CONFLICT DO NOTHING
      `.catch(() => {})
        : Promise.resolve(),

      data.emergency_contact_name && data.emergency_contact_phone
        ? sql`
        INSERT INTO customer_emergency_contacts (customer_id, name, phone, relationship, created_at)
        VALUES (
          ${customer.id}, 
          ${data.emergency_contact_name}, 
          ${data.emergency_contact_phone}, 
          ${data.emergency_contact_relationship || null},
          NOW()
        )
        ON CONFLICT DO NOTHING
      `.catch(() => {})
        : Promise.resolve(),

      data.service_plan_id
        ? sql`
        INSERT INTO customer_services (customer_id, service_plan_id, status, installation_date, created_at)
        VALUES (${customer.id}, ${data.service_plan_id}, 'pending', CURRENT_DATE, NOW())
      `.catch(() => {})
        : Promise.resolve(),

      sql`
        INSERT INTO activity_logs (
          action, entity_type, entity_id, details, ip_address, created_at
        ) VALUES (
          'CREATE', 'customer', ${customer.id}, 
          ${JSON.stringify({ customer_type: customerType, location_id: data.location_id || null })},
          '127.0.0.1', NOW()
        )
      `.catch(() => {}),
    ]).catch(() => {})

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Failed to create customer:", error)

    if (error.code === "23505") {
      if (error.constraint === "customers_pkey") {
        // Primary key sequence is out of sync - fix it and retry
        try {
          await sql`SELECT setval(pg_get_serial_sequence('customers', 'id'), COALESCE((SELECT MAX(id) FROM customers), 0) + 1, false)`
          // Retry the insert after fixing the sequence
          return POST(request)
        } catch (retryError: any) {
          console.error("[v0] Failed to fix customer sequence:", retryError)
          return NextResponse.json(
            {
              error: "Database sequence error",
              message: "Please try again. The system has auto-corrected the issue.",
              code: "SEQUENCE_FIXED",
            },
            { status: 500 },
          )
        }
      }
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

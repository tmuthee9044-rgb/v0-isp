import { getSql } from "@/lib/db"
import { NextResponse } from "next/server"

// Helper to generate next id for tables that lack auto-increment
async function nextId(sql: any, table: string): Promise<number> {
  const result = await sql.unsafe(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${table}`)
  return result[0]?.next_id || 1
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer ID",
        },
        { status: 400 },
      )
    }

    const customerResult = await sql`
      SELECT 
        id, account_number, first_name, last_name, email, phone,
        alternate_email, phone_primary, phone_secondary, phone_office,
        date_of_birth, gender, national_id, id_number,
        address, physical_address, physical_city, physical_county, physical_postal_code, physical_gps_coordinates,
        city, state, postal_code, country, region, gps_coordinates,
        billing_address, billing_city, billing_county, billing_postal_code,
        installation_address, location_id,
        business_name, business_type, business_reg_no, tax_number, vat_pin, tax_id,
        contact_person, industry, company_size,
        school_type, student_count, staff_count,
        customer_type, status, balance,
        billing_cycle, auto_renewal, paperless_billing, sms_notifications,
        referral_source, sales_rep, account_manager,
        special_requirements, internal_notes,
        connection_type, equipment_needed, installation_notes,
        technical_contact, technical_contact_phone,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        portal_login_id, portal_username, portal_password, portal_access,
        created_at, updated_at
      FROM customers 
      WHERE id = ${customerId}
    `

    if (customerResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      ...customerResult[0],
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer ID",
        },
        { status: 400 },
      )
    }

    // Check if customer exists
    const existingCustomer = await sql`SELECT * FROM customers WHERE id = ${customerId}`

    if (existingCustomer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    // Delete related records first (cascade deletion)
    await sql`DELETE FROM customer_services WHERE customer_id = ${customerId}`
    await sql`DELETE FROM payments WHERE customer_id = ${customerId}`
    await sql`DELETE FROM ip_addresses WHERE customer_id = ${customerId}`
    await sql`DELETE FROM customer_phone_numbers WHERE customer_id = ${customerId}`
    await sql`DELETE FROM customer_emergency_contacts WHERE customer_id = ${customerId}`
    await sql`DELETE FROM customer_contacts WHERE customer_id = ${customerId}`

    // Delete the customer
    await sql`DELETE FROM customers WHERE id = ${customerId}`

    return NextResponse.json({
      success: true,
      message: `Customer ${existingCustomer[0].name} has been deleted successfully`,
    })
  } catch (error) {
    console.error("Delete customer error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete customer",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()

    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer ID",
        },
        { status: 400 },
      )
    }

    const existingCustomer = await sql`SELECT * FROM customers WHERE id = ${customerId}`

    if (existingCustomer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    let updateData: any = {}
    const contentType = request.headers.get("content-type")

    if (contentType?.includes("application/json")) {
      updateData = await request.json()
    } else {
      const formData = await request.formData()
      for (const [key, value] of formData.entries()) {
        if (key === "phone_numbers" || key === "emergency_contacts" || key === "selected_equipment") {
          try {
            updateData[key] = JSON.parse(value as string)
          } catch (e) {
            updateData[key] = value
          }
        } else {
          updateData[key] = value
        }
      }
    }

    const parseIntOrNull = (value: any, fallback: any = null) => {
      if (value === "" || value === null || value === undefined) return fallback
      const parsed = Number.parseInt(value)
      return isNaN(parsed) ? fallback : parsed
    }

    const result = await sql`
      UPDATE customers 
      SET 
        first_name = ${updateData.first_name || existingCustomer[0].first_name || ""},
        last_name = ${updateData.last_name || existingCustomer[0].last_name || ""},
        email = ${updateData.email || existingCustomer[0].email},
        alternate_email = ${updateData.alternate_email || existingCustomer[0].alternate_email || null},
        phone = ${updateData.phone_primary || updateData.phone || existingCustomer[0].phone},
        phone_primary = ${updateData.phone_primary || existingCustomer[0].phone_primary || existingCustomer[0].phone || ""},
        phone_secondary = ${updateData.phone_secondary || existingCustomer[0].phone_secondary || ""},
        phone_office = ${updateData.phone_office || existingCustomer[0].phone_office || ""},
        date_of_birth = ${updateData.date_of_birth || existingCustomer[0].date_of_birth || null},
        gender = ${updateData.gender || existingCustomer[0].gender || null},
        national_id = ${updateData.national_id || existingCustomer[0].national_id || null},
        id_number = ${updateData.national_id || updateData.id_number || existingCustomer[0].id_number || null},
        status = ${updateData.status || existingCustomer[0].status},
        address = ${updateData.physical_address || updateData.address || existingCustomer[0].address || ""},
        physical_address = ${updateData.physical_address || existingCustomer[0].physical_address || existingCustomer[0].address || ""},
        physical_city = ${updateData.physical_city || existingCustomer[0].physical_city || existingCustomer[0].city || ""},
        physical_county = ${updateData.physical_county || existingCustomer[0].physical_county || existingCustomer[0].state || ""},
        physical_postal_code = ${updateData.physical_postal_code || existingCustomer[0].physical_postal_code || existingCustomer[0].postal_code || ""},
        physical_gps_coordinates = ${updateData.physical_gps_coordinates || existingCustomer[0].physical_gps_coordinates || existingCustomer[0].gps_coordinates || ""},
        installation_address = ${updateData.installation_address || updateData.physical_address || existingCustomer[0].installation_address || ""},
        billing_address = ${updateData.same_as_physical === "true" || updateData.same_as_physical === true ? (updateData.physical_address || existingCustomer[0].physical_address || "") : (updateData.billing_address || existingCustomer[0].billing_address || "")},
        billing_city = ${updateData.same_as_physical === "true" || updateData.same_as_physical === true ? (updateData.physical_city || existingCustomer[0].physical_city || "") : (updateData.billing_city || existingCustomer[0].billing_city || "")},
        billing_county = ${updateData.same_as_physical === "true" || updateData.same_as_physical === true ? (updateData.physical_county || existingCustomer[0].physical_county || "") : (updateData.billing_county || existingCustomer[0].billing_county || "")},
        billing_postal_code = ${updateData.same_as_physical === "true" || updateData.same_as_physical === true ? (updateData.physical_postal_code || existingCustomer[0].physical_postal_code || "") : (updateData.billing_postal_code || existingCustomer[0].billing_postal_code || "")},
        city = ${updateData.physical_city || updateData.city || existingCustomer[0].city || ""},
        state = ${updateData.physical_county || updateData.state || existingCustomer[0].state || ""},
        country = ${updateData.country || existingCustomer[0].country || "Kenya"},
        postal_code = ${updateData.physical_postal_code || updateData.postal_code || existingCustomer[0].postal_code || ""},
        gps_coordinates = ${
          updateData.physical_gps_coordinates ||
          updateData.gps_coordinates ||
          (updateData.physical_lat && updateData.physical_lng
            ? `${updateData.physical_lat},${updateData.physical_lng}`
            : existingCustomer[0].gps_coordinates || "")
        },
        location_id = ${parseIntOrNull(updateData.location_id, existingCustomer[0].location_id)},
        business_name = ${updateData.name || updateData.business_name || existingCustomer[0].business_name || ""},
        business_type = ${updateData.business_type || existingCustomer[0].business_type || ""},
        business_reg_no = ${updateData.business_reg_no || existingCustomer[0].business_reg_no || ""},
        tax_number = ${updateData.vat_pin || updateData.tax_id || updateData.tax_number || existingCustomer[0].tax_number || ""},
        vat_pin = ${updateData.vat_pin || existingCustomer[0].vat_pin || null},
        tax_id = ${updateData.tax_id || existingCustomer[0].tax_id || null},
        contact_person = ${updateData.contact_person || existingCustomer[0].contact_person || ""},
        industry = ${updateData.industry || existingCustomer[0].industry || ""},
        company_size = ${updateData.company_size || existingCustomer[0].company_size || ""},
        school_type = ${updateData.school_type || existingCustomer[0].school_type || ""},
        student_count = ${parseIntOrNull(updateData.student_count, existingCustomer[0].student_count)},
        staff_count = ${parseIntOrNull(updateData.staff_count, existingCustomer[0].staff_count)},
        billing_cycle = ${updateData.billing_cycle || existingCustomer[0].billing_cycle || "monthly"},
        auto_renewal = ${updateData.auto_renewal === "true" || updateData.auto_renewal === true || existingCustomer[0].auto_renewal || false},
        paperless_billing = ${updateData.paperless_billing === "true" || updateData.paperless_billing === true || existingCustomer[0].paperless_billing || false},
        sms_notifications = ${updateData.sms_notifications !== "false" && updateData.sms_notifications !== false},
        connection_type = ${updateData.connection_type || existingCustomer[0].connection_type || null},
        equipment_needed = ${updateData.equipment_needed || existingCustomer[0].equipment_needed || null},
        installation_notes = ${updateData.installation_notes || existingCustomer[0].installation_notes || null},
        technical_contact = ${updateData.technical_contact || existingCustomer[0].technical_contact || null},
        technical_contact_phone = ${updateData.technical_contact_phone || existingCustomer[0].technical_contact_phone || null},
        emergency_contact_name = ${updateData.emergency_contact_name || existingCustomer[0].emergency_contact_name || null},
        emergency_contact_phone = ${updateData.emergency_contact_phone || existingCustomer[0].emergency_contact_phone || null},
        emergency_contact_relationship = ${updateData.emergency_contact_relationship || existingCustomer[0].emergency_contact_relationship || null},
        portal_login_id = ${updateData.portal_login_id || existingCustomer[0].portal_login_id || ""},
        portal_username = ${updateData.portal_username || existingCustomer[0].portal_username || ""},
        portal_password = ${updateData.portal_password || existingCustomer[0].portal_password || ""},
        preferred_contact_method = ${updateData.preferred_contact_method || existingCustomer[0].preferred_contact_method || "email"},
        referral_source = ${updateData.referral_source || existingCustomer[0].referral_source || ""},
        sales_rep = ${updateData.sales_rep || existingCustomer[0].sales_rep || ""},
        account_manager = ${updateData.account_manager || existingCustomer[0].account_manager || ""},
        special_requirements = ${updateData.special_requirements || existingCustomer[0].special_requirements || ""},
        internal_notes = ${updateData.internal_notes || existingCustomer[0].internal_notes || ""},
        customer_type = ${updateData.customer_type || existingCustomer[0].customer_type || "individual"},
        account_number = ${updateData.account_number || existingCustomer[0].account_number || ""},
        assigned_staff_id = ${updateData.assigned_staff_id || existingCustomer[0].assigned_staff_id || null},
        updated_at = NOW()
      WHERE id = ${customerId}
      RETURNING *
    `

    await sql`DELETE FROM customer_phone_numbers WHERE customer_id = ${customerId}`

    if (updateData.phone_primary) {
      const phoneId = await nextId(sql, 'customer_phone_numbers')
      await sql`
        INSERT INTO customer_phone_numbers (id, customer_id, phone_number, type, is_primary)
        VALUES (${phoneId}, ${customerId}, ${updateData.phone_primary}, 'mobile', true)
      `
    }

    if (updateData.phone_secondary) {
      const phoneId = await nextId(sql, 'customer_phone_numbers')
      await sql`
        INSERT INTO customer_phone_numbers (id, customer_id, phone_number, type, is_primary)
        VALUES (${phoneId}, ${customerId}, ${updateData.phone_secondary}, 'mobile', false)
      `
    }

    if (updateData.phone_office) {
      const phoneId = await nextId(sql, 'customer_phone_numbers')
      await sql`
        INSERT INTO customer_phone_numbers (id, customer_id, phone_number, type, is_primary)
        VALUES (${phoneId}, ${customerId}, ${updateData.phone_office}, 'office', false)
      `
    }

    if (updateData.phone_numbers && Array.isArray(updateData.phone_numbers)) {
      for (const phoneData of updateData.phone_numbers) {
        if (phoneData.number) {
          const phoneId = await nextId(sql, 'customer_phone_numbers')
          await sql`
            INSERT INTO customer_phone_numbers (id, customer_id, phone_number, type, is_primary)
            VALUES (${phoneId}, ${customerId}, ${phoneData.number}, ${phoneData.type || "mobile"}, ${phoneData.isPrimary || false})
          `
        }
      }
    }

    await sql`DELETE FROM customer_emergency_contacts WHERE customer_id = ${customerId}`

    if (updateData.emergency_contact_name && updateData.emergency_contact_phone) {
      const ecId = await nextId(sql, 'customer_emergency_contacts')
      await sql`
        INSERT INTO customer_emergency_contacts (id, customer_id, name, phone, relationship)
        VALUES (
          ${ecId},
          ${customerId}, 
          ${updateData.emergency_contact_name}, 
          ${updateData.emergency_contact_phone}, 
          ${updateData.emergency_contact_relationship || null}
        )
      `
    }

    if (updateData.emergency_contacts && Array.isArray(updateData.emergency_contacts)) {
      for (const contact of updateData.emergency_contacts) {
        if (contact.name && contact.phone) {
          const ecId = await nextId(sql, 'customer_emergency_contacts')
          await sql`
            INSERT INTO customer_emergency_contacts (id, customer_id, name, phone, email, relationship)
            VALUES (${ecId}, ${customerId}, ${contact.name}, ${contact.phone}, ${contact.email || ""}, ${contact.relationship || ""})
          `
        }
      }
    }

    if (
      (updateData.customer_type === "company" || updateData.customer_type === "school") &&
      updateData.contact_person
    ) {
      await sql`DELETE FROM customer_contacts WHERE customer_id = ${customerId}`
      const ccId = await nextId(sql, 'customer_contacts')
      await sql`
        INSERT INTO customer_contacts (id, customer_id, name, contact_type, is_primary)
        VALUES (${ccId}, ${customerId}, ${updateData.contact_person}, 'primary', true)
      `
    }

    if (updateData.selected_plan) {
      await sql`DELETE FROM customer_services WHERE customer_id = ${customerId}`
      await sql`
        INSERT INTO customer_services (customer_id, service_plan_id, status, start_date)
        VALUES (${customerId}, ${updateData.selected_plan.id}, 'active', NOW())
      `
    }

    if (updateData.selected_equipment && Array.isArray(updateData.selected_equipment)) {
      await sql`UPDATE inventory_items SET status = 'available' WHERE status = 'assigned'`

      for (const item of updateData.selected_equipment) {
        if (item.id) {
          await sql`
            UPDATE inventory_items 
            SET status = 'assigned', 
                location = ${`Customer: ${existingCustomer[0].first_name} ${existingCustomer[0].last_name}`},
                updated_at = NOW()
            WHERE id = ${item.id}
          `
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
      customer: result[0],
    })
  } catch (error) {
    console.error("Update customer error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update customer",
      },
      { status: 500 },
    )
  }
}

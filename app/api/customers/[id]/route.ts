import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
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
        c.*,
        COALESCE(
          JSON_AGG(
            CASE WHEN cpn.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'number', cpn.phone_number,
                'type', cpn.type,
                'isPrimary', cpn.is_primary
              )
            END
          ) FILTER (WHERE cpn.id IS NOT NULL), 
          '[]'::json
        ) as phone_numbers,
        COALESCE(
          JSON_AGG(
            CASE WHEN cec.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'name', cec.name,
                'phone', cec.phone,
                'email', cec.email,
                'relationship', cec.relationship
              )
            END
          ) FILTER (WHERE cec.id IS NOT NULL),
          '[]'::json
        ) as emergency_contacts,
        COALESCE(
          JSON_AGG(
            CASE WHEN cs.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id', cs.id,
                'service_plan_id', cs.service_plan_id,
                'status', cs.status,
                'start_date', cs.start_date,
                'plan_name', sp.name,
                'price', sp.price,
                'upload_speed', sp.upload_speed,
                'download_speed', sp.download_speed,
                'data_limit', sp.data_limit
              )
            END
          ) FILTER (WHERE cs.id IS NOT NULL),
          '[]'::json
        ) as services
      FROM customers c
      LEFT JOIN customer_phone_numbers cpn ON c.id = cpn.customer_id
      LEFT JOIN customer_emergency_contacts cec ON c.id = cec.customer_id
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE c.id = ${customerId}
      GROUP BY c.id
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

    const customer = customerResult[0]

    // Get available inventory items (separate query as it's not customer-specific)
    const inventoryResult = await sql`
      SELECT 
        ii.*,
        ii.name as item_name,
        ii.category,
        ii.unit_cost as price
      FROM inventory_items ii
      WHERE ii.status = 'available'
      ORDER BY ii.name
    `

    return NextResponse.json({
      success: true,
      ...customer,
      inventory_items: inventoryResult,
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

    const result = await sql`
      UPDATE customers 
      SET 
        first_name = ${updateData.first_name || existingCustomer[0].first_name || ""},
        last_name = ${updateData.last_name || existingCustomer[0].last_name || ""},
        email = ${updateData.email || existingCustomer[0].email},
        phone = ${updateData.phone_primary || updateData.phone || existingCustomer[0].phone},
        id_number = ${updateData.national_id || updateData.id_number || existingCustomer[0].id_number || null},
        status = ${updateData.status || existingCustomer[0].status},
        address = ${updateData.physical_address || updateData.address || existingCustomer[0].address || ""},
        installation_address = ${updateData.installation_address || updateData.physical_address || existingCustomer[0].installation_address || ""},
        billing_address = ${updateData.billing_address || existingCustomer[0].billing_address || ""},
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
        business_name = ${updateData.name || updateData.business_name || existingCustomer[0].business_name || ""},
        business_type = ${updateData.business_type || updateData.business_reg_no || existingCustomer[0].business_type || ""},
        tax_number = ${updateData.vat_pin || updateData.tax_id || updateData.tax_number || existingCustomer[0].tax_number || ""},
        portal_username = ${updateData.portal_username || existingCustomer[0].portal_username || ""},
        portal_password = ${updateData.portal_password || existingCustomer[0].portal_password || ""},
        preferred_contact_method = ${updateData.preferred_contact_method || existingCustomer[0].preferred_contact_method || "email"},
        referral_source = ${updateData.referral_source || existingCustomer[0].referral_source || ""},
        service_preferences = ${
          updateData.special_requirements ||
          updateData.internal_notes ||
          updateData.sales_rep ||
          updateData.account_manager
            ? JSON.stringify({
                special_requirements: updateData.special_requirements,
                internal_notes: updateData.internal_notes,
                sales_rep: updateData.sales_rep,
                account_manager: updateData.account_manager,
              })
            : existingCustomer[0].service_preferences || null
        },
        customer_type = ${updateData.customer_type || existingCustomer[0].customer_type || "individual"},
        account_number = ${updateData.account_number || existingCustomer[0].account_number || ""},
        assigned_staff_id = ${updateData.assigned_staff_id || existingCustomer[0].assigned_staff_id || null},
        updated_at = NOW()
      WHERE id = ${customerId}
      RETURNING *
    `

    await sql`DELETE FROM customer_phone_numbers WHERE customer_id = ${customerId}`

    if (updateData.phone_primary) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary)
        VALUES (${customerId}, ${updateData.phone_primary}, 'mobile', true)
      `
    }

    if (updateData.phone_secondary) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary)
        VALUES (${customerId}, ${updateData.phone_secondary}, 'mobile', false)
      `
    }

    if (updateData.phone_office) {
      await sql`
        INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary)
        VALUES (${customerId}, ${updateData.phone_office}, 'office', false)
      `
    }

    if (updateData.phone_numbers && Array.isArray(updateData.phone_numbers)) {
      for (const phoneData of updateData.phone_numbers) {
        if (phoneData.number) {
          await sql`
            INSERT INTO customer_phone_numbers (customer_id, phone_number, type, is_primary)
            VALUES (${customerId}, ${phoneData.number}, ${phoneData.type || "mobile"}, ${phoneData.isPrimary || false})
          `
        }
      }
    }

    await sql`DELETE FROM customer_emergency_contacts WHERE customer_id = ${customerId}`

    if (updateData.emergency_contact_name && updateData.emergency_contact_phone) {
      await sql`
        INSERT INTO customer_emergency_contacts (customer_id, name, phone, relationship)
        VALUES (
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
          await sql`
            INSERT INTO customer_emergency_contacts (customer_id, name, phone, email, relationship)
            VALUES (${customerId}, ${contact.name}, ${contact.phone}, ${contact.email || ""}, ${contact.relationship || ""})
          `
        }
      }
    }

    if (
      (updateData.customer_type === "company" || updateData.customer_type === "school") &&
      updateData.contact_person
    ) {
      await sql`DELETE FROM customer_contacts WHERE customer_id = ${customerId}`
      await sql`
        INSERT INTO customer_contacts (customer_id, name, contact_type, is_primary)
        VALUES (${customerId}, ${updateData.contact_person}, 'primary', true)
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

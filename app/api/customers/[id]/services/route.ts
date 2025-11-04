import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const serviceData = await request.json()

    console.log("[v0] Received service data:", serviceData)

    const servicePlanId = serviceData.service_plan_id || serviceData.plan
    const ipAddress = serviceData.ip_address || serviceData.ipAddress
    const connectionType = serviceData.connection_type || serviceData.connectionType || "fiber"
    const deviceId = serviceData.device_id || serviceData.deviceId || null

    const [servicePlan] = await sql`
      SELECT price, name FROM service_plans WHERE id = ${servicePlanId}
    `

    if (!servicePlan) {
      console.error("[v0] Service plan not found:", servicePlanId)
      return NextResponse.json(
        {
          success: false,
          error: "Service plan not found",
        },
        { status: 404 },
      )
    }

    console.log("[v0] Found service plan:", servicePlan)

    const monthlyFee = serviceData.monthly_fee || servicePlan.price

    const result = await sql`
      INSERT INTO customer_services (
        customer_id, service_plan_id, status, monthly_fee, 
        start_date, end_date, ip_address, device_id, 
        connection_type, config_id, created_at
      ) VALUES (
        ${customerId}, 
        ${servicePlanId}, 
        ${serviceData.status || "active"},
        ${monthlyFee}, 
        ${serviceData.start_date || new Date().toISOString().split("T")[0]},
        ${serviceData.end_date || null},
        ${ipAddress}, 
        ${deviceId}, 
        ${connectionType},
        ${serviceData.config_id || null},
        NOW()
      ) RETURNING *
    `

    console.log("[v0] Service added successfully:", result[0])

    return NextResponse.json({ success: true, service: result[0] })
  } catch (error) {
    console.error("[v0] Error adding service:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add service",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    const services = await sql`
      SELECT 
        cs.*,
        sp.name as service_name,
        sp.description as service_description,
        sp.download_speed,
        sp.upload_speed,
        sp.data_limit
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId}
      ORDER BY cs.created_at DESC
    `

    return NextResponse.json({ success: true, services })
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const { serviceId, action, ...updateData } = await request.json()

    let result

    if (action === "suspend") {
      result = await sql`
        UPDATE customer_services 
        SET status = 'suspended'
        WHERE id = ${serviceId} AND customer_id = ${customerId}
        RETURNING *
      `
    } else if (action === "reactivate") {
      result = await sql`
        UPDATE customer_services 
        SET status = 'active'
        WHERE id = ${serviceId} AND customer_id = ${customerId}
        RETURNING *
      `
    } else {
      const allowedFields = [
        "service_plan_id",
        "status",
        "monthly_fee",
        "start_date",
        "end_date",
        "ip_address",
        "device_id",
        "connection_type",
        "config_id",
      ]
      const updateFields = []
      const updateValues = []

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && allowedFields.includes(key)) {
          updateFields.push(`${key} = $${updateValues.length + 1}`)
          updateValues.push(value)
        }
      })

      if (updateFields.length > 0) {
        updateValues.push(serviceId, customerId)
        result = await sql`
          UPDATE customer_services 
          SET ${sql.unsafe(updateFields.join(", "))}
          WHERE id = $${updateValues.length - 1} AND customer_id = $${updateValues.length}
          RETURNING *
        `
      }
    }

    return NextResponse.json({ success: true, service: result?.[0] })
  } catch (error) {
    console.error("Error updating service:", error)
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get("serviceId")

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 })
    }

    const serviceDetails = await sql`
      SELECT cs.*, sp.name as service_name, sp.price as service_price
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.id = ${serviceId} AND cs.customer_id = ${customerId}
    `

    if (serviceDetails.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const service = serviceDetails[0]

    const creditNoteResult = await sql`
      INSERT INTO invoices (
        customer_id,
        amount,
        subtotal,
        tax_amount,
        due_date,
        status,
        description,
        service_period_start,
        service_period_end,
        invoice_number,
        invoice_type,
        created_at
      ) VALUES (
        ${customerId},
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        0,
        CURRENT_DATE,
        'paid',
        'Credit note for deleted service: ' || COALESCE(${service.service_name}, 'Unknown Service'),
        CURRENT_DATE,
        CURRENT_DATE,
        'CN-' || ${customerId} || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || ${serviceId},
        'credit_note',
        NOW()
      ) RETURNING *
    `

    await sql`
      INSERT INTO invoice_items (
        invoice_id,
        description,
        quantity,
        unit_price,
        total_amount,
        service_id
      ) VALUES (
        ${creditNoteResult[0].id},
        'Account adjustment - Service deletion credit: ' || COALESCE(${service.service_name}, 'Unknown Service'),
        1,
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        ${-Math.abs(service.monthly_fee || service.service_price || 0)},
        ${serviceId}
      )
    `

    await sql`
      INSERT INTO account_balances (customer_id, balance, last_updated)
      VALUES (${customerId}, ${Math.abs(service.monthly_fee || service.service_price || 0)}, NOW())
      ON CONFLICT (customer_id) 
      DO UPDATE SET 
        balance = account_balances.balance + ${Math.abs(service.monthly_fee || service.service_price || 0)},
        last_updated = NOW()
    `

    await sql`
      INSERT INTO system_logs (category, message, metadata, created_at)
      VALUES (
        'service_deletion',
        'Service deleted with credit note issued for customer ' || ${customerId},
        '{"customer_id": ' || ${customerId} || ', "service_id": ' || ${serviceId} || ', "credit_amount": ' || ${Math.abs(service.monthly_fee || service.service_price || 0)} || ', "credit_note_id": ' || ${creditNoteResult[0].id} || '}',
        NOW()
      )
    `

    const result = await sql`
      DELETE FROM customer_services 
      WHERE id = ${serviceId} AND customer_id = ${customerId}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Service deleted successfully and credit note issued",
      creditNote: creditNoteResult[0],
      creditAmount: Math.abs(service.monthly_fee || service.service_price || 0),
    })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 })
  }
}

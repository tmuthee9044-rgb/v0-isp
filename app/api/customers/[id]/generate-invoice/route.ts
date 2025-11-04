import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { serviceId } = await request.json()

    // Get customer and service details
    const customerService = await sql`
      SELECT 
        c.first_name, c.last_name, c.email, c.address,
        cs.monthly_fee, cs.start_date,
        sp.name as service_name, sp.description
      FROM customers c
      JOIN customer_services cs ON c.id = cs.customer_id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE c.id = ${customerId} AND cs.id = ${serviceId}
    `

    if (customerService.length === 0) {
      return NextResponse.json({ success: false, error: "Customer or service not found" }, { status: 404 })
    }

    const service = customerService[0]
    const invoiceNumber = `INV-${Date.now()}-${customerId}`
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30) // 30 days from now

    // Create invoice
    const invoice = await sql`
      INSERT INTO invoices (
        customer_id, invoice_number, amount, due_date, status, created_at
      ) VALUES (
        ${customerId},
        ${invoiceNumber},
        ${service.monthly_fee},
        ${dueDate.toISOString().split("T")[0]},
        'pending',
        NOW()
      ) RETURNING id
    `

    // Log the invoice generation
    await sql`
      INSERT INTO admin_logs (
        action, resource_type, resource_id, admin_id, 
        new_values, created_at
      ) VALUES (
        'create',
        'invoice',
        ${invoice[0].id},
        1,
        ${JSON.stringify({
          invoice_number: invoiceNumber,
          amount: service.monthly_fee,
          service_id: serviceId,
          auto_generated: true,
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Invoice generated successfully",
      invoice: {
        id: invoice[0].id,
        invoice_number: invoiceNumber,
        amount: service.monthly_fee,
        due_date: dueDate.toISOString().split("T")[0],
      },
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ success: false, error: "Failed to generate invoice" }, { status: 500 })
  }
}

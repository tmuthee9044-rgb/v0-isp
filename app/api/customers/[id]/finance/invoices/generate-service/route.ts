import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { service_ids } = await request.json()

    const services = await sql`
      SELECT cs.*, sp.name as service_name, cs.monthly_fee
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.id = ANY(${service_ids}) AND cs.customer_id = ${customerId}
    `

    const totalAmount = services.reduce(
      (sum: number, service: any) => sum + Number.parseFloat(service.monthly_fee || "0"),
      0,
    )

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    const invoiceDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const servicePeriodStart = new Date()
    const servicePeriodEnd = new Date()
    servicePeriodEnd.setMonth(servicePeriodEnd.getMonth() + 1)

    const [invoice] = await sql`
      INSERT INTO invoices (
        invoice_number, customer_id, amount, subtotal, tax_amount,
        status, invoice_date, due_date, service_period_start, service_period_end
      )
      VALUES (
        ${invoiceNumber}, ${customerId}, ${totalAmount}, ${totalAmount}, 0,
        'pending', ${invoiceDate.toISOString()}, ${dueDate.toISOString()}, 
        ${servicePeriodStart.toISOString()}, ${servicePeriodEnd.toISOString()}
      )
      RETURNING *
    `

    for (const service of services) {
      await sql`
        INSERT INTO invoice_items (
          invoice_id, description, quantity, unit_price, total_amount, service_plan_name
        )
        VALUES (
          ${invoice.id}, ${service.service_name + " - Monthly Service"}, 1,
          ${service.monthly_fee}, ${service.monthly_fee}, ${service.service_name}
        )
      `
    }

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    console.error("Error generating service invoice:", error)
    return NextResponse.json({ success: false, error: "Failed to generate service invoice" }, { status: 500 })
  }
}

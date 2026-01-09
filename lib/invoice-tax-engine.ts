import { getSql } from "@/lib/db"

export interface InvoiceData {
  customerId: string
  serviceId: string
  subtotal: number
  description: string
}

/**
 * Invoice & Tax Engine - KRA-ready
 * Per design: Invoices are derived, not drivers
 */
export class InvoiceTaxEngine {
  /**
   * Generate invoice with tax calculation
   */
  static async generateInvoice(data: InvoiceData): Promise<string> {
    const sql = await getSql()

    // Get applicable taxes for the service
    const [service] = await sql`
      SELECT sp.id as plan_id
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.id = ${data.serviceId}::uuid
    `

    if (!service) {
      throw new Error("Service not found")
    }

    // Calculate taxes
    const taxes = await sql`
      SELECT t.rate, t.is_inclusive
      FROM plan_taxes pt
      JOIN taxes t ON pt.tax_id = t.id
      WHERE pt.plan_id = ${service.plan_id} AND t.is_active = true
    `

    let taxAmount = 0
    for (const tax of taxes) {
      if (tax.is_inclusive) {
        // Tax already included in subtotal
        taxAmount += data.subtotal * (tax.rate / (100 + tax.rate))
      } else {
        // Tax added on top
        taxAmount += data.subtotal * (tax.rate / 100)
      }
    }

    const total = data.subtotal + taxAmount

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`

    // Insert invoice
    const [invoice] = await sql`
      INSERT INTO invoices (
        customer_id, service_id, invoice_number,
        subtotal, tax, total_amount, amount,
        description, status, issued_at
      ) VALUES (
        ${data.customerId}::uuid, ${data.serviceId}::uuid, ${invoiceNumber},
        ${data.subtotal}, ${taxAmount}, ${total}, ${total},
        ${data.description}, 'issued', NOW()
      ) RETURNING id
    `

    return invoice.id
  }

  /**
   * Export invoices for KRA compliance
   */
  static async exportForKRA(startDate: Date, endDate: Date): Promise<any[]> {
    const sql = await getSql()

    const invoices = await sql`
      SELECT 
        i.invoice_number,
        i.total_amount as total,
        i.tax as vat,
        c.first_name || ' ' || c.last_name as customer_name,
        c.kra_pin as pin,
        i.issued_at
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id::uuid
      WHERE i.issued_at BETWEEN ${startDate} AND ${endDate}
      AND i.status = 'paid'
      ORDER BY i.issued_at
    `

    return invoices
  }
}

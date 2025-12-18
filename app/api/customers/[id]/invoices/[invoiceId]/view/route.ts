import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string; invoiceId: string } }) {
  try {
    const sql = await getSql()
    const customerId = params.id
    const invoiceId = params.invoiceId

    // Fetch invoice with customer details
    const invoiceResult = await sql`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        c.account_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ${invoiceId} 
        AND i.customer_id = ${customerId}
      LIMIT 1
    `

    if (invoiceResult.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoiceResult[0]

    // Fetch invoice items/line items
    const itemsResult = await sql`
      SELECT *
      FROM invoice_items
      WHERE invoice_id = ${invoiceId}
      ORDER BY id
    `

    // Return HTML invoice view
    const html = generateInvoiceHTML(invoice, itemsResult)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("Error viewing invoice:", error)
    return NextResponse.json({ error: "Failed to view invoice" }, { status: 500 })
  }
}

function generateInvoiceHTML(invoice: any, items: any[]) {
  const subtotal = items.reduce((sum, item) => sum + Number.parseFloat(item.total || 0), 0)
  const tax = Number.parseFloat(invoice.tax_amount || 0)
  const total = Number.parseFloat(invoice.total_amount || 0)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f5f5f5; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 60px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .company-info h1 { font-size: 32px; margin-bottom: 8px; color: #2563eb; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { font-size: 24px; margin-bottom: 8px; }
    .invoice-info p { color: #666; }
    .billing-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 40px 0; }
    .billing-block h3 { font-size: 14px; text-transform: uppercase; color: #666; margin-bottom: 12px; }
    .billing-block p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin: 40px 0; }
    thead { background: #f9fafb; }
    th { text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e7eb; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; margin-top: 20px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-row.total { font-size: 20px; font-weight: bold; border-top: 2px solid #000; padding-top: 12px; margin-top: 8px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px; }
    @media print {
      body { padding: 0; background: white; }
      .invoice-container { box-shadow: none; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>Trust Waves ISP</h1>
        <p>Internet Service Provider</p>
        <p>Email: billing@trustwaves.co.ke</p>
        <p>Phone: +254 XXX XXX XXX</p>
      </div>
      <div class="invoice-info">
        <h2>INVOICE</h2>
        <p><strong>${invoice.invoice_number}</strong></p>
        <p>Date: ${new Date(invoice.created_at).toLocaleDateString()}</p>
        ${invoice.due_date ? `<p>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ""}
        <p class="status-badge status-${invoice.status}">${invoice.status}</p>
      </div>
    </div>

    <div class="billing-section">
      <div class="billing-block">
        <h3>Bill To:</h3>
        <p><strong>${invoice.customer_name}</strong></p>
        <p>Account: ${invoice.account_number || "N/A"}</p>
        ${invoice.customer_address ? `<p>${invoice.customer_address}</p>` : ""}
        ${invoice.customer_email ? `<p>${invoice.customer_email}</p>` : ""}
        ${invoice.customer_phone ? `<p>${invoice.customer_phone}</p>` : ""}
      </div>
      <div class="billing-block">
        <h3>Invoice Details:</h3>
        <p>Invoice ID: #${invoice.id}</p>
        <p>Status: <span class="status-badge status-${invoice.status}">${invoice.status}</span></p>
        ${invoice.due_date ? `<p>Payment Due: ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${
          items.length > 0
            ? items
                .map(
                  (item) => `
          <tr>
            <td>${item.description || item.item_name || "Service"}</td>
            <td class="text-right">${item.quantity || 1}</td>
            <td class="text-right">KES ${Number.parseFloat(item.unit_price || item.amount || 0).toFixed(2)}</td>
            <td class="text-right">KES ${Number.parseFloat(item.total || item.amount || 0).toFixed(2)}</td>
          </tr>
        `,
                )
                .join("")
            : `
          <tr>
            <td>Internet Service</td>
            <td class="text-right">1</td>
            <td class="text-right">KES ${Number.parseFloat(invoice.amount || 0).toFixed(2)}</td>
            <td class="text-right">KES ${Number.parseFloat(invoice.amount || 0).toFixed(2)}</td>
          </tr>
        `
        }
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>KES ${subtotal > 0 ? subtotal.toFixed(2) : Number.parseFloat(invoice.amount || 0).toFixed(2)}</span>
      </div>
      ${
        tax > 0
          ? `
      <div class="totals-row">
        <span>Tax:</span>
        <span>KES ${tax.toFixed(2)}</span>
      </div>
      `
          : ""
      }
      <div class="totals-row total">
        <span>Total Amount:</span>
        <span>KES ${total.toFixed(2)}</span>
      </div>
    </div>

    <div class="footer">
      <p><strong>Payment Instructions:</strong></p>
      <p>Please make payment to Trust Waves ISP via MPESA or Bank Transfer</p>
      <p>MPESA: Pay Bill 123456 | Account: ${invoice.account_number || invoice.customer_name}</p>
      <p>Thank you for your business!</p>
    </div>
  </div>
  
  <script>
    // Auto-print option
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('print') === 'true') {
      window.print();
    }
  </script>
</body>
</html>
  `
}

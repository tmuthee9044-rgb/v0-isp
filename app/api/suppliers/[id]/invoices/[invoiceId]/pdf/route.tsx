import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string; invoiceId: string } }) {
  try {
    const { id: supplierId, invoiceId } = params

    console.log("[v0] Generating PDF for supplier invoice:", invoiceId)

    // Fetch invoice with supplier and items
    const invoiceResult = await sql`
      SELECT 
        si.*,
        s.name as supplier_name,
        s.company_name as supplier_company,
        s.address as supplier_address,
        s.email as supplier_email,
        s.phone as supplier_phone,
        po.order_number as po_number,
        cp.company_name as company_name,
        cp.address as company_address,
        cp.email as company_email,
        cp.phone as company_phone,
        cp.tax_number as company_tax_number
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      LEFT JOIN purchase_orders po ON si.purchase_order_id = po.id
      LEFT JOIN company_profiles cp ON cp.id = 1
      WHERE si.id = ${invoiceId} AND si.supplier_id = ${supplierId}
    `

    if (invoiceResult.length === 0) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoiceResult[0]

    // Fetch invoice items
    const itemsResult = await sql`
      SELECT 
        sii.*,
        ii.name as item_name,
        ii.sku,
        ii.description
      FROM supplier_invoice_items sii
      LEFT JOIN inventory_items ii ON sii.inventory_item_id = ii.id
      WHERE sii.invoice_id = ${invoiceId}
      ORDER BY sii.id
    `

    // Generate HTML for PDF
    const html = generateInvoiceHTML(invoice, itemsResult)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("[v0] Error generating PDF:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 },
    )
  }
}

function generateInvoiceHTML(invoice: any, items: any[]): string {
  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Supplier Invoice ${invoice.invoice_number}</title>
  <style>
    @media print {
      @page { margin: 0.5in; }
      body { margin: 0; }
      .no-print { display: none; }
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    
    .company-info h1 {
      color: #2563eb;
      font-size: 24pt;
      margin-bottom: 5px;
    }
    
    .company-info p {
      color: #666;
      font-size: 10pt;
      line-height: 1.4;
    }
    
    .invoice-title {
      text-align: right;
    }
    
    .invoice-title h2 {
      font-size: 28pt;
      color: #2563eb;
      margin-bottom: 10px;
    }
    
    .invoice-title p {
      font-size: 11pt;
      color: #666;
    }
    
    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .detail-section h3 {
      font-size: 12pt;
      color: #2563eb;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .detail-section p {
      margin-bottom: 5px;
      font-size: 10pt;
    }
    
    .detail-section strong {
      display: inline-block;
      width: 120px;
      color: #666;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    thead {
      background: #2563eb;
      color: white;
    }
    
    thead th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    tbody td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10pt;
    }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    
    .totals {
      margin-left: auto;
      width: 350px;
      margin-bottom: 40px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 11pt;
    }
    
    .totals-row.subtotal {
      border-top: 1px solid #e5e7eb;
    }
    
    .totals-row.tax {
      color: #666;
    }
    
    .totals-row.total {
      border-top: 2px solid #2563eb;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 14pt;
      font-weight: bold;
      color: #2563eb;
    }
    
    .payment-info {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .payment-info h3 {
      color: #2563eb;
      margin-bottom: 10px;
      font-size: 12pt;
    }
    
    .payment-info p {
      margin-bottom: 5px;
      font-size: 10pt;
    }
    
    .footer {
      text-align: center;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 9pt;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11pt;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .print-button:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Print / Download PDF</button>
  
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>${invoice.company_name || "Your Company"}</h1>
        <p>${invoice.company_address || ""}</p>
        <p>Email: ${invoice.company_email || ""}</p>
        <p>Phone: ${invoice.company_phone || ""}</p>
        ${invoice.company_tax_number ? `<p>Tax ID: ${invoice.company_tax_number}</p>` : ""}
      </div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <p><strong>${invoice.invoice_number}</strong></p>
        <p class="status-badge status-${invoice.status?.toLowerCase() || "pending"}">
          ${invoice.status || "PENDING"}
        </p>
      </div>
    </div>
    
    <div class="invoice-details">
      <div class="detail-section">
        <h3>Bill To</h3>
        <p><strong>Supplier:</strong> ${invoice.supplier_company || invoice.supplier_name}</p>
        ${invoice.supplier_address ? `<p><strong>Address:</strong> ${invoice.supplier_address}</p>` : ""}
        ${invoice.supplier_email ? `<p><strong>Email:</strong> ${invoice.supplier_email}</p>` : ""}
        ${invoice.supplier_phone ? `<p><strong>Phone:</strong> ${invoice.supplier_phone}</p>` : ""}
      </div>
      <div class="detail-section">
        <h3>Invoice Details</h3>
        <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoice_date)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
        <p><strong>Payment Terms:</strong> Net ${invoice.payment_terms || 30} days</p>
        ${invoice.po_number ? `<p><strong>PO Number:</strong> ${invoice.po_number}</p>` : ""}
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width: 10%">#</th>
          <th style="width: 35%">Item Description</th>
          <th style="width: 15%">SKU</th>
          <th style="width: 10%" class="text-center">Qty</th>
          <th style="width: 15%" class="text-right">Unit Cost</th>
          <th style="width: 15%" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${item.item_name || "Item"}</strong>
              ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ""}
            </td>
            <td>${item.sku || "-"}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${formatCurrency(Number.parseFloat(item.unit_cost || 0))}</td>
            <td class="text-right">${formatCurrency(Number.parseFloat(item.total_amount || 0))}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-row subtotal">
        <span>Subtotal:</span>
        <span>${formatCurrency(Number.parseFloat(invoice.subtotal || 0))}</span>
      </div>
      <div class="totals-row tax">
        <span>Tax (16% VAT):</span>
        <span>${formatCurrency(Number.parseFloat(invoice.tax_amount || 0))}</span>
      </div>
      <div class="totals-row total">
        <span>Total Amount:</span>
        <span>${formatCurrency(Number.parseFloat(invoice.total_amount || 0))}</span>
      </div>
      ${
        invoice.paid_amount > 0
          ? `
      <div class="totals-row">
        <span>Amount Paid:</span>
        <span>${formatCurrency(Number.parseFloat(invoice.paid_amount || 0))}</span>
      </div>
      <div class="totals-row total">
        <span>Balance Due:</span>
        <span>${formatCurrency(Number.parseFloat(invoice.total_amount || 0) - Number.parseFloat(invoice.paid_amount || 0))}</span>
      </div>
      `
          : ""
      }
    </div>
    
    <div class="payment-info">
      <h3>Payment Information</h3>
      <p><strong>Payment Terms:</strong> Net ${invoice.payment_terms || 30} days from invoice date</p>
      <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
      ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
    </div>
    
    <div class="footer">
      <p><strong>Thank you for your business!</strong></p>
      <p>This is a computer-generated invoice and does not require a signature.</p>
      <p>For any queries regarding this invoice, please contact us at ${invoice.company_email || "your email"}</p>
    </div>
  </div>
  
  <script>
    // Auto-print functionality (optional)
    // window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `
}

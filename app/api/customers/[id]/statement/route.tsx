import { type NextRequest, NextResponse } from "next/server"
import { getSqlConnection } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    console.log("[v0] Generating statement for customer:", customerId)

    const sql = getSqlConnection()

    console.log("[v0] Fetching company configuration from system_config...")
    const companyConfigResult = await sql`
      SELECT key, value FROM system_config 
      WHERE key IN ('company_name', 'company_email', 'company_phone', 'company_address', 
                    'company_website', 'company_registration', 'company_tax_id', 'primary_color')
    `

    const companyConfig: Record<string, string> = {}
    companyConfigResult.forEach((row: { key: string; value: string }) => {
      companyConfig[row.key] = row.value
    })

    console.log("[v0] Company config loaded:", Object.keys(companyConfig))

    const primaryColor = companyConfig.primary_color || "#2563eb"

    console.log("[v0] Fetching customer details...")
    const customerResult = await sql`
      SELECT 
        c.*,
        CASE 
          WHEN c.business_name IS NOT NULL AND c.business_name != '' THEN c.business_name
          ELSE CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))
        END as name
      FROM customers c
      WHERE c.id = ${customerId}
    `

    if (customerResult.length === 0) {
      console.error("[v0] Customer not found:", customerId)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const customer = customerResult[0]
    console.log("[v0] Customer found:", customer.name)

    console.log("[v0] Fetching billing summary...")
    const summaryResult = await sql`
      SELECT 
        COALESCE(SUM(i.amount), 0) as total_invoiced,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COALESCE(SUM(cn.amount), 0) as total_credit_notes
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id
      LEFT JOIN payments p ON p.customer_id = c.id AND p.status = 'completed'
      LEFT JOIN credit_notes cn ON cn.customer_id = c.id AND cn.status = 'approved'
      WHERE c.id = ${customerId}
      GROUP BY c.id
    `

    const summary = summaryResult[0] || { total_invoiced: 0, total_paid: 0, total_credit_notes: 0 }
    const balance = Number(summary.total_paid) + Number(summary.total_credit_notes) - Number(summary.total_invoiced)

    console.log("[v0] Billing summary:", {
      total_invoiced: summary.total_invoiced,
      total_paid: summary.total_paid,
      total_credit_notes: summary.total_credit_notes,
      balance,
    })

    console.log("[v0] Fetching finance documents...")
    const invoices = await sql`
      SELECT 
        id,
        'invoice' as type,
        invoice_number as reference_number,
        description,
        amount as total_amount,
        status,
        created_at,
        due_date
      FROM invoices
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
    `

    const payments = await sql`
      SELECT 
        id,
        'payment' as type,
        transaction_id as reference_number,
        payment_method as description,
        amount as total_amount,
        status,
        created_at,
        NULL as due_date
      FROM payments
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
    `

    const creditNotes = await sql`
      SELECT 
        id,
        'credit_note' as type,
        credit_note_number as reference_number,
        reason as description,
        amount as total_amount,
        status,
        created_at,
        NULL as due_date
      FROM credit_notes
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
    `

    console.log("[v0] Finance documents fetched:", {
      invoices: invoices.length,
      payments: payments.length,
      creditNotes: creditNotes.length,
    })

    const allDocuments = [...invoices, ...payments, ...creditNotes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Customer Statement - ${customer.name}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 40px;
              color: #1f2937;
              line-height: 1.6;
            }
            
            .letterhead {
              background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%);
              color: white;
              padding: 40px;
              margin: -40px -40px 40px -40px;
              border-radius: 0;
            }
            
            .letterhead-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .company-info h1 {
              margin: 0 0 10px 0;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            
            .company-info p {
              margin: 4px 0;
              opacity: 0.95;
              font-size: 14px;
            }
            
            .document-title {
              text-align: right;
            }
            
            .document-title h2 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            
            .document-title p {
              margin: 8px 0 0 0;
              opacity: 0.9;
              font-size: 14px;
            }
            
            .customer-info {
              background: #f9fafb;
              padding: 24px;
              border-radius: 8px;
              margin-bottom: 30px;
              border-left: 4px solid ${primaryColor};
            }
            
            .customer-info h3 {
              margin: 0 0 16px 0;
              color: ${primaryColor};
              font-size: 18px;
              font-weight: 600;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            
            .info-row {
              display: flex;
              gap: 8px;
            }
            
            .info-row strong {
              color: #6b7280;
              min-width: 120px;
              font-weight: 500;
            }
            
            .balance-summary {
              background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
              padding: 24px;
              margin-bottom: 30px;
              border-radius: 8px;
              border: 2px solid #e5e7eb;
            }
            
            .balance-summary h3 {
              margin: 0 0 20px 0;
              color: #111827;
              font-size: 18px;
              font-weight: 600;
            }
            
            .balance-row {
              display: flex;
              justify-content: space-between;
              margin: 12px 0;
              padding: 8px 0;
              font-size: 15px;
            }
            
            .balance-row.total {
              border-top: 2px solid ${primaryColor};
              font-weight: 700;
              font-size: 20px;
              margin-top: 20px;
              padding-top: 20px;
              color: #111827;
            }
            
            .balance-row.total.negative {
              color: #dc2626;
            }
            
            .balance-row.total.positive {
              color: #16a34a;
            }
            
            .balance-note {
              margin-top: 16px;
              padding: 12px;
              background: white;
              border-radius: 6px;
              font-size: 14px;
              color: #6b7280;
              border-left: 3px solid ${primaryColor};
            }
            
            .section-title {
              color: #111827;
              font-size: 18px;
              font-weight: 600;
              margin: 40px 0 20px 0;
              padding-bottom: 10px;
              border-bottom: 2px solid ${primaryColor};
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            
            th {
              background: ${primaryColor};
              color: white;
              padding: 14px 12px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            td {
              padding: 14px 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            
            tr:last-child td {
              border-bottom: none;
            }
            
            tr:hover {
              background: #f9fafb;
            }
            
            .type-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            
            .type-invoice {
              background: #dbeafe;
              color: #1e40af;
            }
            
            .type-payment {
              background: #dcfce7;
              color: #166534;
            }
            
            .type-credit_note {
              background: #f3e8ff;
              color: #6b21a8;
            }
            
            .status-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            
            .status-paid, .status-completed, .status-approved {
              background: #dcfce7;
              color: #166534;
            }
            
            .status-pending {
              background: #fef3c7;
              color: #92400e;
            }
            
            .status-overdue {
              background: #fee2e2;
              color: #991b1b;
            }
            
            .status-partial {
              background: #fed7aa;
              color: #9a3412;
            }
            
            .amount-positive {
              color: #16a34a;
              font-weight: 600;
            }
            
            .amount-negative {
              color: #dc2626;
              font-weight: 600;
            }
            
            .footer {
              margin-top: 60px;
              padding-top: 30px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
            }
            
            .footer-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              text-align: left;
            }
            
            .footer-section {
              flex: 1;
            }
            
            .footer-section h4 {
              margin: 0 0 10px 0;
              color: ${primaryColor};
              font-size: 14px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .footer-section p {
              margin: 4px 0;
              font-size: 13px;
              color: #6b7280;
            }
            
            .footer-note {
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <div class="letterhead-content">
              <div class="company-info">
                <h1>${companyConfig.company_name || "Company Name"}</h1>
                <p>${companyConfig.company_address || ""}</p>
                <p>Email: ${companyConfig.company_email || ""} | Phone: ${companyConfig.company_phone || ""}</p>
                ${companyConfig.company_website ? `<p>Website: ${companyConfig.company_website}</p>` : ""}
                ${companyConfig.company_registration ? `<p>Registration: ${companyConfig.company_registration}</p>` : ""}
                ${companyConfig.company_tax_id ? `<p>Tax ID: ${companyConfig.company_tax_id}</p>` : ""}
              </div>
              <div class="document-title">
                <h2>CUSTOMER STATEMENT</h2>
                <p>Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>
          </div>

          <div class="customer-info">
            <h3>Customer Information</h3>
            <div class="info-grid">
              <div class="info-row">
                <strong>Name:</strong>
                <span>${customer.name}</span>
              </div>
              <div class="info-row">
                <strong>Account Number:</strong>
                <span>${customer.account_number || "N/A"}</span>
              </div>
              <div class="info-row">
                <strong>Email:</strong>
                <span>${customer.email || "N/A"}</span>
              </div>
              <div class="info-row">
                <strong>Phone:</strong>
                <span>${customer.phone || "N/A"}</span>
              </div>
              <div class="info-row" style="grid-column: 1 / -1;">
                <strong>Address:</strong>
                <span>${customer.address || "N/A"}</span>
              </div>
            </div>
          </div>

          <div class="balance-summary">
            <h3>Account Summary</h3>
            <div class="balance-row">
              <span>Total Invoiced:</span>
              <span>KES ${Number(summary.total_invoiced).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="balance-row">
              <span>Total Payments:</span>
              <span class="amount-positive">KES ${Number(summary.total_paid).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="balance-row">
              <span>Total Credit Notes:</span>
              <span class="amount-positive">KES ${Number(summary.total_credit_notes).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="balance-row total ${balance < 0 ? "negative" : balance > 0 ? "positive" : ""}">
              <span>Account Balance:</span>
              <span>KES ${balance.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="balance-note">
              ${balance < 0 ? "⚠️ Amount owed by customer" : balance > 0 ? "✓ Credit balance in customer's favor" : "✓ Account is fully settled"}
            </div>
          </div>

          <h3 class="section-title">Transaction History</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                allDocuments.length > 0
                  ? allDocuments
                      .map(
                        (doc) => `
                <tr>
                  <td>${new Date(doc.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td><span class="type-badge type-${doc.type}">${doc.type.replace("_", " ")}</span></td>
                  <td>${doc.reference_number || "N/A"}</td>
                  <td>${doc.description || "-"}</td>
                  <td style="text-align: right;" class="${doc.type === "invoice" ? "amount-negative" : "amount-positive"}">
                    ${doc.type === "invoice" ? "-" : "+"}KES ${Number(doc.total_amount).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td><span class="status-badge status-${doc.status}">${doc.status}</span></td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #9ca3af;">No transactions found</td></tr>'
              }
            </tbody>
          </table>

          <div class="footer">
            <div class="footer-content">
              <div class="footer-section">
                <h4>Contact Information</h4>
                <p>${companyConfig.company_name || "Company Name"}</p>
                <p>${companyConfig.company_email || ""}</p>
                <p>${companyConfig.company_phone || ""}</p>
              </div>
              <div class="footer-section">
                <h4>Company Details</h4>
                ${companyConfig.company_registration ? `<p>Reg: ${companyConfig.company_registration}</p>` : ""}
                ${companyConfig.company_tax_id ? `<p>Tax ID: ${companyConfig.company_tax_id}</p>` : ""}
                ${companyConfig.company_website ? `<p>${companyConfig.company_website}</p>` : ""}
              </div>
              <div class="footer-section">
                <h4>Statement Details</h4>
                <p>Customer ID: ${customerId}</p>
                <p>Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
            </div>
            <div class="footer-note">
              <p>This is a computer-generated statement and does not require a signature.</p>
              <p>For any queries regarding this statement, please contact our billing department.</p>
            </div>
          </div>
        </body>
      </html>
    `

    console.log("[v0] Statement HTML generated successfully, returning response")

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="statement-${customerId}-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating statement:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 })
  }
}

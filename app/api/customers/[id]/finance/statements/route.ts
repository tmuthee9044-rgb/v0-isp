import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jsPDF from "jspdf"
import "jspdf-autotable"

const sql = neon(process.env.DATABASE_URL!)

async function getCompanySettings() {
  try {
    const settings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'company_%' OR key LIKE 'branding_%' OR key LIKE 'contact_%'
    `

    const settingsObject: Record<string, any> = {}
    settings.forEach((setting: any) => {
      try {
        settingsObject[setting.key] = JSON.parse(setting.value)
      } catch {
        settingsObject[setting.key] = setting.value
      }
    })

    return settingsObject
  } catch (error) {
    console.error("Error fetching company settings:", error)
    return {}
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { from_date, to_date, statement_type, format } = await request.json()

    if (!from_date || !to_date) {
      return NextResponse.json({ error: "From date and to date are required" }, { status: 400 })
    }

    const companySettings = await getCompanySettings()

    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    let transactionQuery = sql`
      SELECT 
        'payment' as type,
        p.id,
        p.amount,
        p.payment_method,
        p.description,
        p.created_at as transaction_date,
        p.status,
        p.reference_number
      FROM payments p
      WHERE p.customer_id = ${customerId}
        AND p.created_at >= ${from_date}
        AND p.created_at <= ${to_date}
    `

    if (statement_type === "invoices_only") {
      transactionQuery = sql`
        SELECT 
          'invoice' as type,
          i.id,
          i.amount,
          'invoice' as payment_method,
          CONCAT('Invoice ', i.invoice_number) as description,
          i.invoice_date as transaction_date,
          i.status,
          i.invoice_number as reference_number
        FROM invoices i
        WHERE i.customer_id = ${customerId}
          AND i.invoice_date >= ${from_date}
          AND i.invoice_date <= ${to_date}
      `
    } else if (statement_type === "payments_only") {
      // Keep the payment query as is
    } else {
      // Full statement - combine both
      transactionQuery = sql`
        SELECT 
          'payment' as type,
          p.id,
          p.amount,
          p.payment_method,
          p.description,
          p.created_at as transaction_date,
          p.status,
          p.reference_number
        FROM payments p
        WHERE p.customer_id = ${customerId}
          AND p.created_at >= ${from_date}
          AND p.created_at <= ${to_date}
        UNION ALL
        SELECT 
          'invoice' as type,
          i.id,
          -i.amount as amount,
          'invoice' as payment_method,
          CONCAT('Invoice ', i.invoice_number) as description,
          i.invoice_date as transaction_date,
          i.status,
          i.invoice_number as reference_number
        FROM invoices i
        WHERE i.customer_id = ${customerId}
          AND i.invoice_date >= ${from_date}
          AND i.invoice_date <= ${to_date}
        ORDER BY transaction_date DESC
      `
    }

    const transactions = await transactionQuery

    const doc = new jsPDF()
    const companyName = companySettings.company_name || "Trust Waves ISP"

    // Header
    doc.setFontSize(20)
    doc.text(companyName, 20, 25)
    doc.setFontSize(16)
    doc.text("ACCOUNT STATEMENT", 20, 40)

    // Customer details
    doc.setFontSize(12)
    doc.text(`Customer: ${customer.first_name} ${customer.last_name}`, 20, 55)
    doc.text(`Account ID: ${customer.id}`, 20, 65)
    doc.text(`Period: ${new Date(from_date).toLocaleDateString()} - ${new Date(to_date).toLocaleDateString()}`, 20, 75)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 85)

    // Transactions table
    const tableData = transactions.map((tx: any) => [
      new Date(tx.transaction_date).toLocaleDateString(),
      tx.description,
      tx.type === "payment" ? `KES ${Number(tx.amount).toLocaleString()}` : "",
      tx.type === "invoice" ? `KES ${Math.abs(Number(tx.amount)).toLocaleString()}` : "",
      tx.status,
    ])
    ;(doc as any).autoTable({
      head: [["Date", "Description", "Credit", "Debit", "Status"]],
      body: tableData,
      startY: 100,
      theme: "striped",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
    })

    // Summary
    const totalCredits = transactions
      .filter((tx: any) => tx.type === "payment")
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)

    const totalDebits = transactions
      .filter((tx: any) => tx.type === "invoice")
      .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0)

    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.setFontSize(12)
    doc.text(`Total Credits: KES ${totalCredits.toLocaleString()}`, 20, finalY)
    doc.text(`Total Debits: KES ${totalDebits.toLocaleString()}`, 20, finalY + 10)
    doc.text(`Net Balance: KES ${(totalCredits - totalDebits).toLocaleString()}`, 20, finalY + 20)

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="statement-${customerId}-${from_date}-${to_date}.pdf"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error generating statement:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate statement. Please try again.",
      },
      { status: 500 },
    )
  }
}

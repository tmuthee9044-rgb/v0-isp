import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (!customerId || isNaN(customerId)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 })
    }

    console.log("[v0] Generating statement for customer:", customerId)

    const sql = await getSql()

    // Get company configuration
    console.log("[v0] Fetching company configuration...")
    const companyConfig = await sql`
      SELECT * FROM system_config LIMIT 5
    `

    const configMap = Object.fromEntries(companyConfig.map((row: any) => [row.key, row.value]))
    console.log("[v0] Company config retrieved")

    // Get customer details
    const customers = await sql`
      SELECT 
        id,
        business_name,
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        postal_code,
        account_number,
        customer_type,
        status
      FROM customers
      WHERE id = ${customerId}
    `

    if (customers.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    const customer = customers[0]
    console.log("[v0] Customer found:", customer.business_name || `${customer.first_name} ${customer.last_name}`)

    // Get statement period (last 30 days by default)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get transactions for the period
    console.log("[v0] Fetching transactions...")
    const transactions = await sql`
      SELECT 
        id,
        reference_number,
        type,
        description,
        amount,
        total_amount,
        created_at,
        status,
        due_date
      FROM finance_documents
      WHERE customer_id = ${customerId}
      AND created_at >= ${startDate.toISOString()}
      AND created_at <= ${endDate.toISOString()}
      ORDER BY created_at DESC
    `

    console.log("[v0] Found transactions:", transactions.length)

    // Calculate totals
    const openingBalance = 0
    let closingBalance = 0
    let totalDebits = 0
    let totalCredits = 0

    for (const transaction of transactions) {
      const amount = Number.parseFloat(transaction.amount || transaction.total_amount || "0")
      if (transaction.type === "invoice") {
        totalDebits += amount
      } else if (transaction.type === "payment") {
        totalCredits += amount
      }
    }

    closingBalance = openingBalance + totalDebits - totalCredits

    // Create statement record
    const statementNumber = `ST-${customerId}-${Date.now()}`

    console.log("[v0] Creating statement record...")
    await sql`
      INSERT INTO customer_statements (
        customer_id,
        statement_number,
        period_start,
        period_end,
        statement_date,
        opening_balance,
        closing_balance,
        transaction_count,
        status,
        created_at
      ) VALUES (
        ${customerId},
        ${statementNumber},
        ${startDate.toISOString().split("T")[0]},
        ${endDate.toISOString().split("T")[0]},
        ${new Date().toISOString().split("T")[0]},
        ${openingBalance},
        ${closingBalance},
        ${transactions.length},
        ${"generated"},
        ${new Date().toISOString()}
      )
    `

    console.log("[v0] Generating PDF...")
    const customerName = customer.business_name || `${customer.first_name} ${customer.last_name}`

    const pdfBuffer = generateStatementPDF(
      configMap,
      customerName,
      customer.email || "",
      customer.phone || "",
      customer.address || "",
      customer.city || "",
      customer.account_number || "",
      statementNumber,
      startDate,
      endDate,
      transactions,
      openingBalance,
      closingBalance,
      totalDebits,
      totalCredits,
    )

    console.log("[v0] PDF generated successfully")

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="statement-${customerId}-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error generating statement:", error.message)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate statement",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function generateStatementPDF(
  companyConfig: Record<string, string>,
  customerName: string,
  email: string,
  phone: string,
  address: string,
  city: string,
  accountNumber: string,
  statementNumber: string,
  startDate: Date,
  endDate: Date,
  transactions: any[],
  openingBalance: number,
  closingBalance: number,
  totalDebits: number,
  totalCredits: number,
): Buffer {
  const doc = new jsPDF()

  // Company Header
  const companyName = companyConfig.company_name || "ISP Management System"
  const companyAddress = companyConfig.company_address || ""
  const companyPhone = companyConfig.company_phone || ""
  const companyEmail = companyConfig.company_email || ""

  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(companyName, 105, 20, { align: "center" })

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  if (companyAddress) doc.text(companyAddress, 105, 28, { align: "center" })
  if (companyPhone) doc.text(`Phone: ${companyPhone}`, 105, 34, { align: "center" })
  if (companyEmail) doc.text(`Email: ${companyEmail}`, 105, 40, { align: "center" })

  // Statement Title
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("STATEMENT OF ACCOUNT", 105, 52, { align: "center" })

  // Customer Information
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Bill To:", 15, 65)
  doc.setFont("helvetica", "normal")
  doc.text(customerName, 15, 72)
  if (accountNumber) doc.text(`Account: ${accountNumber}`, 15, 78)
  if (email) doc.text(`Email: ${email}`, 15, 84)
  if (phone) doc.text(`Phone: ${phone}`, 15, 90)
  if (address) doc.text(`${address}, ${city}`, 15, 96)

  // Statement Information
  doc.setFont("helvetica", "bold")
  doc.text("Statement Details:", 140, 65)
  doc.setFont("helvetica", "normal")
  doc.text(`Statement #: ${statementNumber}`, 140, 72)
  doc.text(`Period: ${startDate.toLocaleDateString()}`, 140, 78)
  doc.text(`to ${endDate.toLocaleDateString()}`, 140, 84)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 90)

  // Transactions Table
  const tableData = transactions.map((t) => {
    const amount = Number.parseFloat(t.amount || t.total_amount || "0")
    return [
      new Date(t.created_at).toLocaleDateString(),
      (t.description || "").substring(0, 30),
      t.reference_number || "",
      t.type === "invoice" ? `KES ${amount.toFixed(2)}` : "-",
      t.type === "payment" ? `KES ${amount.toFixed(2)}` : "-",
    ]
  })

  autoTable(doc, {
    startY: 105,
    head: [["Date", "Description", "Reference", "Debit", "Credit"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
  })

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || 150

  // Summary Section
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Summary:", 140, finalY + 10)
  doc.setFont("helvetica", "normal")
  doc.text(`Opening Balance: KES ${openingBalance.toFixed(2)}`, 140, finalY + 17)
  doc.text(`Total Debits: KES ${totalDebits.toFixed(2)}`, 140, finalY + 24)
  doc.text(`Total Credits: KES ${totalCredits.toFixed(2)}`, 140, finalY + 31)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`Closing Balance: KES ${closingBalance.toFixed(2)}`, 140, finalY + 40)

  // Footer
  doc.setFontSize(9)
  doc.setFont("helvetica", "italic")
  doc.text("This is a computer-generated statement. Thank you for your business!", 105, finalY + 55, {
    align: "center",
  })

  // Convert to buffer
  const pdfOutput = doc.output("arraybuffer")
  return Buffer.from(pdfOutput)
}

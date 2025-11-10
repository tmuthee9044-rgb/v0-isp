import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import PDFDocument from "pdfkit"

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
    console.log("[v0] Fetching company configuration from system_config...")
    const companyConfig = await sql`
      SELECT * FROM system_config
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

    // Get statement period (last 30 days by default)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get transactions for the period
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

    const customerName = customer.business_name || `${customer.first_name} ${customer.last_name}`

    const pdfBuffer = await generateStatementPDF(
      customerName,
      customer.email,
      customer.phone,
      customer.address,
      customer.city,
      statementNumber,
      startDate,
      endDate,
      transactions,
      openingBalance,
      closingBalance,
      totalDebits,
      totalCredits,
    )

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

async function generateStatementPDF(
  customerName: string,
  email: string,
  phone: string,
  address: string,
  city: string,
  statementNumber: string,
  startDate: Date,
  endDate: Date,
  transactions: any[],
  openingBalance: number,
  closingBalance: number,
  totalDebits: number,
  totalCredits: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument()
      const chunks: Buffer[] = []

      doc.on("data", (chunk: Buffer) => {
        chunks.push(chunk)
      })

      doc.on("end", () => {
        resolve(Buffer.concat(chunks))
      })

      doc.on("error", (err: Error) => {
        reject(err)
      })

      // Company Info Header
      doc.fontSize(20).font("Helvetica-Bold").text("ISP Management System", { align: "center" })
      doc.fontSize(12).font("Helvetica").text("Statement of Account", { align: "center" })
      doc.moveDown(0.5)

      // Customer Info
      doc.fontSize(12).font("Helvetica-Bold").text("Bill To:")
      doc.fontSize(10).font("Helvetica")
      doc.text(customerName)
      doc.text(`Email: ${email}`)
      doc.text(`Phone: ${phone}`)
      doc.text(`Address: ${address}, ${city}`)
      doc.moveDown(0.5)

      // Statement Info
      doc.fontSize(10).font("Helvetica-Bold")
      doc.text(`Statement #: ${statementNumber}`)
      doc.text(`Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`)
      doc.moveDown(1)

      // Transactions Table Header
      doc.fontSize(9).font("Helvetica-Bold")
      const tableTop = doc.y
      const col1 = 50
      const col2 = 130
      const col3 = 220
      const col4 = 300
      const col5 = 380

      doc.text("Date", col1, tableTop)
      doc.text("Description", col2, tableTop)
      doc.text("Reference", col3, tableTop)
      doc.text("Debit", col4, tableTop)
      doc.text("Credit", col5, tableTop)

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(530, tableTop + 15)
        .stroke()
      doc.moveDown(0.8)

      // Transaction Rows
      doc.fontSize(8).font("Helvetica")
      let currentY = doc.y

      for (const transaction of transactions) {
        const amount = Number.parseFloat(transaction.amount || transaction.total_amount || "0")
        const debit = transaction.type === "invoice" ? amount.toFixed(2) : "-"
        const credit = transaction.type === "payment" ? amount.toFixed(2) : "-"

        doc.text(new Date(transaction.created_at).toLocaleDateString(), col1, currentY)
        doc.text((transaction.description || "").substring(0, 25), col2, currentY)
        doc.text(transaction.reference_number || "", col3, currentY)
        doc.text(debit, col4, currentY)
        doc.text(credit, col5, currentY)

        currentY += 15
      }

      doc.moveTo(50, currentY).lineTo(530, currentY).stroke()
      currentY += 10

      // Totals Section
      doc.font("Helvetica-Bold").fontSize(10)
      doc.text(`Opening Balance: ${openingBalance.toFixed(2)}`, 300)
      doc.text(`Total Debits: ${totalDebits.toFixed(2)}`, 300)
      doc.text(`Total Credits: ${totalCredits.toFixed(2)}`, 300)
      doc.fontSize(11).text(`Closing Balance: ${closingBalance.toFixed(2)}`, 300, { underline: true })

      doc.moveDown(1)

      // Footer
      doc
        .fontSize(9)
        .font("Helvetica")
        .text("This statement is generated automatically. Thank you for your business!", { align: "center" })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

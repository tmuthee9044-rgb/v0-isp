import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import * as XLSX from "xlsx"
import { createObjectCsvWriter } from "csv-writer"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { tmpdir } from "os"
import { join } from "path"
import { readFileSync, unlinkSync } from "fs"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "csv" // csv, excel, pdf
    const dataType = searchParams.get("data") || "all" // invoices, payments, all
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Get customer details
    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const invoiceDateFilter =
      startDate && endDate
        ? `AND i.created_at >= '${startDate}' AND i.created_at <= '${endDate}'`
        : `AND i.created_at >= NOW() - INTERVAL '1 year'`

    const paymentDateFilter =
      startDate && endDate
        ? `AND p.created_at >= '${startDate}' AND p.created_at <= '${endDate}'`
        : `AND p.created_at >= NOW() - INTERVAL '1 year'`

    const exportData: any = {}

    // Fetch data based on type
    if (dataType === "invoices" || dataType === "all") {
      const invoices = await sql`
        SELECT 
          i.id,
          i.invoice_number,
          i.amount,
          i.status,
          i.invoice_date,
          i.due_date,
          i.created_at AS invoice_created_at,
          COALESCE(p.amount, 0) as paid_amount,
          p.payment_date,
          p.payment_method,
          p.created_at AS payment_created_at
        FROM invoices i
        LEFT JOIN payments p ON i.id = p.invoice_id
        WHERE i.customer_id = ${customerId} ${sql.unsafe(invoiceDateFilter)}
        ORDER BY i.created_at DESC
      `
      exportData.invoices = invoices
    }

    if (dataType === "payments" || dataType === "all") {
      const payments = await sql`
        SELECT 
          p.id,
          p.reference_number,
          p.amount,
          p.payment_method,
          p.status,
          p.payment_date,
          p.created_at AS payment_created_at,
          i.invoice_number,
          i.created_at AS invoice_created_at,
          mt.mpesa_receipt_number,
          mt.phone_number as mpesa_phone
        FROM payments p
        LEFT JOIN invoices i ON p.invoice_id = i.id
        LEFT JOIN mpesa_transactions mt ON p.id = mt.payment_id
        WHERE p.customer_id = ${customerId} ${sql.unsafe(paymentDateFilter)}
        ORDER BY p.created_at DESC
      `
      exportData.payments = payments
    }

    if (dataType === "all") {
      const [summary] = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.amount ELSE 0 END), 0) as total_outstanding,
          COUNT(DISTINCT p.id) as total_payments,
          COUNT(DISTINCT i.id) as total_invoices
        FROM customers c
        LEFT JOIN payments p ON c.id = p.customer_id ${sql.unsafe(paymentDateFilter)}
        LEFT JOIN invoices i ON c.id = i.customer_id ${sql.unsafe(invoiceDateFilter)}
        WHERE c.id = ${customerId}
      `
      exportData.summary = summary
    }

    // Generate file based on type
    switch (type) {
      case "csv":
        return generateCSVExport(exportData, customer, dataType)
      case "excel":
        return generateExcelExport(exportData, customer, dataType)
      case "pdf":
        return generatePDFExport(exportData, customer, dataType)
      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}

async function generateCSVExport(data: any, customer: any, dataType: string) {
  const tempDir = tmpdir()
  const fileName = `customer-${customer.id}-${dataType}-${Date.now()}.csv`
  const filePath = join(tempDir, fileName)

  try {
    if (dataType === "invoices" && data.invoices) {
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: "invoice_number", title: "Invoice Number" },
          { id: "amount", title: "Amount" },
          { id: "status", title: "Status" },
          { id: "invoice_date", title: "Invoice Date" },
          { id: "due_date", title: "Due Date" },
          { id: "paid_amount", title: "Paid Amount" },
          { id: "payment_date", title: "Payment Date" },
          { id: "payment_method", title: "Payment Method" },
        ],
      })
      await csvWriter.writeRecords(data.invoices)
    } else if (dataType === "payments" && data.payments) {
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: "reference_number", title: "Reference" },
          { id: "amount", title: "Amount" },
          { id: "payment_method", title: "Method" },
          { id: "status", title: "Status" },
          { id: "payment_date", title: "Date" },
          { id: "invoice_number", title: "Invoice" },
          { id: "mpesa_receipt_number", title: "M-Pesa Receipt" },
        ],
      })
      await csvWriter.writeRecords(data.payments)
    } else {
      // Combined export
      const allData = [
        ...(data.invoices || []).map((inv: any) => ({ ...inv, type: "Invoice" })),
        ...(data.payments || []).map((pay: any) => ({ ...pay, type: "Payment" })),
      ]
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: "type", title: "Type" },
          { id: "reference_number", title: "Reference" },
          { id: "amount", title: "Amount" },
          { id: "status", title: "Status" },
          { id: "created_at", title: "Date" },
        ],
      })
      await csvWriter.writeRecords(allData)
    }

    const fileBuffer = readFileSync(filePath)
    unlinkSync(filePath) // Clean up temp file

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("CSV generation error:", error)
    throw error
  }
}

async function generateExcelExport(data: any, customer: any, dataType: string) {
  const workbook = XLSX.utils.book_new()

  // Customer Info Sheet
  const customerInfo = [
    ["Customer Information"],
    ["Name", `${customer.first_name} ${customer.last_name}`],
    ["Email", customer.email],
    ["Phone", customer.phone],
    ["Customer ID", customer.id],
    ["Export Date", new Date().toISOString()],
    ["Export Type", dataType],
  ]
  const customerSheet = XLSX.utils.aoa_to_sheet(customerInfo)
  XLSX.utils.book_append_sheet(workbook, customerSheet, "Customer Info")

  // Add data sheets
  if (data.invoices) {
    const invoiceSheet = XLSX.utils.json_to_sheet(data.invoices)
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, "Invoices")
  }

  if (data.payments) {
    const paymentSheet = XLSX.utils.json_to_sheet(data.payments)
    XLSX.utils.book_append_sheet(workbook, paymentSheet, "Payments")
  }

  if (data.summary) {
    const summaryData = [
      ["Financial Summary"],
      ["Total Paid", data.summary.total_paid],
      ["Total Outstanding", data.summary.total_outstanding],
      ["Total Payments", data.summary.total_payments],
      ["Total Invoices", data.summary.total_invoices],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  const fileName = `customer-${customer.id}-${dataType}-${Date.now()}.xlsx`

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

async function generatePDFExport(data: any, customer: any, dataType: string) {
  const doc = new jsPDF()
  const fileName = `customer-${customer.id}-${dataType}-${Date.now()}.pdf`

  // Header
  doc.setFontSize(20)
  doc.text("Customer Financial Report", 20, 20)

  doc.setFontSize(12)
  doc.text(`Customer: ${customer.first_name} ${customer.last_name}`, 20, 35)
  doc.text(`Email: ${customer.email}`, 20, 45)
  doc.text(`Phone: ${customer.phone}`, 20, 55)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 65)

  let yPosition = 80

  // Summary section
  if (data.summary) {
    doc.setFontSize(16)
    doc.text("Financial Summary", 20, yPosition)
    yPosition += 15

    const summaryData = [
      ["Metric", "Value"],
      ["Total Paid", `KES ${Number(data.summary.total_paid).toLocaleString()}`],
      ["Total Outstanding", `KES ${Number(data.summary.total_outstanding).toLocaleString()}`],
      ["Total Payments", data.summary.total_payments],
      ["Total Invoices", data.summary.total_invoices],
    ]
    ;(doc as any).autoTable({
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: yPosition,
      theme: "grid",
    })

    yPosition = (doc as any).lastAutoTable.finalY + 20
  }

  // Invoices section
  if (data.invoices && data.invoices.length > 0) {
    doc.setFontSize(16)
    doc.text("Invoices", 20, yPosition)
    yPosition += 10

    const invoiceData = data.invoices.map((inv: any) => [
      inv.invoice_number,
      `KES ${Number(inv.amount).toLocaleString()}`,
      inv.status,
      new Date(inv.invoice_date).toLocaleDateString(),
      new Date(inv.due_date).toLocaleDateString(),
    ])
    ;(doc as any).autoTable({
      head: [["Invoice #", "Amount", "Status", "Date", "Due Date"]],
      body: invoiceData,
      startY: yPosition,
      theme: "striped",
    })

    yPosition = (doc as any).lastAutoTable.finalY + 20
  }

  // Payments section
  if (data.payments && data.payments.length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(16)
    doc.text("Payments", 20, yPosition)
    yPosition += 10

    const paymentData = data.payments.map((pay: any) => [
      pay.reference_number || "N/A",
      `KES ${Number(pay.amount).toLocaleString()}`,
      pay.payment_method,
      pay.status,
      new Date(pay.payment_date || pay.created_at).toLocaleDateString(),
    ])
    ;(doc as any).autoTable({
      head: [["Reference", "Amount", "Method", "Status", "Date"]],
      body: paymentData,
      startY: yPosition,
      theme: "striped",
    })
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

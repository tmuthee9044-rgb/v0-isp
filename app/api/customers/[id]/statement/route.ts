import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (!customerId || isNaN(customerId)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 })
    }

    const body = await request.json()
    const { startDate: requestStartDate, endDate: requestEndDate } = body

    console.log("[v0] Generating statement for customer:", customerId)
    console.log("[v0] Date range:", { requestStartDate, requestEndDate })

    const sql = await getSql()

    let configMap: Record<string, string> = {}
    try {
      const companyConfig = await sql`SELECT * FROM system_config LIMIT 10`
      configMap = Object.fromEntries(companyConfig.map((row: any) => [row.key, row.value]))
    } catch (err) {
      console.log("[v0] No system_config found, using defaults")
    }

    const companyInfo = {
      name: configMap.company_name || "ISP Management System",
      email: configMap.company_email || "support@isp.com",
      phone: configMap.company_phone || "+254 123 456 789",
    }

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

    const endDate = requestEndDate ? new Date(requestEndDate) : new Date()
    const startDate = requestStartDate
      ? new Date(requestStartDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Format dates as YYYY-MM-DD for proper comparison
    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    console.log("[v0] Using date range:", { start: startDateStr, end: endDateStr })

    const transactions = await sql`
      SELECT 
        id,
        reference_number,
        type,
        COALESCE(description, '') as description,
        COALESCE(amount, total_amount, 0) as amount,
        total_amount,
        created_at,
        status,
        due_date,
        invoice_date,
        payment_date
      FROM finance_documents
      WHERE customer_id = ${customerId}
      AND (
        (created_at::date >= ${startDateStr}::date AND created_at::date <= ${endDateStr}::date)
        OR (invoice_date >= ${startDateStr}::date AND invoice_date <= ${endDateStr}::date)
        OR (payment_date >= ${startDateStr}::date AND payment_date <= ${endDateStr}::date)
      )
      ORDER BY COALESCE(payment_date, invoice_date, created_at::date) DESC
    `

    console.log("[v0] Found transactions for statement:", transactions.length)

    if (transactions.length === 0) {
      const allCustomerDocs = await sql`
        SELECT id, type, created_at::date as created, invoice_date, payment_date
        FROM finance_documents
        WHERE customer_id = ${customerId}
        ORDER BY created_at DESC
        LIMIT 5
      `
      console.log("[v0] Sample of all customer documents:", allCustomerDocs)
      console.log("[v0] Query date range:", { startDateStr, endDateStr })
    }

    const allDocs = await sql`
      SELECT COUNT(*) as total
      FROM finance_documents
      WHERE customer_id = ${customerId}
    `
    console.log("[v0] Total finance documents for customer:", allDocs[0]?.total || 0)

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
        ${startDateStr},
        ${endDateStr},
        ${new Date().toISOString().split("T")[0]},
        ${openingBalance},
        ${closingBalance},
        ${transactions.length},
        ${"generated"},
        ${new Date().toISOString()}
      )
    `

    const customerName = customer.business_name || `${customer.first_name} ${customer.last_name}`

    const formattedTransactions = transactions.map((t: any) => {
      const amount = Number.parseFloat(t.amount || t.total_amount || "0")
      const transactionDate = t.payment_date || t.invoice_date || t.created_at

      return {
        date: transactionDate,
        description:
          t.description || `${(t.type || "Transaction").toUpperCase()} - ${t.reference_number || `REF-${t.id}`}`,
        reference: t.reference_number || `REF-${t.id}`,
        type: t.type || "transaction",
        amount: amount,
      }
    })

    console.log("[v0] Statement data:", {
      customerName,
      transactionCount: formattedTransactions.length,
      totalDebits,
      totalCredits,
      closingBalance,
    })

    // The frontend will handle PDF generation using jsPDF which works in the browser
    return NextResponse.json({
      success: true,
      statement: {
        statementNumber,
        customerName,
        email: customer.email || "No email",
        phone: customer.phone || "No phone",
        address: customer.address || "No address",
        city: customer.city || "Unknown",
        startDate: startDateStr,
        endDate: endDateStr,
        generatedDate: new Date().toISOString().split("T")[0],
        openingBalance,
        closingBalance,
        totalDebits,
        totalCredits,
        transactions: formattedTransactions,
        companyInfo,
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

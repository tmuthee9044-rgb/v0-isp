import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (!customerId || isNaN(customerId)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 })
    }

    console.log("[v0] Generating statement for customer:", customerId)

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

    // Get statement period (last 30 days by default)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get transactions for the period
    const transactions = await sql`
      SELECT 
        id,
        reference_number,
        type,
        COALESCE(description, 'No description') as description,
        COALESCE(amount, total_amount, 0) as amount,
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

    console.log("[v0] Found transactions for statement:", transactions.length)

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

    const formattedTransactions = transactions.map((t: any) => {
      const amount = Number.parseFloat(t.amount || t.total_amount || "0")
      return {
        date: t.created_at,
        description: t.description || `${t.type} - ${t.reference_number}`,
        reference: t.reference_number || `REF-${t.id}`,
        type: t.type,
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
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedDate: new Date().toISOString(),
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

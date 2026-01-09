import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateStatementHTML } from "@/lib/html-templates"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    // Get customer details
    const customerResult = await sql`
      SELECT * FROM customers WHERE id = ${customerId}
    `

    if (customerResult.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const customer = customerResult[0]

    // Get company profile
    const companyResult = await sql`
      SELECT * FROM company_profiles LIMIT 1
    `

    if (companyResult.length === 0) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
    }

    const company = companyResult[0]

    // Generate statement number and dates
    const statementDate = new Date()
    const periodEnd = new Date()
    const periodStart = new Date()
    periodStart.setMonth(periodStart.getMonth() - 1)

    const statementNumber = `STMT-${customerId}-${statementDate.getFullYear()}${String(statementDate.getMonth() + 1).padStart(2, "0")}`

    // Get account balance
    const balanceResult = await sql`
      SELECT balance FROM customers WHERE id = ${customerId}
    `

    const currentBalance = balanceResult[0]?.balance || 0

    // Get transactions (invoices and payments)
    const invoicesResult = await sql`
      SELECT 
        invoice_date as date,
        'Invoice - ' || invoice_number as description,
        invoice_number as reference,
        amount as debit,
        0 as credit
      FROM invoices 
      WHERE customer_id = ${customerId} 
        AND invoice_date >= ${periodStart.toISOString().split("T")[0]}
        AND invoice_date <= ${periodEnd.toISOString().split("T")[0]}
      ORDER BY invoice_date ASC
    `

    const paymentsResult = await sql`
      SELECT 
        payment_date as date,
        'Payment - ' || COALESCE(reference_number, transaction_id) as description,
        COALESCE(reference_number, transaction_id) as reference,
        0 as debit,
        amount as credit
      FROM payments 
      WHERE customer_id = ${customerId} 
        AND payment_date >= ${periodStart.toISOString()}
        AND payment_date <= ${periodEnd.toISOString()}
      ORDER BY payment_date ASC
    `

    // Combine and sort transactions
    const allTransactions = [
      ...invoicesResult.map((inv) => ({
        date: inv.date,
        description: inv.description,
        reference: inv.reference,
        debit: Number(inv.debit),
        credit: Number(inv.credit),
      })),
      ...paymentsResult.map((pay) => ({
        date: new Date(pay.date).toISOString().split("T")[0],
        description: pay.description,
        reference: pay.reference,
        debit: Number(pay.debit),
        credit: Number(pay.credit),
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate running balances
    let runningBalance = currentBalance - allTransactions.reduce((sum, t) => sum + t.debit - t.credit, 0)
    const openingBalance = runningBalance

    const transactionsWithBalance = allTransactions.map((transaction) => {
      runningBalance += transaction.debit - transaction.credit
      return {
        ...transaction,
        balance: runningBalance,
      }
    })

    // Prepare statement data
    const statementData = {
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        business_name: customer.business_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || customer.billing_address || "Address not provided",
        account_number: customer.account_number,
      },
      company: {
        company_name: company.company_name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        tax_number: company.tax_number,
        registration_number: company.registration_number,
        website: company.website,
      },
      statement: {
        statement_number: statementNumber,
        statement_date: statementDate.toISOString(),
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        opening_balance: openingBalance,
        closing_balance: currentBalance,
      },
      transactions: transactionsWithBalance,
    }

    // Generate HTML
    const htmlContent = generateStatementHTML(statementData)

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Statement - ${statementNumber}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `

    return new NextResponse(fullHtml, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="statement-${statementNumber}.html"`,
      },
    })
  } catch (error) {
    console.error("Error generating statement:", error)
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    console.log("[v0] Starting overdue invoices query...")

    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
    console.log("[v0] Database URL available:", !!databaseUrl)

    if (!databaseUrl) {
      console.error("[v0] No database URL found in environment variables")
      return NextResponse.json(
        {
          success: false,
          error: "Database configuration error - no connection string found",
        },
        { status: 500 },
      )
    }

    const sql = neon(databaseUrl)
    console.log("[v0] Database connection created successfully")

    console.log("[v0] Executing overdue invoices query...")
    const overdueInvoices = await sql`
      SELECT 
        i.id,
        i.invoice_number as invoice_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer,
        c.email,
        c.phone,
        i.amount,
        (CURRENT_DATE - i.due_date)::INTEGER as days_overdue,
        i.created_at::date as invoice_date,
        i.due_date::date as due_date,
        i.status,
        COALESCE(sp.name, 'No Plan') as plan
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE i.due_date < CURRENT_DATE 
        AND i.status NOT IN ('paid', 'cancelled')
        AND i.amount > 0
      ORDER BY i.due_date ASC, i.amount DESC
    `

    console.log("[v0] Query executed successfully. Found", overdueInvoices.length, "overdue invoices")

    const formattedInvoices = overdueInvoices.map((invoice) => ({
      id: invoice.invoice_id || invoice.id,
      customer: invoice.customer || "Unknown Customer",
      email: invoice.email || "",
      phone: invoice.phone || "",
      amount: Number.parseFloat(invoice.amount) || 0,
      daysOverdue: invoice.days_overdue || 0,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      status: "overdue",
      plan: invoice.plan || "No Plan",
    }))

    console.log("[v0] Returning formatted invoices:", formattedInvoices.length)
    return NextResponse.json({
      success: true,
      data: formattedInvoices,
    })
  } catch (error) {
    console.error("[v0] Overdue invoices error details:")
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] Full error object:", error)

    return NextResponse.json(
      {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Starting automated billing cron job at", new Date().toISOString())

    // Generate monthly invoices
    console.log("[v0] Step 1: Generating monthly invoices...")
    const billingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/automated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_monthly_invoices" }),
    })

    const billingResult = await billingResponse.json()
    console.log("[v0] Generated", billingResult.generated_invoices || 0, "invoices")

    // Process overdue accounts
    console.log("[v0] Step 2: Processing overdue accounts...")
    const overdueResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/automated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process_overdue_accounts" }),
    })

    const overdueResult = await overdueResponse.json()
    console.log("[v0] Processed", overdueResult.overdue_invoices || 0, "overdue invoices")

    console.log("[v0] Step 3: Processing monthly suspensions...")
    const monthlySuspensionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/automated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process_monthly_suspensions" }),
    })

    const monthlySuspensionResult = await monthlySuspensionResponse.json()
    console.log("[v0] Suspended", monthlySuspensionResult.suspended_services || 0, "services")

    console.log("[v0] Step 4: Processing payment reactivations...")
    const reactivationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/automated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process_payment_reactivation" }),
    })

    const reactivationResult = await reactivationResponse.json()
    console.log("[v0] Processed", reactivationResult.processed_customers || 0, "customers for reactivation")

    console.log("[v0] Automated billing cron job completed successfully")

    return NextResponse.json({
      success: true,
      billing_run: billingResult,
      overdue_processing: overdueResult,
      monthly_suspension_processing: monthlySuspensionResult,
      reactivation_processing: reactivationResult,
      timestamp: new Date().toISOString(),
      summary: {
        invoices_generated: billingResult.generated_invoices || 0,
        overdue_invoices: overdueResult.overdue_invoices || 0,
        services_suspended: monthlySuspensionResult.suspended_services || 0,
        customers_processed: reactivationResult.processed_customers || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Error in cron billing:", error)
    return NextResponse.json(
      {
        error: "Failed to run automated billing",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

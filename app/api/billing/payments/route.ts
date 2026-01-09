import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getDatabaseUrl(): string {
  const possibleUrls = [
    process.env.DATABASE_URL,
    process.env.NEON_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ]

  for (const url of possibleUrls) {
    if (url && url.trim() !== "") {
      return url
    }
  }

  throw new Error("No database connection string found")
}

const sql = neon(getDatabaseUrl())

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const method = searchParams.get("method") || "all"
    const status = searchParams.get("status") || "all"
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("[v0] Fetching payments with filters:", { search, method, status, dateFrom, dateTo, limit, offset })

    let whereClause = ""
    const searchConditions = []

    if (search) {
      const searchPattern = `%${search}%`
      searchConditions.push(`(
        c.first_name ILIKE '${searchPattern}' OR 
        c.last_name ILIKE '${searchPattern}' OR 
        p.transaction_id ILIKE '${searchPattern}' OR 
        p.id::text ILIKE '${searchPattern}'
      )`)
    }

    if (method !== "all") {
      searchConditions.push(`p.payment_method = '${method}'`)
    }

    if (status !== "all") {
      searchConditions.push(`p.status = '${status}'`)
    }

    if (dateFrom) {
      searchConditions.push(`COALESCE(p.payment_date, p.created_at) >= '${dateFrom}'`)
    }

    if (dateTo) {
      searchConditions.push(`COALESCE(p.payment_date, p.created_at) <= '${dateTo}'`)
    }

    if (searchConditions.length > 0) {
      whereClause = `AND ${searchConditions.join(" AND ")}`
    }

    const paymentsResult = await sql`
      SELECT 
        p.id,
        p.customer_id,
        p.amount,
        p.payment_method,
        p.transaction_id,
        p.status,
        COALESCE(p.payment_date, p.created_at) as received_at,
        p.created_at,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.first_name,
        c.last_name,
        cs.service_plan_id,
        sp.name as plan_name
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN customer_services cs ON cs.customer_id = c.id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE 1=1 ${sql.unsafe(whereClause)}
      ORDER BY COALESCE(p.payment_date, p.created_at) DESC 
      LIMIT ${limit} OFFSET ${offset}
    `

    console.log("[v0] Found", paymentsResult.length, "payments")

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 1=1 ${sql.unsafe(whereClause)}
    `

    const total = Number.parseInt(countResult?.[0]?.total || "0")
    console.log("[v0] Total payments count:", total)

    const payments = (paymentsResult || []).map((payment: any) => ({
      id: payment.id.toString(),
      customer: payment.customer_name || `${payment.first_name || ""} ${payment.last_name || ""}`.trim(),
      customerId: payment.customer_id,
      amount: Number.parseFloat(payment.amount || "0"),
      method: payment.payment_method || "Unknown",
      reference: payment.transaction_id || "",
      status: payment.status || "pending",
      date: payment.received_at ? new Date(payment.received_at).toLocaleDateString() : "",
      time: payment.received_at ? new Date(payment.received_at).toLocaleTimeString() : "",
      invoice: "", // No direct invoice link in payments table
      plan: payment.plan_name || "Standard Plan",
    }))

    console.log("[v0] Returning", payments.length, "formatted payments")

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching payments:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payments",
        data: [],
        pagination: {
          total: 0,
          limit: 100,
          offset: 0,
          hasMore: false,
        },
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get("customer_id")

    if (!customerId) {
      return NextResponse.json({ success: false, error: "customer_id is required" }, { status: 400 })
    }

    const customerIdNum = Number.parseInt(customerId)
    if (isNaN(customerIdNum)) {
      return NextResponse.json({ success: false, error: "customer_id must be a valid integer" }, { status: 400 })
    }

    // Fetch customer services with service plan details
    const services = await sql`
      SELECT 
        cs.id,
        cs.customer_id,
        cs.status,
        cs.start_date,
        cs.end_date,
        cs.monthly_fee,
        cs.ip_address,
        cs.activated_at,
        cs.created_at,
        sp.name as service_name,
        sp.description as service_type,
        sp.download_speed,
        sp.upload_speed
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerIdNum}
      ORDER BY cs.created_at DESC
    `

    return NextResponse.json({
      success: true,
      services: services || [],
      total: services.length,
    })
  } catch (error) {
    console.error("Error fetching customer services:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch customer services" }, { status: 500 })
  }
}

import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const customers = await sql`
      SELECT 
        c.id,
        c.name,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.customer_type,
        c.status,
        c.physical_address,
        c.physical_city,
        c.physical_county,
        l.name as location_name,
        sp.name as service_plan_name,
        sp.price_kes as monthly_fee,
        c.created_at
      FROM customers c
      LEFT JOIN locations l ON c.location_id = l.id
      LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.tariff_id = sp.id
      ORDER BY c.created_at DESC
    `

    // Convert to CSV
    const headers = [
      "ID",
      "Name",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Type",
      "Status",
      "Address",
      "City",
      "County",
      "Location",
      "Service Plan",
      "Monthly Fee",
      "Created At",
    ]

    const csvContent = [
      headers.join(","),
      ...customers.map((customer) =>
        [
          customer.id,
          `"${customer.name || ""}"`,
          `"${customer.first_name || ""}"`,
          `"${customer.last_name || ""}"`,
          customer.email,
          customer.phone,
          customer.customer_type,
          customer.status,
          `"${customer.physical_address || ""}"`,
          `"${customer.physical_city || ""}"`,
          `"${customer.physical_county || ""}"`,
          `"${customer.location_name || ""}"`,
          `"${customer.service_plan_name || ""}"`,
          customer.monthly_fee || 0,
          customer.created_at,
        ].join(","),
      ),
    ].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Failed to export customers:", error)
    return NextResponse.json({ error: "Failed to export customers" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()

    // Clear data from tables
    await sql`TRUNCATE TABLE support_tickets CASCADE`
    await sql`TRUNCATE TABLE services CASCADE`
    await sql`TRUNCATE TABLE invoices CASCADE`
    await sql`TRUNCATE TABLE network_devices CASCADE`
    await sql`TRUNCATE TABLE customers CASCADE`

    return NextResponse.json({
      success: true,
      message: "Dashboard data reset successfully",
    })
  } catch (error: any) {
    console.error("Reset error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

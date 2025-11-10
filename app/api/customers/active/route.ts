import sql from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const result = await sql("SELECT COUNT(*) AS active_count FROM customers WHERE status = $1", ["active"])

    return NextResponse.json({
      count: Number.parseInt(result[0]?.active_count || "0"),
    })
  } catch (error: any) {
    console.error("Active customers error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch active customers",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

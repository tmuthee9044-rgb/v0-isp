import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()
    await sql`SELECT 1`

    return NextResponse.json({
      isSetupComplete: true,
      message: "Database connected successfully",
      status: "connected",
    })
  } catch (error) {
    console.error("Database status check failed:", error)
    return NextResponse.json(
      {
        isSetupComplete: false,
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
        status: "disconnected",
      },
      { status: 500 },
    )
  }
}

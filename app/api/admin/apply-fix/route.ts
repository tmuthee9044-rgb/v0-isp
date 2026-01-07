import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Triggering missing columns fix...")

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/fix-missing-columns`,
      {
        method: "POST",
      },
    )

    const result = await response.json()

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error triggering fix:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

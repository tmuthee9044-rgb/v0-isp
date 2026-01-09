import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { type } = await request.json()

    // Trigger manual sync by calling the cron endpoints
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    let endpoint = ""
    if (type === "routers") {
      endpoint = "/api/cron/sync-routers"
    } else if (type === "ip-assignments") {
      endpoint = "/api/cron/sync-ip-assignments"
    } else {
      return NextResponse.json({ error: "Invalid sync type" }, { status: 400 })
    }

    // Get the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Call the cron endpoint
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    })

    const result = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Manual sync completed for ${type}`,
        data: result,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Sync failed",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error triggering manual sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}

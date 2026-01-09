import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const result = await sql`
      SELECT value FROM system_config 
      WHERE key = 'content_terms'
    `

    if (result.length > 0) {
      return NextResponse.json({
        content: JSON.parse(result[0].value),
      })
    }

    return NextResponse.json({ error: "Terms content not found" }, { status: 404 })
  } catch (error) {
    console.error("[v0] Error fetching terms content:", error)
    return NextResponse.json({ error: "Failed to fetch terms content" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    const contentWithTimestamp = {
      ...content,
      lastUpdated: new Date().toLocaleDateString(),
    }

    await sql`
      INSERT INTO system_config (key, value, created_at) 
      VALUES ('content_terms', ${JSON.stringify(contentWithTimestamp)}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${JSON.stringify(contentWithTimestamp)}, created_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({ success: true, message: "Terms content saved successfully" })
  } catch (error) {
    console.error("[v0] Error saving terms content:", error)
    return NextResponse.json({ error: "Failed to save terms content" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const configs = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'sms_%'
    `

    const config = {
      provider: "mock", // Default to mock for testing
      apiKey: "",
      senderId: "ISP Support",
      isActive: false,
    }

    // Parse configuration from database
    configs.forEach((item: any) => {
      switch (item.key) {
        case "sms_provider":
          config.provider = item.value
          break
        case "sms_api_key":
          config.apiKey = item.value
          break
        case "sms_sender_id":
          config.senderId = item.value
          break
        case "sms_active":
          config.isActive = item.value === "true"
          break
      }
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error("Error fetching SMS config:", error)
    return NextResponse.json({ error: "Failed to fetch SMS config" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { provider, apiKey, senderId, isActive } = await request.json()

    // Update SMS configuration in database
    const configUpdates = [
      { key: "sms_provider", value: provider },
      { key: "sms_api_key", value: apiKey },
      { key: "sms_sender_id", value: senderId },
      { key: "sms_active", value: isActive.toString() },
    ]

    for (const config of configUpdates) {
      await sql`
        INSERT INTO system_config (key, value, created_at) 
        VALUES (${config.key}, ${config.value}, NOW())
        ON CONFLICT (key) 
        DO UPDATE SET value = ${config.value}
      `
    }

    return NextResponse.json({ message: "SMS configuration updated successfully" })
  } catch (error) {
    console.error("Error updating SMS config:", error)
    return NextResponse.json({ error: "Failed to update SMS config" }, { status: 500 })
  }
}

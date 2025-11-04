import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Fetching portal settings from database")

    const settings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'portal_%'
      ORDER BY key
    `

    console.log("[v0] Found settings:", settings.length)

    const portalSettings: any = {
      customer: {},
      admin: {},
      themes: {},
      features: {},
    }

    // Parse database values into structured object
    settings.forEach((setting) => {
      const keys = setting.key.replace("portal_", "").split("_")
      let current: any = portalSettings

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }

      const lastKey = keys[keys.length - 1]
      // Parse value as JSON, number, or boolean
      try {
        current[lastKey] = JSON.parse(setting.value)
      } catch {
        if (setting.value === "true") {
          current[lastKey] = true
        } else if (setting.value === "false") {
          current[lastKey] = false
        } else if (!isNaN(Number(setting.value))) {
          current[lastKey] = Number(setting.value)
        } else {
          current[lastKey] = setting.value
        }
      }
    })

    console.log("[v0] Returning portal settings")
    return NextResponse.json(portalSettings)
  } catch (error) {
    console.error("[v0] Error fetching portal settings:", error)
    return NextResponse.json({ error: "Failed to fetch portal settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Saving portal settings")
    const settings = await request.json()

    const flattenSettings = (obj: any, prefix = "portal"): Array<{ key: string; value: string }> => {
      const result: Array<{ key: string; value: string }> = []

      for (const [key, value] of Object.entries(obj)) {
        const fullKey = `${prefix}_${key}`

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          result.push(...flattenSettings(value, fullKey))
        } else {
          result.push({
            key: fullKey,
            value: JSON.stringify(value),
          })
        }
      }

      return result
    }

    const flatSettings = flattenSettings(settings)
    console.log("[v0] Flattened settings count:", flatSettings.length)

    for (const setting of flatSettings) {
      await sql`
        INSERT INTO system_config (key, value, created_at)
        VALUES (${setting.key}, ${setting.value}, NOW())
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          created_at = NOW()
      `
    }

    console.log("[v0] Portal settings saved successfully")
    return NextResponse.json({ success: true, message: "Portal settings saved successfully" })
  } catch (error) {
    console.error("[v0] Error saving portal settings:", error)
    return NextResponse.json({ error: "Failed to save portal settings" }, { status: 500 })
  }
}

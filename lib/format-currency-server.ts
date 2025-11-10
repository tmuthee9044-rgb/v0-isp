import { getSql } from "./db"

export async function getSystemCurrency(): Promise<string> {
  try {
    const sql = await getSql()

    const result = await sql`
      SELECT currency FROM system_config LIMIT 1
    `

    return result[0]?.currency || "KES"
  } catch (error) {
    console.error("Error fetching system currency:", error)
    return "KES"
  }
}

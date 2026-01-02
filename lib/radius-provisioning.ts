import { getSql } from "@/lib/db"

export async function provisionToStandardRadiusTables(
  username: string,
  password: string,
  downloadSpeed: string | number,
  uploadSpeed: string | number,
) {
  try {
    const sql = await getSql()

    // Convert speed values to MikroTik-compatible format
    const downloadLimit = typeof downloadSpeed === "number" ? `${downloadSpeed}M` : downloadSpeed
    const uploadLimit = typeof uploadSpeed === "number" ? `${uploadSpeed}M` : uploadSpeed

    // Add authentication credentials to radcheck table
    await sql`
      INSERT INTO radcheck (username, attribute, op, value)
      VALUES 
        (${username}, 'Cleartext-Password', ':=', ${password})
      ON CONFLICT (username, attribute) 
      DO UPDATE SET value = ${password}, updated_at = NOW()
    `

    // Add bandwidth limits to radreply table in MikroTik format
    await sql`
      INSERT INTO radreply (username, attribute, op, value)
      VALUES 
        (${username}, 'Mikrotik-Rate-Limit', ':=', ${`${uploadLimit}/${downloadLimit}`})
      ON CONFLICT (username, attribute) 
      DO UPDATE SET value = ${`${uploadLimit}/${downloadLimit}`}, updated_at = NOW()
    `

    console.log(`[v0] ✓ Provisioned ${username} to FreeRADIUS tables`)
    return { success: true }
  } catch (error) {
    console.error("[v0] Error provisioning to FreeRADIUS tables:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

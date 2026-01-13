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
      DELETE FROM radcheck 
      WHERE username = ${username} AND attribute = 'Cleartext-Password'
    `

    await sql`
      INSERT INTO radcheck (username, attribute, op, value)
      VALUES 
        (${username}, 'Cleartext-Password', ':=', ${password})
    `

    // Add bandwidth limits to radreply table in MikroTik format
    await sql`
      DELETE FROM radreply 
      WHERE username = ${username} AND attribute = 'Mikrotik-Rate-Limit'
    `

    await sql`
      INSERT INTO radreply (username, attribute, op, value)
      VALUES 
        (${username}, 'Mikrotik-Rate-Limit', ':=', ${`${uploadLimit}/${downloadLimit}`})
    `

    console.log(`[v0] ✓ Provisioned ${username} to FreeRADIUS tables`)
    return { success: true }
  } catch (error) {
    console.error("[v0] Error provisioning to FreeRADIUS tables:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

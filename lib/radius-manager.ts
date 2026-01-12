import { getSql } from "./db"

const sql = getSql()

/**
 * Vendor-specific RADIUS attribute mapping
 * Maps generic speed profile attributes to vendor-specific RADIUS attributes
 */
export const VENDOR_ATTRIBUTES = {
  mikrotik: {
    speed: "Mikrotik-Rate-Limit",
    addressList: "Mikrotik-Address-List",
    queue: "Mikrotik-Queue-Type",
  },
  ubiquiti: {
    speed: "WISPr-Bandwidth-Max-Down",
    uploadSpeed: "WISPr-Bandwidth-Max-Up",
  },
  juniper: {
    speed: "ERX-Qos-Profile-Name",
    serviceBundle: "ERX-Service-Bundle",
  },
  cisco: {
    speed: "Cisco-AVPair",
    qos: "Cisco-Policy-Up",
  },
  generic: {
    speed: "Filter-Id",
    sessionTimeout: "Session-Timeout",
    idleTimeout: "Idle-Timeout",
  },
}

/**
 * Format speed profile for vendor-specific RADIUS attribute
 */
export function formatSpeedAttribute(
  vendor: string,
  downloadSpeed: number,
  uploadSpeed: number,
  burstDownload?: number,
  burstUpload?: number,
): { attribute: string; value: string } {
  switch (vendor.toLowerCase()) {
    case "mikrotik":
      // Format: rx-rate[/tx-rate] [rx-burst-rate[/tx-burst-rate]]
      const burstPart = burstDownload && burstUpload ? ` ${burstDownload}M/${burstUpload}M` : ""
      return {
        attribute: "Mikrotik-Rate-Limit",
        value: `${downloadSpeed}M/${uploadSpeed}M${burstPart}`,
      }

    case "ubiquiti":
      // Ubiquiti uses separate attributes for down/up
      return {
        attribute: "WISPr-Bandwidth-Max-Down",
        value: `${downloadSpeed * 1000000}`, // Convert Mbps to bps
      }

    case "juniper":
      // Juniper uses QoS profile names
      return {
        attribute: "ERX-Qos-Profile-Name",
        value: `profile-${downloadSpeed}M-${uploadSpeed}M`,
      }

    case "cisco":
      // Cisco uses AVPair format
      return {
        attribute: "Cisco-AVPair",
        value: `subscriber:sub-qos-policy-in=rate-limit-${downloadSpeed}M`,
      }

    default:
      // Generic Filter-Id
      return {
        attribute: "Filter-Id",
        value: `speed-${downloadSpeed}M-${uploadSpeed}M`,
      }
  }
}

/**
 * Automatically populate radcheck and radreply tables when service is created
 */
export async function provisionRadiusUser(
  username: string,
  password: string,
  servicePlanId: number,
  vendor = "mikrotik",
) {
  console.log(`[v0] Provisioning RADIUS user: ${username} for vendor: ${vendor}`)

  // Get service plan details
  const plan = await sql`
    SELECT speed_download, speed_upload, burst_download, burst_upload, 
           guaranteed_download, guaranteed_upload, fup_enabled, fup_speed
    FROM service_plans 
    WHERE id = ${servicePlanId}
  `

  if (plan.length === 0) {
    throw new Error(`Service plan ${servicePlanId} not found`)
  }

  const { speed_download, speed_upload, burst_download = null, burst_upload = null } = plan[0]

  // Validate required fields
  if (!speed_download || !speed_upload) {
    throw new Error(`Service plan ${servicePlanId} is missing required speed values`)
  }

  // 1. Insert password check (radcheck)
  await sql`
    INSERT INTO radcheck (username, attribute, op, value)
    VALUES (${username}, 'Cleartext-Password', ':=', ${password})
    ON CONFLICT (username, attribute) 
    DO UPDATE SET value = ${password}
  `

  // 2. Get vendor-specific speed attribute
  const speedAttr = formatSpeedAttribute(vendor, speed_download, speed_upload, burst_download, burst_upload)

  if (!speedAttr.attribute || speedAttr.value === undefined || speedAttr.value === null) {
    throw new Error(`Failed to generate speed attribute for vendor ${vendor}`)
  }

  // 3. Insert speed limit (radreply)
  await sql`
    INSERT INTO radreply (username, attribute, op, value)
    VALUES (${username}, ${speedAttr.attribute}, ':=', ${speedAttr.value})
    ON CONFLICT (username, attribute)
    DO UPDATE SET value = ${speedAttr.value}
  `

  // 4. Add Framed-Protocol for PPPoE
  await sql`
    INSERT INTO radreply (username, attribute, op, value)
    VALUES (${username}, 'Framed-Protocol', ':=', 'PPP')
    ON CONFLICT (username, attribute)
    DO NOTHING
  `

  // 5. Add Framed-Compression
  await sql`
    INSERT INTO radreply (username, attribute, op, value)
    VALUES (${username}, 'Framed-Compression', ':=', 'Van-Jacobson-TCP-IP')
    ON CONFLICT (username, attribute)
    DO NOTHING
  `

  // 6. Add Service-Type
  await sql`
    INSERT INTO radreply (username, attribute, op, value)
    VALUES (${username}, 'Service-Type', ':=', 'Framed-User')
    ON CONFLICT (username, attribute)
    DO NOTHING
  `

  console.log(`[v0] RADIUS user provisioned successfully: ${username} with ${speedAttr.attribute}=${speedAttr.value}`)

  return { username, speedAttribute: speedAttr }
}

/**
 * Update RADIUS attributes when service plan changes
 */
export async function updateRadiusSpeed(username: string, servicePlanId: number, vendor = "mikrotik") {
  const plan = await sql`
    SELECT speed_download, speed_upload, burst_download, burst_upload
    FROM service_plans 
    WHERE id = ${servicePlanId}
  `

  if (plan.length === 0) {
    throw new Error(`Service plan ${servicePlanId} not found`)
  }

  const { speed_download, speed_upload, burst_download, burst_upload } = plan[0]

  const speedAttr = formatSpeedAttribute(vendor, speed_download, speed_upload, burst_download, burst_upload)

  // Update existing speed attribute
  await sql`
    UPDATE radreply 
    SET value = ${speedAttr.value}, attribute = ${speedAttr.attribute}
    WHERE username = ${username} 
    AND (attribute LIKE '%Rate-Limit%' OR attribute LIKE '%Bandwidth%' OR attribute = 'Filter-Id')
  `

  console.log(`[v0] Updated RADIUS speed for ${username}`)
}

/**
 * Suspend user by removing from radcheck (user can't authenticate)
 */
export async function suspendRadiusUser(username: string) {
  await sql`
    DELETE FROM radcheck WHERE username = ${username}
  `
  console.log(`[v0] Suspended RADIUS user: ${username}`)
}

/**
 * Unsuspend user by restoring radcheck entry
 */
export async function unsuspendRadiusUser(username: string, password: string) {
  await sql`
    INSERT INTO radcheck (username, attribute, op, value)
    VALUES (${username}, 'Cleartext-Password', ':=', ${password})
    ON CONFLICT (username, attribute)
    DO UPDATE SET value = ${password}
  `
  console.log(`[v0] Unsuspended RADIUS user: ${username}`)
}

/**
 * Deprovision user completely - remove from both radcheck and radreply
 * Used when service is terminated/deleted
 */
export async function deprovisionRadiusUser({
  customerId,
  serviceId,
  username,
  reason,
}: {
  customerId: number
  serviceId: string | number
  username: string
  reason?: string
}) {
  try {
    // Remove from radcheck (authentication)
    await sql`
      DELETE FROM radcheck WHERE username = ${username}
    `

    // Remove from radreply (authorization attributes)
    await sql`
      DELETE FROM radreply WHERE username = ${username}
    `

    // Remove from radusergroup if exists
    await sql`
      DELETE FROM radusergroup WHERE username = ${username}
    `

    console.log(`[v0] Deprovisioned RADIUS user: ${username} - Reason: ${reason || "Service terminated"}`)

    return { success: true }
  } catch (error) {
    console.error(`[v0] Error deprovisioning RADIUS user ${username}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to deprovision user",
    }
  }
}

/**
 * Get current online sessions from radacct
 */
export async function getOnlineSessions() {
  const sessions = await sql`
    SELECT 
      username,
      nasipaddress,
      acctstarttime,
      acctsessiontime,
      acctinputoctets,
      acctoutputoctets,
      framedipaddress,
      callingstationid
    FROM radacct
    WHERE acctstoptime IS NULL
    ORDER BY acctstarttime DESC
  `

  return sessions
}

/**
 * Get session statistics for a specific user
 */
export async function getUserSessionStats(username: string) {
  const stats = await sql`
    SELECT 
      COUNT(*) as total_sessions,
      SUM(acctinputoctets + acctoutputoctets) as total_bytes,
      SUM(acctsessiontime) as total_time,
      MAX(acctstarttime) as last_session
    FROM radacct
    WHERE username = ${username}
  `

  return stats[0]
}

/**
 * Disconnect active session (for disconnection via RADIUS CoA/DM)
 */
export async function getActiveSession(username: string) {
  const session = await sql`
    SELECT 
      radacctid,
      acctsessionid,
      nasipaddress,
      nasportid,
      framedipaddress
    FROM radacct
    WHERE username = ${username} AND acctstoptime IS NULL
    LIMIT 1
  `

  return session[0] || null
}

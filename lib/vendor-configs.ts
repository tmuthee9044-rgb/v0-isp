/**
 * Vendor-Specific Configuration Generators for MikroTik, Ubiquiti, and Juniper
 * Maps speed profiles and RADIUS attributes to vendor-specific formats
 */

export interface VendorSpeedProfile {
  vendor: "mikrotik" | "ubiquiti" | "juniper"
  downloadLimit: string
  uploadLimit: string
  burstDownload?: string
  burstUpload?: string
  burstThreshold?: string
  burstTime?: number
  priority?: number
}

export interface RADIUSAttribute {
  attribute: string
  op: string
  value: string
}

/**
 * Convert speed profile to vendor-specific RADIUS attributes
 */
export function generateRADIUSAttributes(
  vendor: "mikrotik" | "ubiquiti" | "juniper",
  speedProfile: {
    speed_download: number
    speed_upload: number
    burst_download?: number
    burst_upload?: number
    burst_duration?: number
    priority_level?: string
  },
): RADIUSAttribute[] {
  const attributes: RADIUSAttribute[] = []

  switch (vendor) {
    case "mikrotik":
      // MikroTik-Rate-Limit format: "rx-rate[/tx-rate] [rx-burst-rate[/tx-burst-rate] [rx-burst-threshold[/tx-burst-threshold] [rx-burst-time[/tx-burst-time]]]]"
      const downloadMbps = Math.floor(speedProfile.speed_download / 1000000)
      const uploadMbps = Math.floor(speedProfile.speed_upload / 1000000)
      const burstDown = speedProfile.burst_download
        ? Math.floor(speedProfile.burst_download / 1000000)
        : downloadMbps * 2
      const burstUp = speedProfile.burst_upload ? Math.floor(speedProfile.burst_upload / 1000000) : uploadMbps * 2
      const burstTime = speedProfile.burst_duration || 8

      attributes.push({
        attribute: "Mikrotik-Rate-Limit",
        op: ":=",
        value: `${uploadMbps}M/${downloadMbps}M ${burstUp}M/${burstDown}M ${Math.floor(uploadMbps * 0.75)}M/${Math.floor(downloadMbps * 0.75)}M ${burstTime}/${burstTime} ${speedProfile.priority_level === "high" ? "1" : "8"}`,
      })
      break

    case "ubiquiti":
      // Ubiquiti uses standard RADIUS attributes
      attributes.push(
        {
          attribute: "Acct-Interim-Interval",
          op: ":=",
          value: "300",
        },
        {
          attribute: "Session-Timeout",
          op: ":=",
          value: "0",
        },
        {
          attribute: "Idle-Timeout",
          op: ":=",
          value: "600",
        },
      )
      // Bandwidth shaping via Mikrotik-Rate-Limit (EdgeRouter supports it)
      const ubntDownMbps = Math.floor(speedProfile.speed_download / 1000000)
      const ubntUpMbps = Math.floor(speedProfile.speed_upload / 1000000)
      attributes.push({
        attribute: "Mikrotik-Rate-Limit",
        op: ":=",
        value: `${ubntUpMbps}M/${ubntDownMbps}M`,
      })
      break

    case "juniper":
      // Juniper uses Service Activate policies
      const jnprDownKbps = Math.floor(speedProfile.speed_download / 1000)
      const jnprUpKbps = Math.floor(speedProfile.speed_upload / 1000)

      attributes.push(
        {
          attribute: "ERX-Ingress-Policy-Name",
          op: ":=",
          value: `rate-limit-${jnprDownKbps}k`,
        },
        {
          attribute: "ERX-Egress-Policy-Name",
          op: ":=",
          value: `rate-limit-${jnprUpKbps}k`,
        },
        {
          attribute: "Service-Type",
          op: ":=",
          value: "Framed-User",
        },
        {
          attribute: "Framed-Protocol",
          op: ":=",
          value: "PPP",
        },
      )
      break
  }

  return attributes
}

/**
 * Generate MikroTik RouterOS Script (.rsc)
 */
export function generateMikroTikScript(config: {
  radiusServer: string
  radiusSecret: string
  pppoeInterface: string
  localAddress: string
  poolStart: string
  poolEnd: string
  users?: Array<{ username: string; password: string; profile?: string }>
}): string {
  return `# MikroTik RouterOS Configuration
# Generated: ${new Date().toISOString()}

/interface pppoe-server server
add service-name=ISP_PPPoE interface=${config.pppoeInterface} disabled=no max-mtu=1480 max-mru=1480 \\
    one-session-per-host=yes default-profile=default-pppoe-profile authentication=pap,chap,mschap1,mschap2

/ppp profile
add name="default-pppoe-profile" local-address=${config.localAddress} remote-address=pppoe-pool \\
    use-mpls=no use-compression=no use-encryption=no

/radius
add service=ppp address=${config.radiusServer} secret=${config.radiusSecret} timeout=3s

/ip pool
add name=pppoe-pool ranges=${config.poolStart}-${config.poolEnd}

${
  config.users && config.users.length > 0
    ? `# Direct PPPoE Users (Bypass RADIUS)
${config.users.map((u) => `/ppp secret add name=${u.username} password=${u.password} profile=${u.profile || "default-pppoe-profile"} service=pppoe`).join("\n")}`
    : ""
}
`
}

/**
 * Generate Ubiquiti EdgeRouter Configuration
 */
export function generateUbiquitiScript(config: {
  radiusServer: string
  radiusSecret: string
  interface: string
  localAddress: string
  poolStart: string
  poolEnd: string
  users?: Array<{ username: string; password: string }>
}): string {
  return `# Ubiquiti EdgeRouter Configuration
# Generated: ${new Date().toISOString()}

configure

# RADIUS Server
set service radius-server ${config.radiusServer} secret ${config.radiusSecret}
set service radius-server ${config.radiusServer} port 1812

# PPPoE Server
set interfaces ethernet ${config.interface} pppoe-server authentication ms-chap-v2
set interfaces ethernet ${config.interface} pppoe-server local-address ${config.localAddress}
set interfaces ethernet ${config.interface} pppoe-server remote-address ${config.poolStart}-${config.poolEnd}
set interfaces ethernet ${config.interface} pppoe-server radius-server ${config.radiusServer}

${
  config.users && config.users.length > 0
    ? `# Direct PPPoE Users (Local Authentication)
${config.users.map((u) => `set service pppoe-server secret ${u.username} password ${u.password}`).join("\n")}`
    : ""
}

commit
save
`
}

/**
 * Generate Juniper Configuration
 */
export function generateJuniperScript(config: {
  radiusServer: string
  radiusSecret: string
  interface: string
  poolName: string
  poolStart: string
  poolEnd: string
  users?: Array<{ username: string; password: string }>
}): string {
  return `# Juniper MX / SRX / BRAS Configuration
# Generated: ${new Date().toISOString()}

set access profile ISP radius-server ${config.radiusServer} secret ${config.radiusSecret}
set access profile ISP authentication-order radius
set access profile ISP accounting-order radius
set access profile ISP radius-server ${config.radiusServer} port 1812
set access profile ISP radius-server ${config.radiusServer} accounting-port 1813

# Address Pool
set access address-assignment pool ${config.poolName} family inet network ${config.poolStart}
set access address-assignment pool ${config.poolName} family inet range ${config.poolName}-range low ${config.poolStart}
set access address-assignment pool ${config.poolName} family inet range ${config.poolName}-range high ${config.poolEnd}

# PPPoE Interface
set interfaces ${config.interface} unit 0 encapsulation ppp-over-ether
set interfaces ${config.interface} unit 0 pppoe-options access-profile ISP
set interfaces ${config.interface} unit 0 pppoe-options pool ${config.poolName}

${
  config.users && config.users.length > 0
    ? `# Local Users (Direct Authentication)
${config.users
  .map(
    (u) => `set access profile ISP local-users ${u.username} password "${u.password}"
set access profile ISP local-users ${u.username} service pppoe`,
  )
  .join("\n")}`
    : ""
}

commit
`
}

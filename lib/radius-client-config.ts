/**
 * RADIUS Client Configuration Generator
 * Generates vendor-safe FreeRADIUS client configs for copy-paste into routers
 */

export interface RADIUSClientConfig {
  nasName: string
  nasIpAddress: string
  secret: string
  shortname: string
  nasType: "mikrotik" | "ubiquiti" | "juniper"
  description?: string
}

/**
 * Generate FreeRADIUS clients.conf entry
 */
export function generateFreeRADIUSClientConfig(config: RADIUSClientConfig): string {
  return `# FreeRADIUS Client Configuration
# Generated: ${new Date().toISOString()}
# Add this to /etc/freeradius/3.0/clients.conf

client ${config.shortname} {
    ipaddr = ${config.nasIpAddress}
    secret = ${config.secret}
    shortname = ${config.shortname}
    nastype = other
    ${config.description ? `# ${config.description}` : ""}
    
    # Performance tuning
    limit {
        max_connections = 16
        lifetime = 0
        idle_timeout = 30
    }
}
`
}

/**
 * Generate MikroTik RADIUS client configuration
 */
export function generateMikroTikRADIUSConfig(config: {
  radiusServerIP: string
  radiusSecret: string
  nasIpAddress: string
}): string {
  return `# MikroTik RADIUS Client Configuration
# Generated: ${new Date().toISOString()}
# Copy-paste into MikroTik Terminal

/radius
add address=${config.radiusServerIP} secret="${config.radiusSecret}" service=ppp,login timeout=3s src-address=${config.nasIpAddress}

/radius incoming
set accept=yes port=3799

# Enable RADIUS for PPPoE
/ppp aaa
set accounting=yes interim-update=5m use-radius=yes

# Test RADIUS connectivity
/radius monitor [find where address="${config.radiusServerIP}"]
`
}

/**
 * Generate Ubiquiti RADIUS client configuration
 */
export function generateUbiquitiRADIUSConfig(config: {
  radiusServerIP: string
  radiusSecret: string
  nasIpAddress: string
}): string {
  return `# Ubiquiti EdgeRouter RADIUS Client Configuration
# Generated: ${new Date().toISOString()}
# Run these commands in EdgeRouter CLI

configure

# Add RADIUS server
set system radius-server ${config.radiusServerIP} secret ${config.radiusSecret}
set system radius-server ${config.radiusServerIP} port 1812
set system radius-server ${config.radiusServerIP} acct-port 1813
set system radius-server ${config.radiusServerIP} timeout 3

# Set NAS identifier
set system radius-server ${config.radiusServerIP} nas-ip-address ${config.nasIpAddress}

# Enable RADIUS for PPPoE
set service pppoe-server authentication radius ${config.radiusServerIP}
set service pppoe-server authentication mode radius

commit
save
exit

# Test RADIUS connectivity
show radius-server
`
}

/**
 * Generate Juniper RADIUS client configuration
 */
export function generateJuniperRADIUSConfig(config: {
  radiusServerIP: string
  radiusSecret: string
  nasIpAddress: string
}): string {
  return `# Juniper RADIUS Client Configuration
# Generated: ${new Date().toISOString()}
# Run these commands in Junos CLI

configure

# Add RADIUS server
set access profile ISP radius-server ${config.radiusServerIP} port 1812
set access profile ISP radius-server ${config.radiusServerIP} accounting-port 1813
set access profile ISP radius-server ${config.radiusServerIP} secret "${config.radiusSecret}"
set access profile ISP radius-server ${config.radiusServerIP} timeout 3
set access profile ISP radius-server ${config.radiusServerIP} retry 3
set access profile ISP radius-server ${config.radiusServerIP} source-address ${config.nasIpAddress}

# Set authentication order
set access profile ISP authentication-order radius
set access profile ISP accounting-order radius

# Enable interim accounting
set access profile ISP accounting immediate-update
set access profile ISP accounting update-interval 300

commit and-quit

# Verify RADIUS configuration
show configuration access profile ISP
`
}

/**
 * Generate complete router setup guide
 */
export function generateRouterSetupGuide(config: {
  vendor: "mikrotik" | "ubiquiti" | "juniper"
  routerName: string
  radiusServerIP: string
  radiusSecret: string
  nasIpAddress: string
  shortname: string
}): {
  freeradiusConfig: string
  routerConfig: string
  testCommands: string
} {
  const freeradiusConfig = generateFreeRADIUSClientConfig({
    nasName: config.routerName,
    nasIpAddress: config.nasIpAddress,
    secret: config.radiusSecret,
    shortname: config.shortname,
    nasType: config.vendor,
    description: `${config.vendor.toUpperCase()} Router - ${config.routerName}`,
  })

  let routerConfig = ""
  let testCommands = ""

  switch (config.vendor) {
    case "mikrotik":
      routerConfig = generateMikroTikRADIUSConfig({
        radiusServerIP: config.radiusServerIP,
        radiusSecret: config.radiusSecret,
        nasIpAddress: config.nasIpAddress,
      })
      testCommands = `# MikroTik Test Commands
/ppp secret print
/radius monitor [find]
/log print where topics~"radius"
`
      break

    case "ubiquiti":
      routerConfig = generateUbiquitiRADIUSConfig({
        radiusServerIP: config.radiusServerIP,
        radiusSecret: config.radiusSecret,
        nasIpAddress: config.nasIpAddress,
      })
      testCommands = `# Ubiquiti Test Commands
show radius-server
show pppoe-server sessions
show log | match radius
`
      break

    case "juniper":
      routerConfig = generateJuniperRADIUSConfig({
        radiusServerIP: config.radiusServerIP,
        radiusSecret: config.radiusSecret,
        nasIpAddress: config.nasIpAddress,
      })
      testCommands = `# Juniper Test Commands
show subscribers
show radius-server statistics
show log messages | match radius
`
      break
  }

  return { freeradiusConfig, routerConfig, testCommands }
}

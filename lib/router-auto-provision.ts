import type { VendorType } from "./vendor-provisioning"

export interface RouterProvisionConfig {
  routerId: number
  routerIp: string
  radiusIp: string
  radiusSecret: string
  radiusIpSecondary?: string
  radiusSecretSecondary?: string
  mgmtIp?: string
  safeDNS?: boolean
  vendor: VendorType
}

/**
 * Generate idempotent auto-provisioning scripts for routers
 * These scripts configure RADIUS, CoA, accounting, DNS, and firewall rules
 */
export class RouterAutoProvision {
  /**
   * Generate MikroTik auto-provision script
   */
  static generateMikroTikScript(config: RouterProvisionConfig): string {
    const { radiusIp, radiusSecret, radiusIpSecondary, radiusSecretSecondary, mgmtIp } = config
    const dnsServers = config.safeDNS ? "1.1.1.3,1.0.0.3" : "8.8.8.8,8.8.4.4"

    return `# ================= ISP AUTO PROVISION =================

# --- RADIUS (PRIMARY + FAILOVER) ---
/radius remove [find]
/radius add address=${radiusIp} secret=${radiusSecret} service=ppp,hotspot \\
    authentication-port=1812 accounting-port=1813 timeout=300ms
${radiusIpSecondary ? `/radius add address=${radiusIpSecondary} secret=${radiusSecretSecondary || radiusSecret} service=ppp,hotspot \\
    authentication-port=1812 accounting-port=1813 timeout=300ms` : ""}

/radius incoming set accept=yes port=3799

# --- AAA ---
/ppp aaa set use-radius=yes accounting=yes interim-update=1m

# --- HOTSPOT ---
/ip hotspot profile set [find default=yes] use-radius=yes

# --- DNS (Parental Control Ready) ---
/ip dns set servers=${dnsServers} allow-remote-requests=yes

# --- FIREWALL (INPUT) ---
/ip firewall filter add chain=input connection-state=established,related \\
    action=accept comment="ISP_MANAGED:STATE"

/ip firewall filter add chain=input protocol=udp dst-port=1812,1813 \\
    src-address=${radiusIp} action=accept comment="ISP_MANAGED:RADIUS"

/ip firewall filter add chain=input protocol=udp dst-port=3799 \\
    src-address=${radiusIp} action=accept comment="ISP_MANAGED:COA"

/ip firewall filter add chain=input protocol=tcp dst-port=22,8728,443 \\
    src-address=${mgmtIp || "0.0.0.0"} action=accept comment="ISP_MANAGED:MGMT"

/ip firewall filter add chain=input action=drop comment="ISP_MANAGED:DROP"

# --- FASTTRACK SAFE ---
/ip firewall filter add chain=forward connection-state=established,related \\
    src-address-list=!radius_clients action=fasttrack-connection \\
    comment="ISP_MANAGED:FASTTRACK_SAFE"

# --- SECURITY HARDENING ---
/ip service set telnet disabled=yes
/ip service set ftp disabled=yes
/ip service set www disabled=yes
/ip service set api address=${mgmtIp || "0.0.0.0"}
/ip service set ssh address=${mgmtIp || "0.0.0.0"}

# --- BRUTE-FORCE PROTECTION ---
/ip firewall filter add chain=input protocol=tcp dst-port=22 connection-state=new \\
    src-address-list=blacklist action=drop comment="ISP_MANAGED:BRUTEFORCE"

# ================= END =================
`
  }

  /**
   * Generate Ubiquiti EdgeOS auto-provision script
   */
  static generateUbiquitiScript(config: RouterProvisionConfig): string {
    const { radiusIp, radiusSecret } = config

    return `configure

set system ntp server pool.ntp.org

set service radius-server host ${radiusIp} key ${radiusSecret}
set service radius-server authentication-port 1812
set service radius-server accounting-port 1813

set firewall name ISP-IN rule 10 action accept
set firewall name ISP-IN rule 10 protocol udp
set firewall name ISP-IN rule 10 destination port 1812,1813
set firewall name ISP-IN rule 10 source address ${radiusIp}

set firewall name ISP-IN rule 20 action accept
set firewall name ISP-IN rule 20 protocol udp
set firewall name ISP-IN rule 20 destination port 3799
set firewall name ISP-IN rule 20 source address ${radiusIp}

set interfaces ethernet eth0 firewall in name ISP-IN

commit
save
exit
`
  }

  /**
   * Generate Juniper auto-provision script
   */
  static generateJuniperScript(config: RouterProvisionConfig): string {
    const { radiusIp, radiusSecret } = config

    return `set system radius-server ${radiusIp} secret ${radiusSecret}
set system accounting destination radius server ${radiusIp}
set system accounting events login logout

set applications application radius-coa protocol udp destination-port 3799

set security policies from-zone trust to-zone trust policy RADIUS \\
    match application junos-radius
set security policies from-zone trust to-zone trust policy RADIUS then permit

commit
`
  }

  /**
   * Generate appropriate script based on vendor
   */
  static generateScript(config: RouterProvisionConfig): string {
    switch (config.vendor) {
      case "mikrotik":
        return this.generateMikroTikScript(config)
      case "ubiquiti":
        return this.generateUbiquitiScript(config)
      case "juniper":
        return this.generateJuniperScript(config)
      default:
        throw new Error(`Unsupported vendor: ${config.vendor}`)
    }
  }
}

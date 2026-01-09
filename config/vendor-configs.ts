/**
 * Vendor-specific Router Configuration Templates
 * For FreeRADIUS integration with MikroTik, Ubiquiti, and Juniper routers
 */

export const VENDOR_CONFIGS = {
  freeradius: {
    name: "FreeRADIUS SQL Configuration",
    description: "PostgreSQL-based RADIUS authentication and accounting",
    config: `# mods-available/sql.conf for PostgreSQL
sql {
    driver = "rlm_sql_postgresql"
    server = "127.0.0.1"
    login = "radius"
    password = "radius_password"
    radius_db = "radius"
    port = 5432
    
    pool {
        start = 5
        min = 5
        max = 50
        spare = 5
        uses = 0
    }
    
    read_clients = yes
    delete_stale_sessions = yes
    sqltrace = no
    nostrip = yes
    include_nulls = yes
}`,
  },

  mikrotik: {
    name: "MikroTik RouterOS",
    description: "PPPoE Server with RADIUS authentication",
    pppoeConfig: `# PPPoE Server Configuration
/interface pppoe-server server
add service-name=ISP_PPPoE interface=ether2 disabled=no max-mtu=1480 max-mru=1480 \\
    one-session-per-host=yes default-profile=default-pppoe-profile \\
    authentication=pap,chap

# Profile with RADIUS
/ppp profile
add name="default-pppoe-profile" local-address=192.168.1.1 \\
    remote-address=pppoe-pool use-mpls=no

# RADIUS client
/radius
add service=ppp address=192.168.1.100 secret=radiussecret

# IP Pool
/ip pool
add name=pppoe-pool ranges=192.168.1.100-192.168.1.200`,

    directPushConfig: `# Direct PPPoE Secret Push (no RADIUS)
/ppp secret
add name=username password=password profile=default-pppoe-profile \\
    service=pppoe remote-address=192.168.1.100`,

    apiPath: "/ppp/secret",
    vendor: "mikrotik",
  },

  ubiquiti: {
    name: "Ubiquiti EdgeRouter",
    description: "PPPoE Server with RADIUS authentication",
    pppoeConfig: `# Enable RADIUS
configure
set service radius-server 192.168.1.100 secret radiussecret
commit
save

# PPPoE Server
set interfaces ethernet eth1 pppoe-server authentication ms-chap-v2
set interfaces ethernet eth1 pppoe-server local-address 192.168.2.1
set interfaces ethernet eth1 pppoe-server remote-address 192.168.2.100-192.168.2.200
commit
save`,

    directPushConfig: `# Direct user push (no RADIUS)
configure
set service pppoe-server secret username password password
commit
save`,

    vendor: "ubiquiti",
  },

  juniper: {
    name: "Juniper MX/SRX",
    description: "PPPoE Server with RADIUS authentication",
    pppoeConfig: `# RADIUS Configuration
set access profile ISP radius-server 192.168.1.100 secret radiussecret
set access profile ISP authentication-order radius
set access profile ISP accounting-order radius

# PPPoE interface
set interfaces ge-0/0/1 unit 0 encapsulation ppp-over-ether
set interfaces ge-0/0/1 unit 0 pppoe-options access-profile ISP
set interfaces ge-0/0/1 unit 0 pppoe-options pool pool-isp`,

    directPushConfig: `# Direct local user (no RADIUS)
set access profile ISP local-users username password "password"
set access profile ISP local-users username service pppoe`,

    vendor: "juniper",
  },
}

export type VendorType = "mikrotik" | "ubiquiti" | "juniper"
export type ProvisioningMode = "radius_only" | "direct_push" | "hybrid"

export interface VendorProvisioningConfig {
  vendor: VendorType
  mode: ProvisioningMode
  radiusServer?: string
  radiusSecret?: string
  localPool?: string
}

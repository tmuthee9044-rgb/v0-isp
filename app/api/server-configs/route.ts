import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const configs = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'radius_%' OR key LIKE 'openvpn_%' OR key LIKE 'network_%'
    `

    const serverConfigs = {
      radius: {
        enabled: configs.find((c) => c.key === "radius_enabled")?.value === "true" || false,
        host: configs.find((c) => c.key === "radius_host")?.value || "",
        authPort: configs.find((c) => c.key === "radius_auth_port")?.value || "1812",
        acctPort: configs.find((c) => c.key === "radius_acct_port")?.value || "1813",
        sharedSecret: configs.find((c) => c.key === "radius_shared_secret")?.value || "",
        timeout: configs.find((c) => c.key === "radius_timeout")?.value || "30",
      },
      openvpn: {
        enabled: configs.find((c) => c.key === "openvpn_enabled")?.value === "true" || false,
        serverIp: configs.find((c) => c.key === "openvpn_server_ip")?.value || "",
        port: configs.find((c) => c.key === "openvpn_port")?.value || "1194",
        protocol: configs.find((c) => c.key === "openvpn_protocol")?.value || "udp",
        cipher: configs.find((c) => c.key === "openvpn_cipher")?.value || "aes-256-cbc",
        network: configs.find((c) => c.key === "openvpn_network")?.value || "10.8.0.0/24",
        primaryDns: configs.find((c) => c.key === "openvpn_primary_dns")?.value || "8.8.8.8",
        secondaryDns: configs.find((c) => c.key === "openvpn_secondary_dns")?.value || "8.8.4.4",
      },
      network: {
        gateway: configs.find((c) => c.key === "network_gateway")?.value || "",
        subnetMask: configs.find((c) => c.key === "network_subnet_mask")?.value || "255.255.255.0",
        managementVlan: configs.find((c) => c.key === "network_management_vlan")?.value || "",
        customerVlanRange: configs.find((c) => c.key === "network_customer_vlan_range")?.value || "200-299",
      },
    }

    return NextResponse.json(serverConfigs)
  } catch (error) {
    console.error("Error fetching server configurations:", error)
    return NextResponse.json({ error: "Failed to fetch server configurations" }, { status: 500 })
  }
}

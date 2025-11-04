import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const settings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'server.%' OR key LIKE 'network.%'
    `

    const serverConfig = {
      radius: {
        enabled: false,
        host: "",
        authPort: "1812",
        acctPort: "1813",
        timeout: "30",
        sharedSecret: "",
        authMethods: {
          pap: true,
          chap: true,
          mschap: false,
          mschapv2: false,
        },
      },
      openvpn: {
        enabled: false,
        serverIp: "",
        port: "1194",
        protocol: "udp",
        cipher: "aes-256-cbc",
        vpnNetwork: "10.8.0.0/24",
        primaryDns: "8.8.8.8",
        secondaryDns: "8.8.4.4",
        tlsAuth: true,
        clientToClient: false,
        duplicateCn: false,
        compression: true,
      },
      network: {
        gateway: "",
        subnetMask: "255.255.255.0",
        managementVlan: "",
        customerVlanRange: "",
        snmpCommunity: "public",
        ntpServer: "pool.ntp.org",
        firewall: true,
        ddosProtection: true,
        portScanDetection: false,
        intrusionDetection: false,
        uploadLimit: "10",
        downloadLimit: "50",
        burstRatio: "1.5",
        monitoring: {
          snmp: true,
          bandwidth: true,
          uptime: true,
          alerts: true,
          interval: "5",
          threshold: "80",
        },
      },
    }

    settings.forEach((setting) => {
      const keys = setting.key.split(".")
      const value = JSON.parse(setting.value)

      if (keys[0] === "server" && keys[1] === "radius") {
        if (keys[2] === "authMethods") {
          serverConfig.radius.authMethods = { ...serverConfig.radius.authMethods, ...value }
        } else {
          serverConfig.radius[keys[2]] = value
        }
      } else if (keys[0] === "server" && keys[1] === "openvpn") {
        serverConfig.openvpn[keys[2]] = value
      } else if (keys[0] === "network") {
        if (keys[1] === "monitoring") {
          serverConfig.network.monitoring[keys[2]] = value
        } else {
          serverConfig.network[keys[1]] = value
        }
      }
    })

    return NextResponse.json(serverConfig)
  } catch (error) {
    console.error("Error fetching server settings:", error)
    return NextResponse.json({ error: "Failed to fetch server settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, settings } = body

    if (type === "radius") {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO system_config (key, value, updated_at)
          VALUES (${`server.radius.${key}`}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
        `
      }

      if (settings.enabled) {
        await sql`
          UPDATE network_devices 
          SET config = jsonb_set(
            COALESCE(config, '{}'),
            '{radius}',
            ${JSON.stringify({
              host: settings.host,
              authPort: settings.authPort,
              acctPort: settings.acctPort,
              sharedSecret: settings.sharedSecret,
            })}
          ),
          updated_at = NOW()
          WHERE device_type = 'router' AND status = 'active'
        `
      }
    }

    if (type === "openvpn") {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO system_config (key, value, updated_at)
          VALUES (${`server.openvpn.${key}`}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
        `
      }

      if (settings.enabled) {
        await sql`
          UPDATE network_devices 
          SET config = jsonb_set(
            COALESCE(config, '{}'),
            '{openvpn}',
            ${JSON.stringify({
              port: settings.port,
              protocol: settings.protocol,
              cipher: settings.cipher,
              vpnNetwork: settings.vpnNetwork,
              dns: [settings.primaryDns, settings.secondaryDns],
            })}
          ),
          updated_at = NOW()
          WHERE device_type = 'vpn_server' AND status = 'active'
        `
      }
    }

    if (type === "network") {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO system_config (key, value, updated_at)
          VALUES (${`network.${key}`}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
        `
      }

      await sql`
        UPDATE network_devices 
        SET config = jsonb_set(
          COALESCE(config, '{}'),
          '{network}',
          ${JSON.stringify({
            gateway: settings.gateway,
            subnetMask: settings.subnetMask,
            managementVlan: settings.managementVlan,
            snmpCommunity: settings.snmpCommunity,
            ntpServer: settings.ntpServer,
          })}
        ),
        updated_at = NOW()
        WHERE status = 'active'
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving server settings:", error)
    return NextResponse.json({ error: "Failed to save server settings" }, { status: 500 })
  }
}

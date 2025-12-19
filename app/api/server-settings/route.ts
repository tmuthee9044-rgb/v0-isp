import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  const sql = await getSql()

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
        protocols: {
          pppoe: false,
          ipoe: false,
          hotspot: false,
          wireless: false,
        },
        authMethods: {
          pap: false,
          chap: false,
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
        primaryDns: "",
        secondaryDns: "",
        tlsAuth: false,
        clientToClient: false,
        duplicateCn: false,
        compression: false,
      },
      network: {
        gateway: "",
        subnetMask: "255.255.255.0",
        managementVlan: "",
        customerVlanRange: "",
        snmpCommunity: "",
        ntpServer: "",
        firewall: false,
        ddosProtection: false,
        portScanDetection: false,
        intrusionDetection: false,
        uploadLimit: "",
        downloadLimit: "",
        burstRatio: "",
        monitoring: {
          snmp: false,
          bandwidth: false,
          uptime: false,
          alerts: false,
          interval: "5",
          threshold: "80",
        },
      },
    }

    settings.forEach((setting) => {
      const keys = setting.key.split(".")
      let value
      try {
        value = JSON.parse(setting.value)
      } catch {
        value = setting.value
      }

      if (keys[0] === "server" && keys[1] === "radius") {
        if (keys[2] === "protocols") {
          serverConfig.radius.protocols = { ...serverConfig.radius.protocols, ...value }
        } else if (keys[2] === "authMethods") {
          serverConfig.radius.authMethods = { ...serverConfig.radius.authMethods, ...value }
        } else if (keys[2]) {
          serverConfig.radius[keys[2]] = value
        }
      } else if (keys[0] === "server" && keys[1] === "openvpn") {
        if (keys[2]) {
          serverConfig.openvpn[keys[2]] = value
        }
      } else if (keys[0] === "network") {
        if (keys[1] === "monitoring" && keys[2]) {
          serverConfig.network.monitoring[keys[2]] = value
        } else if (keys[1]) {
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
  const sql = await getSql()

  try {
    const body = await request.json()
    const { type, settings } = body

    if (type === "radius") {
      for (const [key, value] of Object.entries(settings)) {
        if (key === "protocols" || key === "authMethods") {
          await sql`
            INSERT INTO system_config (key, value, updated_at)
            VALUES (${`server.radius.${key}`}, ${JSON.stringify(value)}, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
          `
        } else {
          await sql`
            INSERT INTO system_config (key, value, updated_at)
            VALUES (${`server.radius.${key}`}, ${JSON.stringify(value)}, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
          `
        }
      }

      if (settings.enabled && settings.host && settings.sharedSecret) {
        await sql`
          UPDATE network_devices 
          SET configuration = jsonb_set(
            COALESCE(configuration, '{}'),
            '{radius}',
            ${JSON.stringify({
              host: settings.host,
              authPort: settings.authPort,
              acctPort: settings.acctPort,
              sharedSecret: settings.sharedSecret,
            })}
          ),
          updated_at = NOW()
          WHERE type = 'router' AND status = 'active'
        `

        // Log the configuration update
        await sql`
          INSERT INTO system_logs (level, source, category, message, details, created_at)
          VALUES (
            'INFO',
            'RADIUS Server',
            'server_config',
            'RADIUS configuration updated and pushed to network devices',
            ${JSON.stringify({ host: settings.host, authPort: settings.authPort })},
            NOW()
          )
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
          SET configuration = jsonb_set(
            COALESCE(configuration, '{}'),
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
          WHERE type = 'vpn_server' AND status = 'active'
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
        SET configuration = jsonb_set(
          COALESCE(configuration, '{}'),
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

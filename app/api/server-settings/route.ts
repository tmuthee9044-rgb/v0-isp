import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
const os = require("os")

export async function GET() {
  const sql = await getSql()

  try {
    const settings = await sql`
      SELECT key, value 
      FROM system_config 
      WHERE key LIKE 'server.%' OR key LIKE 'network.%'
    `

    console.log("[v0] Loading server settings from database...")
    console.log("[v0] Found settings:", settings.length)

    let detectedHostIp = ""

    try {
      const interfaces = os.networkInterfaces()
      const priorityOrder = ["eth0", "ens0", "ens3", "ens33", "ens160", "en0", "en1"]

      for (const name of priorityOrder) {
        const iface = interfaces[name]
        if (iface) {
          const ipv4 = iface.find((addr: any) => addr.family === "IPv4" && !addr.internal)
          if (ipv4) {
            detectedHostIp = ipv4.address
            console.log(`[v0] Detected host IP from ${name}:`, detectedHostIp)
            break
          }
        }
      }

      // Fallback to any non-internal IPv4
      if (!detectedHostIp) {
        for (const name in interfaces) {
          const iface = interfaces[name]
          if (iface) {
            const ipv4 = iface.find((addr: any) => addr.family === "IPv4" && !addr.internal)
            if (ipv4) {
              detectedHostIp = ipv4.address
              console.log(`[v0] Detected host IP from ${name}:`, detectedHostIp)
              break
            }
          }
        }
      }

      if (!detectedHostIp) {
        console.warn("[v0] WARNING: Could not detect host IP address!")
      }
    } catch (error) {
      console.error("[v0] Failed to detect host IP:", error)
    }

    const serverConfig = {
      radius: {
        enabled: false,
        host: detectedHostIp || "", // Use detected IP, never use 127.0.0.1
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
        console.log(
          `[v0] RADIUS setting: ${setting.key} = ${typeof value === "string" ? value.substring(0, 10) + "..." : value}`,
        )

        if (keys[2] === "protocols") {
          serverConfig.radius.protocols = { ...serverConfig.radius.protocols, ...value }
        } else if (keys[2] === "authMethods") {
          serverConfig.radius.authMethods = { ...serverConfig.radius.authMethods, ...value }
        } else if (keys[2]) {
          if (keys[2] === "host") {
            if (!value || value === "127.0.0.1" || value === "localhost" || value === "") {
              if (detectedHostIp) {
                serverConfig.radius[keys[2]] = detectedHostIp
                console.log("[v0] Replaced invalid RADIUS host with detected IP:", detectedHostIp)
              } else {
                console.warn("[v0] WARNING: No valid RADIUS host IP available!")
                serverConfig.radius[keys[2]] = ""
              }
            } else {
              serverConfig.radius[keys[2]] = value
              console.log("[v0] Using stored RADIUS host:", value)
            }
          } else {
            serverConfig.radius[keys[2]] = value
          }
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

    console.log("[v0] Final RADIUS config:", {
      ...serverConfig.radius,
      sharedSecret: serverConfig.radius.sharedSecret ? "***SET***" : "NOT SET",
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
        await sql`
          INSERT INTO system_config (key, value, updated_at)
          VALUES (${`server.radius.${key}`}, ${JSON.stringify(value)}, NOW())
          ON CONFLICT (key) DO UPDATE 
          SET value = EXCLUDED.value, updated_at = NOW()
        `
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
          ON CONFLICT (key) DO UPDATE 
          SET value = EXCLUDED.value, updated_at = NOW()
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
          ON CONFLICT (key) DO UPDATE 
          SET value = EXCLUDED.value, updated_at = NOW()
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

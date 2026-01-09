import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ip_address, port, username, password, type, connection_method } = body

    // Validate required fields
    if (!ip_address || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "IP address, username, and password are required",
        },
        { status: 400 },
      )
    }

    let connectionResult = { success: false, message: "Unknown error", details: {} }

    try {
      // Test basic connectivity first (ping simulation)
      const pingResult = await testPing(ip_address)

      if (!pingResult.success) {
        connectionResult = {
          success: false,
          message: "Router is not reachable via ping",
          details: { ping: pingResult },
        }
      } else {
        // Test router-specific API connection
        const routerData = { ip_address, port: port || 8728, username, password, type, connection_method }

        switch (type) {
          case "mikrotik":
            connectionResult = await testMikroTikConnection(routerData)
            break
          case "ubiquiti":
            connectionResult = await testUbiquitiConnection(routerData)
            break
          case "cisco":
            connectionResult = await testCiscoConnection(routerData)
            break
          default:
            connectionResult = await testGenericConnection(routerData)
        }

        // Add ping details to successful connection
        if (connectionResult.success) {
          connectionResult.details = { ...connectionResult.details, ping: pingResult }
        }
      }

      return NextResponse.json(connectionResult)
    } catch (testError) {
      console.error("Connection test error:", testError)

      return NextResponse.json({
        success: false,
        message: "Connection test failed: " + String(testError),
        details: { error: String(testError) },
      })
    }
  } catch (error) {
    console.error("Error in connection test endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process connection test request",
      },
      { status: 500 },
    )
  }
}

// Enhanced connection test functions
async function testPing(ipAddress: string) {
  // Simulate ping test - in production, use actual ping
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Mock ping success based on IP pattern
  const isReachable =
    !ipAddress.includes("unreachable") && !ipAddress.includes("offline") && /^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress)

  return {
    success: isReachable,
    latency: isReachable ? Math.floor(Math.random() * 50) + 10 : null,
    message: isReachable ? "Ping successful" : "Host unreachable",
    timestamp: new Date().toISOString(),
  }
}

async function testMikroTikConnection(router: any) {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock MikroTik API connection
  const isConnectable = !router.ip_address.includes("unreachable")

  return {
    success: isConnectable,
    message: isConnectable
      ? `MikroTik RouterOS API connection successful on port ${router.port}`
      : "Failed to connect to MikroTik RouterOS API - Check credentials and API service",
    details: {
      api_port: router.port,
      connection_method: router.connection_method,
      router_os_version: isConnectable ? "7.10.1" : null,
      api_ssl: router.port === 8729,
      services_detected: isConnectable ? ["api", "ssh", "winbox"] : [],
      timestamp: new Date().toISOString(),
    },
  }
}

async function testUbiquitiConnection(router: any) {
  await new Promise((resolve) => setTimeout(resolve, 800))

  const isConnectable = !router.ip_address.includes("unreachable")

  return {
    success: isConnectable,
    message: isConnectable
      ? "Ubiquiti device SSH connection successful"
      : "Failed to connect to Ubiquiti device - Check SSH credentials",
    details: {
      ssh_port: 22,
      connection_method: router.connection_method,
      firmware_version: isConnectable ? "1.12.33" : null,
      device_model: isConnectable ? "EdgeRouter X" : null,
      services_detected: isConnectable ? ["ssh", "web-ui"] : [],
      timestamp: new Date().toISOString(),
    },
  }
}

async function testCiscoConnection(router: any) {
  await new Promise((resolve) => setTimeout(resolve, 1200))

  const isConnectable = !router.ip_address.includes("unreachable")

  return {
    success: isConnectable,
    message: isConnectable
      ? "Cisco device SSH connection successful"
      : "Failed to connect to Cisco device - Check SSH credentials and enable SSH",
    details: {
      ssh_port: 22,
      connection_method: router.connection_method,
      ios_version: isConnectable ? "15.1(4)M12a" : null,
      device_model: isConnectable ? "ISR4321" : null,
      services_detected: isConnectable ? ["ssh", "telnet", "snmp"] : [],
      timestamp: new Date().toISOString(),
    },
  }
}

async function testGenericConnection(router: any) {
  await new Promise((resolve) => setTimeout(resolve, 600))

  const isConnectable = !router.ip_address.includes("unreachable")

  return {
    success: isConnectable,
    message: isConnectable
      ? "Generic SSH connection successful"
      : "Failed to establish SSH connection - Check credentials and SSH service",
    details: {
      ssh_port: 22,
      connection_method: router.connection_method,
      services_detected: isConnectable ? ["ssh"] : [],
      timestamp: new Date().toISOString(),
    },
  }
}

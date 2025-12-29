import dgram from "dgram"
import crypto from "crypto"
import os from "os"
import { detectRadiusIP } from "./ip-detection"

interface RadiusConfig {
  host: string
  port: number
  secret: string
  timeout?: number
  nasIp?: string // Optional NAS IP address (defaults to auto-detect)
}

interface RadiusTestResult {
  success: boolean
  message: string
  details?: {
    host: string
    port: number
    responseTime?: string
    status: string
    error?: string
  }
}

/**
 * RADIUS Client for testing authentication
 * Implements RFC 2865 - Remote Authentication Dial In User Service (RADIUS)
 */
export class RadiusClient {
  private config: RadiusConfig

  constructor(config: RadiusConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 5000,
    }
  }

  /**
   * Test RADIUS server connectivity and authentication
   * Sends an Access-Request packet to the RADIUS server
   */
  async testConnection(username = "test", password = "test"): Promise<RadiusTestResult> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const socket = dgram.createSocket("udp4")

      // Set timeout
      const timeoutId = setTimeout(() => {
        socket.close()
        resolve({
          success: false,
          message: "Connection timeout - RADIUS server not responding",
          details: {
            host: this.config.host,
            port: this.config.port,
            status: "Timeout",
            error: `No response within ${this.config.timeout}ms`,
          },
        })
      }, this.config.timeout)

      // Create RADIUS Access-Request packet
      const packet = this.createAccessRequest(username, password)

      // Send packet
      socket.send(packet, this.config.port, this.config.host, (error) => {
        if (error) {
          clearTimeout(timeoutId)
          socket.close()
          resolve({
            success: false,
            message: "Failed to send request to RADIUS server",
            details: {
              host: this.config.host,
              port: this.config.port,
              status: "Network Error",
              error: error.message,
            },
          })
        }
      })

      // Handle response
      socket.on("message", (msg) => {
        clearTimeout(timeoutId)
        socket.close()

        const responseTime = Date.now() - startTime
        const code = msg[0]

        // Code 2 = Access-Accept, Code 3 = Access-Reject
        if (code === 2) {
          resolve({
            success: true,
            message: "RADIUS server is responding correctly",
            details: {
              host: this.config.host,
              port: this.config.port,
              responseTime: `${responseTime}ms`,
              status: "Access-Accept received",
            },
          })
        } else if (code === 3) {
          resolve({
            success: true,
            message: "RADIUS server is reachable (rejected test credentials)",
            details: {
              host: this.config.host,
              port: this.config.port,
              responseTime: `${responseTime}ms`,
              status: "Access-Reject received (expected for test)",
            },
          })
        } else {
          resolve({
            success: false,
            message: "RADIUS server sent unexpected response",
            details: {
              host: this.config.host,
              port: this.config.port,
              responseTime: `${responseTime}ms`,
              status: `Unexpected code: ${code}`,
            },
          })
        }
      })

      socket.on("error", (error) => {
        clearTimeout(timeoutId)
        socket.close()
        resolve({
          success: false,
          message: "Network error connecting to RADIUS server",
          details: {
            host: this.config.host,
            port: this.config.port,
            status: "Network Error",
            error: error.message,
          },
        })
      })
    })
  }

  /**
   * Create a RADIUS Access-Request packet per RFC 2865
   */
  private createAccessRequest(username: string, password: string): Buffer {
    const identifier = Math.floor(Math.random() * 256)
    const authenticator = crypto.randomBytes(16)

    // Create attribute list
    const attributes: Buffer[] = []

    // User-Name attribute (type 1)
    const usernameBuf = Buffer.from(username, "utf8")
    const usernameAttr = Buffer.concat([Buffer.from([1, usernameBuf.length + 2]), usernameBuf])
    attributes.push(usernameAttr)

    // User-Password attribute (type 2) - encrypted per RFC 2865
    const encryptedPassword = this.encryptPassword(password, authenticator)
    const passwordAttr = Buffer.concat([Buffer.from([2, encryptedPassword.length + 2]), encryptedPassword])
    attributes.push(passwordAttr)

    const nasIpBytes = this.getNasIpAddress()
    const nasIpAttr = Buffer.concat([Buffer.from([4, 6]), nasIpBytes])
    attributes.push(nasIpAttr)

    // Concatenate all attributes
    const attributesBuffer = Buffer.concat(attributes)

    // Create packet header
    const length = 20 + attributesBuffer.length
    const header = Buffer.alloc(20)
    header[0] = 1 // Code: Access-Request
    header[1] = identifier
    header.writeUInt16BE(length, 2)
    authenticator.copy(header, 4)

    // Combine header and attributes
    return Buffer.concat([header, attributesBuffer])
  }

  /**
   * Encrypt password per RFC 2865 section 5.2
   */
  private encryptPassword(password: string, authenticator: Buffer): Buffer {
    const secret = Buffer.from(this.config.secret, "utf8")
    const passwordBuf = Buffer.alloc(16) // Pad to 16 bytes
    Buffer.from(password, "utf8").copy(passwordBuf)

    // MD5(secret + authenticator)
    const hash = crypto.createHash("md5")
    hash.update(secret)
    hash.update(authenticator)
    const b = hash.digest()

    // XOR password with hash
    const encrypted = Buffer.alloc(16)
    for (let i = 0; i < 16; i++) {
      encrypted[i] = passwordBuf[i] ^ b[i]
    }

    return encrypted
  }

  /**
   * Get the NAS IP address (the IP of this system)
   * NEVER returns 127.0.0.1 - uses production-ready detection
   */
  private async getNasIpAddressAsync(): Promise<Buffer> {
    const shouldAutoDetect =
      !this.config.nasIp ||
      this.config.nasIp === "127.0.0.1" ||
      this.config.nasIp === "localhost" ||
      this.config.nasIp === "::1"

    if (!shouldAutoDetect) {
      try {
        const ipParts = this.config.nasIp.split(".").map((p) => Number.parseInt(p, 10))
        if (ipParts.length === 4 && ipParts.every((p) => p >= 0 && p <= 255)) {
          console.log(`[v0] RADIUS: Using configured NAS IP:`, this.config.nasIp)
          return Buffer.from(ipParts)
        }
      } catch {
        // Fall through to auto-detection
      }
    }

    try {
      const detectedIP = await detectRadiusIP()
      const ipParts = detectedIP.split(".").map((p) => Number.parseInt(p, 10))
      console.log(`[v0] RADIUS: Auto-detected NAS IP:`, detectedIP)
      return Buffer.from(ipParts)
    } catch (error) {
      console.error("[v0] RADIUS: Failed to detect NAS IP:", error)
      throw new Error(
        "Could not detect network IP address for NAS-IP-Address. " +
          "The server must have a non-loopback network interface. " +
          "Please set RADIUS_IP environment variable or configure manually in settings.",
      )
    }
  }

  /**
   * Get the NAS IP address synchronously (legacy support)
   * @deprecated Use getNasIpAddressAsync for better IP detection
   */
  private getNasIpAddress(): Buffer {
    try {
      const interfaces = os.networkInterfaces()

      // Priority order: eth0, ens, en, wlan
      const priorityOrder = ["eth0", "ens0", "ens3", "ens33", "ens160", "en0", "en1", "wlan0"]

      for (const name of priorityOrder) {
        const iface = interfaces[name]
        if (iface) {
          const ipv4 = iface.find((addr) => addr.family === "IPv4" && !addr.internal)
          if (ipv4 && ipv4.address !== "127.0.0.1" && !ipv4.address.startsWith("127.")) {
            console.log(`[v0] RADIUS: Auto-detected NAS IP from ${name}:`, ipv4.address)
            return Buffer.from(ipv4.address.split(".").map((p) => Number.parseInt(p, 10)))
          }
        }
      }

      // Fallback: find any non-internal IPv4 address (excluding loopback)
      for (const name in interfaces) {
        const iface = interfaces[name]
        if (iface) {
          const ipv4 = iface.find(
            (addr) =>
              addr.family === "IPv4" &&
              !addr.internal &&
              addr.address !== "127.0.0.1" &&
              !addr.address.startsWith("127."),
          )
          if (ipv4) {
            console.log(`[v0] RADIUS: Auto-detected NAS IP from ${name}:`, ipv4.address)
            return Buffer.from(ipv4.address.split(".").map((p) => Number.parseInt(p, 10)))
          }
        }
      }
    } catch (error) {
      console.error("[v0] RADIUS: Failed to auto-detect NAS IP:", error)
    }

    throw new Error(
      "Could not detect network IP address for NAS-IP-Address. " +
        "The server must have a non-loopback network interface (not 127.0.0.1). " +
        "Please ensure the server has a network interface with an IP address, " +
        "or set the RADIUS_IP environment variable.",
    )
  }
}

/**
 * Quick test function for RADIUS server
 */
export async function testRadiusServer(
  host: string,
  port: number,
  secret: string,
  timeout?: number,
  nasIp?: string, // Optional NAS IP to use
): Promise<RadiusTestResult> {
  const client = new RadiusClient({ host, port, secret, timeout, nasIp })
  return await client.testConnection()
}

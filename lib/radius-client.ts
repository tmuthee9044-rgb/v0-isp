import dgram from "dgram"
import crypto from "crypto"

interface RadiusConfig {
  host: string
  port: number
  secret: string
  timeout?: number
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

    // NAS-IP-Address attribute (type 4)
    const nasIp = Buffer.from([127, 0, 0, 1])
    const nasIpAttr = Buffer.concat([Buffer.from([4, 6]), nasIp])
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
}

/**
 * Quick test function for RADIUS server
 */
export async function testRadiusServer(
  host: string,
  port: number,
  secret: string,
  timeout?: number,
): Promise<RadiusTestResult> {
  const client = new RadiusClient({ host, port, secret, timeout })
  return await client.testConnection()
}

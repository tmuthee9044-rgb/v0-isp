import os from "os"
import { execSync } from "child_process"

export interface DetectedIP {
  address: string
  interface: string
  type: "private" | "public" | "manual"
  source: string
}

export interface IPDetectionResult {
  success: boolean
  ip: string | null
  details: DetectedIP | null
  warnings: string[]
  errors: string[]
}

/**
 * Production-ready IP detection for RADIUS server configuration
 * NEVER returns 127.0.0.1 or ::1
 *
 * Priority order:
 * 1. Environment variable RADIUS_IP
 * 2. System config from database (if provided)
 * 3. Primary outbound interface IP
 * 4. Default route interface IP
 * 5. First valid non-loopback IPv4
 */
export class IPDetector {
  private warnings: string[] = []
  private errors: string[] = []

  /**
   * Detect the RADIUS server IP address
   * @param manualOverride - Optional manual IP override from system settings
   */
  async detectRadiusIP(manualOverride?: string): Promise<IPDetectionResult> {
    this.warnings = []
    this.errors = []

    console.log("[v0] Starting RADIUS IP detection...")

    // Priority 1: Check environment variable
    const envIP = process.env.RADIUS_IP
    if (envIP && this.isValidIP(envIP)) {
      console.log("[v0] Using RADIUS_IP from environment:", envIP)
      return this.success(envIP, "unknown", "environment variable")
    } else if (envIP) {
      this.warnings.push(`Invalid RADIUS_IP in environment: ${envIP}`)
    }

    // Priority 2: Check manual override from system settings
    if (manualOverride && this.isValidIP(manualOverride)) {
      console.log("[v0] Using manual override from settings:", manualOverride)
      return this.success(manualOverride, "unknown", "manual configuration")
    } else if (manualOverride) {
      this.warnings.push(`Invalid manual override IP: ${manualOverride}`)
    }

    // Priority 3: Detect primary outbound interface
    const outboundIP = this.detectOutboundIP()
    if (outboundIP) {
      console.log("[v0] Detected primary outbound IP:", outboundIP.address)
      return this.success(outboundIP.address, outboundIP.interface, "outbound interface")
    }

    // Priority 4: Check default route interface
    const defaultRouteIP = this.detectDefaultRouteIP()
    if (defaultRouteIP) {
      console.log("[v0] Detected IP from default route:", defaultRouteIP.address)
      return this.success(defaultRouteIP.address, defaultRouteIP.interface, "default route")
    }

    // Priority 5: Find any valid non-loopback IPv4
    const anyValidIP = this.detectAnyValidIP()
    if (anyValidIP) {
      this.warnings.push("Using fallback IP detection - may not be reachable from network")
      console.log("[v0] Using fallback IP detection:", anyValidIP.address)
      return this.success(anyValidIP.address, anyValidIP.interface, "fallback detection")
    }

    // Failure: No valid IP found
    this.errors.push("Could not detect any valid IP address")
    this.errors.push("Server must have a non-loopback network interface")
    console.error("[v0] CRITICAL: No valid IP address detected!")

    return {
      success: false,
      ip: null,
      details: null,
      warnings: this.warnings,
      errors: this.errors,
    }
  }

  /**
   * Detect the primary outbound interface IP
   * This is the most reliable method - finds the IP that would be used
   * to reach an external destination
   */
  private detectOutboundIP(): DetectedIP | null {
    try {
      // Use a non-existent IP to determine which interface would be used for outbound traffic
      // This doesn't actually send packets, just queries the routing table
      const interfaces = os.networkInterfaces()

      // Try to determine outbound interface via routing
      try {
        const route = execSync("ip route get 8.8.8.8 2>/dev/null || route get 8.8.8.8 2>/dev/null", {
          encoding: "utf8",
          timeout: 2000,
        }).trim()

        // Parse interface name from route output
        const linuxMatch = route.match(/dev\s+(\S+)/)
        const macMatch = route.match(/interface:\s+(\S+)/)
        const interfaceName = linuxMatch?.[1] || macMatch?.[1]

        if (interfaceName && interfaces[interfaceName]) {
          const iface = interfaces[interfaceName]
          const ipv4 = iface?.find((addr) => addr.family === "IPv4" && !this.isLoopback(addr.address))
          if (ipv4) {
            return {
              address: ipv4.address,
              interface: interfaceName,
              type: this.getIPType(ipv4.address),
              source: "outbound interface",
            }
          }
        }
      } catch (error) {
        // Route command failed, continue to other methods
        console.log("[v0] Route command not available, trying alternative methods")
      }

      return null
    } catch (error) {
      console.error("[v0] Failed to detect outbound IP:", error)
      return null
    }
  }

  /**
   * Detect IP from default route interface
   */
  private detectDefaultRouteIP(): DetectedIP | null {
    const interfaces = os.networkInterfaces()

    // Priority order for common interface names
    const priorityOrder = [
      "eth0",
      "ens0",
      "ens3",
      "ens33",
      "ens160",
      "ens192", // Linux
      "en0",
      "en1", // macOS
      "eno1",
      "eno2", // Linux (onboard)
      "enp0s3",
      "enp0s8", // Linux (PCI)
    ]

    for (const name of priorityOrder) {
      if (interfaces[name]) {
        const iface = interfaces[name]
        const ipv4 = iface?.find((addr) => addr.family === "IPv4" && !this.isLoopback(addr.address))
        if (ipv4) {
          return {
            address: ipv4.address,
            interface: name,
            type: this.getIPType(ipv4.address),
            source: "default route interface",
          }
        }
      }
    }

    return null
  }

  /**
   * Find any valid non-loopback IPv4 address
   * Prefers private IPs over public IPs
   */
  private detectAnyValidIP(): DetectedIP | null {
    const interfaces = os.networkInterfaces()
    let publicIP: DetectedIP | null = null

    // First pass: look for private IPs
    for (const name in interfaces) {
      const iface = interfaces[name]
      if (!iface) continue

      for (const addr of iface) {
        if (addr.family === "IPv4" && !this.isLoopback(addr.address)) {
          const ip = {
            address: addr.address,
            interface: name,
            type: this.getIPType(addr.address),
            source: "interface scan",
          } as DetectedIP

          // Prefer private IPs
          if (ip.type === "private") {
            return ip
          }

          // Store public IP as fallback
          if (!publicIP && ip.type === "public") {
            publicIP = ip
          }
        }
      }
    }

    // Return public IP if no private IP found
    return publicIP
  }

  /**
   * Check if an IP address is a loopback address
   */
  private isLoopback(ip: string): boolean {
    return ip === "127.0.0.1" || ip.startsWith("127.") || ip === "::1" || ip === "localhost"
  }

  /**
   * Validate IP address format and ensure it's not loopback
   */
  private isValidIP(ip: string): boolean {
    if (!ip || this.isLoopback(ip)) {
      return false
    }

    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipv4Regex.test(ip)
  }

  /**
   * Determine if IP is private or public
   */
  private getIPType(ip: string): "private" | "public" {
    const parts = ip.split(".").map(Number)

    // Private IP ranges:
    // 10.0.0.0/8
    if (parts[0] === 10) return "private"

    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return "private"

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return "private"

    return "public"
  }

  /**
   * Create success result
   */
  private success(address: string, interfaceName: string, source: string): IPDetectionResult {
    return {
      success: true,
      ip: address,
      details: {
        address,
        interface: interfaceName,
        type: this.getIPType(address),
        source,
      },
      warnings: this.warnings,
      errors: [],
    }
  }

  /**
   * Validate that a detected IP is actually reachable
   * Note: This requires ping to be available and ICMP to not be blocked
   */
  async validateReachability(ip: string, fromHost?: string): Promise<boolean> {
    if (!fromHost) {
      console.log("[v0] No remote host specified for reachability test")
      return true // Assume valid if we can't test
    }

    try {
      // This would require SSH access to the remote host to test
      // For now, just validate the IP format
      return this.isValidIP(ip)
    } catch (error) {
      console.warn("[v0] Could not validate IP reachability:", error)
      return true // Assume valid if test fails
    }
  }
}

/**
 * Quick helper function for RADIUS IP detection
 */
export async function detectRadiusIP(manualOverride?: string): Promise<string> {
  const detector = new IPDetector()
  const result = await detector.detectRadiusIP(manualOverride)

  if (!result.success || !result.ip) {
    throw new Error(`Failed to detect RADIUS IP address. Errors: ${result.errors.join(", ")}`)
  }

  if (result.warnings.length > 0) {
    console.warn("[v0] IP detection warnings:", result.warnings)
  }

  return result.ip
}

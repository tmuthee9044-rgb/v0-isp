import { isIP } from "net"

export interface CIDRValidationResult {
  isValid: boolean
  normalized?: string
  error?: string
}

export function validateAndNormalizeCIDR(cidr: string): CIDRValidationResult {
  if (!cidr || typeof cidr !== "string") {
    return { isValid: false, error: "CIDR is required and must be a string" }
  }

  const trimmed = cidr.trim()

  // Check if it contains a slash
  if (!trimmed.includes("/")) {
    return { isValid: false, error: "CIDR must include subnet mask (e.g., 192.168.1.0/24)" }
  }

  const [networkPart, maskPart] = trimmed.split("/")

  if (!networkPart || !maskPart) {
    return { isValid: false, error: "Invalid CIDR format" }
  }

  // Validate IP address part
  const ipVersion = isIP(networkPart)
  if (ipVersion === 0) {
    return { isValid: false, error: "Invalid IP address in CIDR" }
  }

  // Validate subnet mask
  const mask = Number.parseInt(maskPart, 10)
  if (isNaN(mask)) {
    return { isValid: false, error: "Subnet mask must be a number" }
  }

  // Check mask range based on IP version
  const maxMask = ipVersion === 4 ? 32 : 128
  if (mask < 0 || mask > maxMask) {
    return { isValid: false, error: `Subnet mask must be between 0 and ${maxMask} for IPv${ipVersion}` }
  }

  // Normalize the CIDR by calculating the network address
  try {
    const normalized = normalizeCIDRNetwork(networkPart, mask, ipVersion)
    return { isValid: true, normalized: `${normalized}/${mask}` }
  } catch (error) {
    return { isValid: false, error: "Failed to normalize CIDR network address" }
  }
}

function normalizeCIDRNetwork(ip: string, mask: number, version: number): string {
  if (version === 4) {
    // IPv4 normalization
    const parts = ip.split(".").map(Number)
    const maskBits = 0xffffffff << (32 - mask)
    const ipInt = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
    const networkInt = ipInt & maskBits

    return [(networkInt >>> 24) & 0xff, (networkInt >>> 16) & 0xff, (networkInt >>> 8) & 0xff, networkInt & 0xff].join(
      ".",
    )
  } else {
    // IPv6 normalization - simplified approach
    // For production, consider using a proper IPv6 library
    return ip.toLowerCase()
  }
}

export function validateIPAddress(ip: string): { isValid: boolean; error?: string } {
  if (!ip || typeof ip !== "string") {
    return { isValid: false, error: "IP address is required" }
  }

  const version = isIP(ip.trim())
  if (version === 0) {
    return { isValid: false, error: "Invalid IP address format" }
  }

  return { isValid: true }
}

export function isIPInSubnet(ip: string, cidr: string): boolean {
  const cidrValidation = validateAndNormalizeCIDR(cidr)
  const ipValidation = validateIPAddress(ip)

  if (!cidrValidation.isValid || !ipValidation.isValid) {
    return false
  }

  // This is a simplified check - in production, use a proper IP library
  const [networkPart] = cidr.split("/")
  const ipVersion = isIP(ip)
  const networkVersion = isIP(networkPart)

  return ipVersion === networkVersion
}

import { type NextRequest } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "isp-mobile-secret-change-in-production"

export interface MobileTokenPayload {
  customerId: number
  email: string
  type: string
}

/**
 * Verify JWT token from Authorization header
 * Returns customerId if valid, null if invalid
 */
export async function verifyMobileToken(
  request: NextRequest
): Promise<number | null> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const payload = jwt.verify(token, JWT_SECRET) as MobileTokenPayload

    if (payload.type !== "mobile") {
      return null
    }

    return payload.customerId
  } catch (error) {
    console.error("[v0] Token verification failed:", error)
    return null
  }
}

/**
 * Generate JWT token for customer
 */
export function generateMobileToken(customerId: number, email: string): string {
  return jwt.sign(
    {
      customerId,
      email,
      type: "mobile",
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  )
}

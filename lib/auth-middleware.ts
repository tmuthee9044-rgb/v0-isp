import { type NextRequest, NextResponse } from "next/server"
import { AuthService, PERMISSIONS } from "./auth"

export function createAuthMiddleware(requiredPermissions: string[] = []) {
  return async (request: NextRequest) => {
    try {
      const user = await AuthService.getCurrentUser()

      if (!user) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Check permissions if specified
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some((permission) => AuthService.hasPermission(user, permission))

        if (!hasPermission) {
          return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
        }
      }

      // Add user to request headers for downstream use
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-user-id", user.id)
      requestHeaders.set("x-user-role", user.role)
      requestHeaders.set("x-user-permissions", user.permissions.join(","))

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      console.error("Auth middleware error:", error)
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
    }
  }
}

export const requireAuth = createAuthMiddleware()
export const requireCustomerAccess = createAuthMiddleware([PERMISSIONS.CUSTOMERS_VIEW])
export const requireBillingAccess = createAuthMiddleware([PERMISSIONS.BILLING_VIEW])
export const requireNetworkAccess = createAuthMiddleware([PERMISSIONS.NETWORK_VIEW])
export const requireSupportAccess = createAuthMiddleware([PERMISSIONS.SUPPORT_VIEW])
export const requireAdminAccess = createAuthMiddleware([PERMISSIONS.SYSTEM_CONFIG])

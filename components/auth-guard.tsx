"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthService, PERMISSIONS } from "@/lib/auth"

interface AuthGuardProps {
  children: React.ReactNode
  requiredPermissions?: string[]
  requiredRoles?: string[]
  fallback?: React.ReactNode
}

export function AuthGuard({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback = <div>Access denied</div>,
}: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser) {
          router.push("/login")
          return
        }

        setUser(currentUser)

        // Check permissions
        if (requiredPermissions.length > 0) {
          const hasPermission = requiredPermissions.some((permission) =>
            AuthService.hasPermission(currentUser, permission),
          )
          if (!hasPermission) {
            setIsAuthorized(false)
            return
          }
        }

        // Check roles
        if (requiredRoles.length > 0) {
          const hasRole = AuthService.hasAnyRole(currentUser, requiredRoles)
          if (!hasRole) {
            setIsAuthorized(false)
            return
          }
        }

        setIsAuthorized(true)
      } catch (error) {
        console.error("Auth check error:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [requiredPermissions, requiredRoles, router])

  if (isAuthorized === null) {
    return <div>Loading...</div>
  }

  if (isAuthorized === false) {
    return fallback
  }

  return <>{children}</>
}

// Convenience components for common permission checks
export const RequireCustomerAccess = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requiredPermissions={[PERMISSIONS.CUSTOMERS_VIEW]}>{children}</AuthGuard>
)

export const RequireBillingAccess = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requiredPermissions={[PERMISSIONS.BILLING_VIEW]}>{children}</AuthGuard>
)

export const RequireNetworkAccess = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requiredPermissions={[PERMISSIONS.NETWORK_VIEW]}>{children}</AuthGuard>
)

export const RequireAdminAccess = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard requiredPermissions={[PERMISSIONS.SYSTEM_CONFIG]}>{children}</AuthGuard>
)

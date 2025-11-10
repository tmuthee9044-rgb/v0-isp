import { NextResponse } from "next/server"
import type { NextRequest } from "next/request"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Portal authentication routes that should be accessible without auth
  const publicPortalRoutes = ["/portal/login", "/portal/register", "/portal/forgot-password"]

  // Check if it's a portal route that needs authentication
  if (pathname.startsWith("/portal/") && !publicPortalRoutes.includes(pathname)) {
    // Check for authentication token/session
    const authToken = request.cookies.get("portal-auth-token")

    if (!authToken) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL("/portal/login", request.url))
    }
  }

  // Admin routes authentication (existing admin system)
  if (pathname.startsWith("/admin/") && pathname !== "/admin/login") {
    const adminToken = request.cookies.get("admin-auth-token")

    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

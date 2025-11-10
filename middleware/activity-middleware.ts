import type { NextRequest, NextResponse } from "next/server"
import { ActivityLogger } from "@/lib/activity-logger"

// Middleware to automatically log API activities
export function withActivityLogging(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const startTime = Date.now()
    const method = req.method
    const url = req.url
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const userAgent = req.headers.get("user-agent") || "unknown"

    try {
      const response = await handler(req)
      const duration = Date.now() - startTime
      const status = response.status

      // Log successful API calls
      if (status < 400) {
        await ActivityLogger.log({
          level: "INFO",
          source: "API",
          category: "system",
          message: `${method} ${url} - ${status} (${duration}ms)`,
          ip_address: ip,
          user_agent: userAgent,
          details: {
            method,
            url,
            status,
            duration,
            response_size: response.headers.get("content-length"),
          },
        })
      } else {
        // Log API errors
        await ActivityLogger.log({
          level: "ERROR",
          source: "API",
          category: "system",
          message: `${method} ${url} - ${status} (${duration}ms)`,
          ip_address: ip,
          user_agent: userAgent,
          details: {
            method,
            url,
            status,
            duration,
            error: "API request failed",
          },
        })
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Log API exceptions
      await ActivityLogger.log({
        level: "ERROR",
        source: "API",
        category: "system",
        message: `${method} ${url} - Exception (${duration}ms)`,
        ip_address: ip,
        user_agent: userAgent,
        details: {
          method,
          url,
          duration,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      })

      throw error
    }
  }
}

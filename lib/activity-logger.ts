export interface ActivityLogData {
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "DEBUG"
  source: string
  category: "admin" | "user" | "system" | "mpesa" | "openvpn" | "radius" | "router"
  message: string
  ip_address?: string
  user_id?: string
  customer_id?: string
  details?: any
  session_id?: string
  user_agent?: string
}

export class ActivityLogger {
  private static getApiUrl(endpoint: string): string {
    // Check if we're running on the server
    if (typeof window === "undefined") {
      // Server-side: construct absolute URL
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL
          ? process.env.NEXT_PUBLIC_APP_URL
          : "http://localhost:3000"
      return `${baseUrl}${endpoint}`
    }
    // Client-side: use relative URL
    return endpoint
  }

  static async log(data: ActivityLogData) {
    try {
      const url = this.getApiUrl("/api/activity-logs")
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error("Failed to log activity:", error)
    }
  }

  // Customer activities
  static async logCustomerActivity(action: string, customerId: string, details?: any, request?: Request) {
    const ip = request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || null
    const userAgent = request?.headers.get("user-agent") || "unknown"

    await this.log({
      level: "INFO",
      source: "Customer Portal",
      category: "user",
      message: `Customer ${action}`,
      customer_id: customerId,
      ip_address: ip,
      user_agent: userAgent,
      details: details,
    })
  }

  // Admin activities
  static async logAdminActivity(action: string, userId: string, details?: any, request?: Request) {
    const ip = request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || null
    const userAgent = request?.headers.get("user-agent") || "unknown"

    await this.log({
      level: "INFO",
      source: "Admin Panel",
      category: "admin",
      message: `Admin ${action}`,
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      details: details,
    })
  }

  // System activities
  static async logSystemActivity(
    action: string,
    level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" = "INFO",
    details?: any,
  ) {
    await this.log({
      level,
      source: "System",
      category: "system",
      message: action,
      details: details,
    })
  }

  // MPESA activities
  static async logMpesaActivity(
    action: string,
    transactionId?: string,
    details?: any,
    level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" = "INFO",
  ) {
    await this.log({
      level,
      source: "M-Pesa API",
      category: "mpesa",
      message: action,
      details: {
        transaction_id: transactionId,
        ...details,
      },
    })
  }

  // Network activities
  static async logNetworkActivity(
    action: string,
    source: string,
    details?: any,
    level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" = "INFO",
  ) {
    await this.log({
      level,
      source,
      category: source.toLowerCase().includes("openvpn")
        ? "openvpn"
        : source.toLowerCase().includes("radius")
          ? "radius"
          : "router",
      message: action,
      details: details,
    })
  }
}

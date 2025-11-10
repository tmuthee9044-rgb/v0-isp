// Utility functions for logging throughout the system
interface LogEntry {
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "DEBUG"
  source: string
  category: string
  message: string
  ip_address?: string
  user_id?: number
  customer_id?: number
  details?: any
  session_id?: string
  user_agent?: string
}

export class SystemLogger {
  static async log(entry: LogEntry) {
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        console.error("Failed to log entry:", await response.text())
      }
    } catch (error) {
      console.error("Error logging entry:", error)
    }
  }

  // Convenience methods for different log levels
  static info(source: string, category: string, message: string, details?: any) {
    return this.log({ level: "INFO", source, category, message, details })
  }

  static warning(source: string, category: string, message: string, details?: any) {
    return this.log({ level: "WARNING", source, category, message, details })
  }

  static error(source: string, category: string, message: string, details?: any) {
    return this.log({ level: "ERROR", source, category, message, details })
  }

  static success(source: string, category: string, message: string, details?: any) {
    return this.log({ level: "SUCCESS", source, category, message, details })
  }

  static debug(source: string, category: string, message: string, details?: any) {
    return this.log({ level: "DEBUG", source, category, message, details })
  }
}

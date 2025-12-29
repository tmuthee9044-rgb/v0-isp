import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    // Get recent capacity alerts and system alerts
    const recentAlerts = await sql`
      SELECT 
        'capacity' as type,
        CASE 
          WHEN severity = 'critical' THEN 'error'
          WHEN severity = 'high' THEN 'warning'
          ELSE 'info'
        END as alert_type,
        alert_type || ': ' || COALESCE(current_value::text, 'N/A') || ' exceeds threshold ' || COALESCE(threshold_value::text, 'N/A') as message,
        created_at as time,
        severity
      FROM capacity_alerts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND status != 'resolved'
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Get router offline alerts from network_devices
    const offlineRouters = await sql`
      SELECT 
        'error' as alert_type,
        'Router ' || name || ' offline' as message,
        updated_at as time,
        'high' as severity
      FROM network_devices
      WHERE status = 'offline' 
      AND type IN ('router', 'mikrotik', 'ubiquiti')
      ORDER BY updated_at DESC
      LIMIT 5
    `

    // Get server resource alerts
    let resourceAlerts = []
    try {
      resourceAlerts = await sql`
        SELECT 
          'warning' as alert_type,
          'Server ' || name || ' high resource usage' as message,
          updated_at as time,
          'medium' as severity
        FROM servers
        WHERE (cpu_usage > 80 OR memory_usage > 80 OR disk_usage > 80)
        AND status = 'online'
        ORDER BY updated_at DESC
        LIMIT 5
      `
    } catch (error: any) {
      // If servers table doesn't exist or columns missing, skip silently
      if (error?.code !== "42P01" && error?.code !== "42703") {
        throw error
      }
    }

    // Combine and format all alerts
    const allAlerts = [...recentAlerts, ...offlineRouters, ...resourceAlerts]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10)
      .map((alert, index) => ({
        id: index + 1,
        type: alert.alert_type,
        message: alert.message,
        time: formatTimeAgo(new Date(alert.time)),
        severity: alert.severity,
      }))

    return NextResponse.json({ alerts: allAlerts })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

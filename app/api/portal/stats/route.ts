import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    console.log("[v0] Fetching portal statistics from database")

    // Fetch portal users count
    const portalUsersResult = await sql`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE portal_access = true
    `
    const portalUsers = portalUsersResult[0]?.count || 0

    // Fetch active sessions count
    const activeSessionsResult = await sql`
      SELECT COUNT(DISTINCT username) as count 
      FROM radius_sessions_active
    `
    const activeSessions = activeSessionsResult[0]?.count || 0

    // Fetch daily logins (from today)
    const dailyLoginsResult = await sql`
      SELECT COUNT(*) as count 
      FROM admin_logs 
      WHERE action = 'customer_login' 
      AND timestamp >= CURRENT_DATE
    `
    const dailyLogins = dailyLoginsResult[0]?.count || 0

    // Calculate growth percentage
    const yesterdayLoginsResult = await sql`
      SELECT COUNT(*) as count 
      FROM admin_logs 
      WHERE action = 'customer_login' 
      AND timestamp >= CURRENT_DATE - INTERVAL '1 day'
      AND timestamp < CURRENT_DATE
    `
    const yesterdayLogins = yesterdayLoginsResult[0]?.count || 1
    const growthPercentage = Math.round(((dailyLogins - yesterdayLogins) / yesterdayLogins) * 100)

    // Fetch portal status (check if portal is enabled)
    const portalStatusResult = await sql`
      SELECT value 
      FROM system_config 
      WHERE key = 'portal_customer_enabled'
    `
    const portalEnabled = portalStatusResult[0]?.value === "true" || portalStatusResult[0]?.value === true

    // Fetch recent activities
    const recentActivitiesResult = await sql`
      SELECT 
        action,
        details,
        timestamp,
        CASE 
          WHEN action LIKE '%payment%' THEN 'payment'
          WHEN action LIKE '%registration%' OR action LIKE '%register%' THEN 'registration'
          WHEN action LIKE '%ticket%' OR action LIKE '%support%' THEN 'support'
          ELSE 'other'
        END as activity_type
      FROM admin_logs 
      WHERE action LIKE '%customer%' OR action LIKE '%portal%'
      ORDER BY timestamp DESC 
      LIMIT 10
    `

    const stats = {
      portalUsers,
      activeSessions,
      dailyLogins,
      growthPercentage,
      portalStatus: portalEnabled ? "online" : "offline",
      uptime: "99.9",
      recentActivities: recentActivitiesResult.map((activity) => ({
        type: activity.activity_type,
        action: activity.action,
        details: activity.details || "",
        timestamp: activity.timestamp,
        timeAgo: getTimeAgo(new Date(activity.timestamp)),
      })),
    }

    console.log("[v0] Portal statistics fetched successfully")
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Error fetching portal statistics:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch portal statistics",
        portalUsers: 0,
        activeSessions: 0,
        dailyLogins: 0,
        growthPercentage: 0,
        portalStatus: "unknown",
        uptime: "0",
        recentActivities: [],
      },
      { status: 500 },
    )
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

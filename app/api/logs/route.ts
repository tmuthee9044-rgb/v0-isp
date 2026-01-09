import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const level = searchParams.get("level")
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    if (category === "router") {
      // Fetch logs from router_logs table
      const routerLogsQuery = `
        SELECT 
          id::text,
          timestamp,
          level,
          device_name as source,
          'router' as category,
          message,
          device_ip as ip_address,
          device_id as user_id,
          NULL::text as customer_id,
          jsonb_build_object(
            'device_id', device_id,
            'device_name', device_name,
            'device_ip', device_ip,
            'event_type', event_type,
            'cpu_usage', cpu_usage,
            'memory_usage', memory_usage,
            'bandwidth_usage', bandwidth_usage,
            'uptime', uptime,
            'interface_status', interface_status,
            'alert_threshold_exceeded', alert_threshold_exceeded
          ) as details,
          NULL::text as session_id,
          NULL::text as user_agent
        FROM router_logs
        ${level && level !== "all" ? `WHERE level = '${level}'` : ""}
        ${search ? `${level && level !== "all" ? "AND" : "WHERE"} (device_name ILIKE '%${search.replace(/'/g, "''")}%' OR message ILIKE '%${search.replace(/'/g, "''")}%' OR device_id ILIKE '%${search.replace(/'/g, "''")}%')` : ""}
        ORDER BY timestamp DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `

      const routerLogs = await sql.unsafe(routerLogsQuery)

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count FROM router_logs
        ${level && level !== "all" ? `WHERE level = '${level}'` : ""}
        ${search ? `${level && level !== "all" ? "AND" : "WHERE"} (device_name ILIKE '%${search.replace(/'/g, "''")}%' OR message ILIKE '%${search.replace(/'/g, "''")}%' OR device_id ILIKE '%${search.replace(/'/g, "''")}%')` : ""}
      `
      const countResult = await sql.unsafe(countQuery)
      const routerTotal = Number(countResult[0].count)

      // Get level statistics
      const levelStats: Record<string, number> = {}
      routerLogs.forEach((log) => {
        levelStats[log.level] = (levelStats[log.level] || 0) + 1
      })

      return NextResponse.json({
        logs: routerLogs.map((log) => ({
          ...log,
          timestamp: log.timestamp ? new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19) : null,
        })),
        total: routerTotal,
        categoryStats: {
          router: routerTotal,
        },
        levelStats: levelStats,
      })
    }

    if (category === "radius") {
      // Fetch authentication logs from radpostauth
      const authLogsQuery = `
        SELECT 
          id::text,
          authdate as timestamp,
          CASE 
            WHEN reply = 'Access-Accept' THEN 'SUCCESS'
            WHEN reply = 'Access-Reject' THEN 'ERROR'
            ELSE 'WARNING'
          END as level,
          'FreeRADIUS' as source,
          'radius' as category,
          CONCAT('Authentication ', reply, ' for user ', username) as message,
          NULL::inet as ip_address,
          username as user_id,
          NULL::text as customer_id,
          jsonb_build_object(
            'username', username,
            'reply', reply,
            'called_station_id', calledstationid,
            'calling_station_id', callingstationid
          ) as details,
          NULL::text as session_id,
          NULL::text as user_agent
        FROM radpostauth
        ${search ? `WHERE username ILIKE '%${search.replace(/'/g, "''")}%' OR reply ILIKE '%${search.replace(/'/g, "''")}%'` : ""}
        ORDER BY authdate DESC
        LIMIT ${Math.floor(limit / 2)}
      `

      // Fetch accounting logs from radacct (recent sessions)
      const acctLogsQuery = `
        SELECT 
          "RadAcctId"::text as id,
          COALESCE("AcctStopTime", "AcctUpdateTime", "AcctStartTime") as timestamp,
          CASE 
            WHEN "AcctStopTime" IS NOT NULL THEN 'INFO'
            WHEN "AcctStartTime" IS NOT NULL THEN 'SUCCESS'
            ELSE 'DEBUG'
          END as level,
          'FreeRADIUS Accounting' as source,
          'radius' as category,
          CASE 
            WHEN "AcctStopTime" IS NOT NULL THEN 
              CONCAT('Session ended for ', "UserName", ' - ', 
                     ROUND(("AcctOutputOctets" + "AcctInputOctets") / 1048576.0, 2)::text, ' MB transferred')
            WHEN "AcctStartTime" IS NOT NULL THEN 
              CONCAT('Session started for ', "UserName", ' from ', "NASIPAddress"::text)
            ELSE 
              CONCAT('Session update for ', "UserName")
          END as message,
          "NASIPAddress" as ip_address,
          "UserName" as user_id,
          NULL::text as customer_id,
          jsonb_build_object(
            'username', "UserName",
            'session_id', "AcctSessionId",
            'nas_ip', "NASIPAddress",
            'session_time', "AcctSessionTime",
            'input_octets', "AcctInputOctets",
            'output_octets', "AcctOutputOctets",
            'terminate_cause', "AcctTerminateCause",
            'framed_ip', "FramedIPAddress"
          ) as details,
          "AcctSessionId" as session_id,
          NULL::text as user_agent
        FROM radacct
        ${search ? `WHERE "UserName" ILIKE '%${search.replace(/'/g, "''")}%' OR "AcctSessionId" ILIKE '%${search.replace(/'/g, "''")}%'` : ""}
        ORDER BY COALESCE("AcctStopTime", "AcctUpdateTime", "AcctStartTime") DESC
        LIMIT ${Math.floor(limit / 2)}
      `

      const authLogs = await sql.unsafe(authLogsQuery)
      const acctLogs = await sql.unsafe(acctLogsQuery)

      // Combine and sort logs
      const combinedLogs = [...authLogs, ...acctLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

      // Get counts for statistics
      const authCount = await sql`SELECT COUNT(*) as count FROM radpostauth`
      const acctCount = await sql`SELECT COUNT(*) as count FROM radacct`
      const radiusTotal = Number(authCount[0].count) + Number(acctCount[0].count)

      // Get level statistics from combined logs
      const levelStats: Record<string, number> = {}
      combinedLogs.forEach((log) => {
        levelStats[log.level] = (levelStats[log.level] || 0) + 1
      })

      return NextResponse.json({
        logs: combinedLogs.map((log) => ({
          ...log,
          timestamp: log.timestamp ? new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19) : null,
        })),
        total: radiusTotal,
        categoryStats: {
          radius: radiusTotal,
        },
        levelStats: levelStats,
      })
    }

    const conditions = []

    if (category && category !== "all") {
      conditions.push(`category = '${category}'`)
    }

    if (level && level !== "all") {
      conditions.push(`level = '${level}'`)
    }

    if (search) {
      const searchTerm = search.replace(/'/g, "''") // Escape single quotes
      conditions.push(`(
        message ILIKE '%${searchTerm}%' OR 
        source ILIKE '%${searchTerm}%' OR 
        CAST(ip_address AS TEXT) ILIKE '%${searchTerm}%'
      )`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const logsQuery = `
      SELECT 
        id,
        timestamp,
        level,
        source,
        category,
        message,
        ip_address,
        user_id,
        customer_id,
        details,
        session_id,
        user_agent
      FROM system_logs
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ${limit} 
      OFFSET ${offset}
    `

    const logs = await sql.unsafe(logsQuery)

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM system_logs
      ${whereClause}
    `
    const countResult = await sql.unsafe(countQuery)
    const total = countResult[0].total

    // Get category statistics
    const categoryStats = await sql`
      SELECT 
        category,
        COUNT(*) as count
      FROM system_logs 
      GROUP BY category
    `

    // Get level statistics
    const levelStats = await sql`
      SELECT 
        level,
        COUNT(*) as count
      FROM system_logs 
      GROUP BY level
    `

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        timestamp: log.timestamp ? log.timestamp.toISOString().replace("T", " ").substring(0, 19) : null,
      })),
      total: Number.parseInt(total),
      categoryStats: categoryStats.reduce((acc: any, stat: any) => {
        acc[stat.category] = Number.parseInt(stat.count)
        return acc
      }, {}),
      levelStats: levelStats.reduce((acc: any, stat: any) => {
        acc[stat.level] = Number.parseInt(stat.count)
        return acc
      }, {}),
    })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()

    const body = await request.json()
    const { level, source, category, message, ip_address, user_id, customer_id, details, session_id, user_agent } = body

    // Validate required fields
    if (!level || !source || !category || !message) {
      return NextResponse.json({ error: "Missing required fields: level, source, category, message" }, { status: 400 })
    }

    // Validate level
    const validLevels = ["INFO", "WARNING", "ERROR", "SUCCESS", "DEBUG"]
    if (!validLevels.includes(level)) {
      return NextResponse.json({ error: "Invalid level. Must be one of: " + validLevels.join(", ") }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO system_logs (
        level, source, category, message, ip_address, 
        user_id, customer_id, details, session_id, user_agent
      ) VALUES (
        ${level}, ${source}, ${category}, ${message}, ${ip_address},
        ${user_id}, ${customer_id}, ${details ? JSON.stringify(details) : null}, 
        ${session_id}, ${user_agent}
      ) RETURNING id, timestamp
    `

    return NextResponse.json({
      success: true,
      log: result[0],
    })
  } catch (error) {
    console.error("Error creating log entry:", error)
    return NextResponse.json({ error: "Failed to create log entry" }, { status: 500 })
  }
}

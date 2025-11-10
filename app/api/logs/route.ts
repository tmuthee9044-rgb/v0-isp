import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const level = searchParams.get("level")
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const whereConditions = []
    const queryParams: any[] = []

    if (category && category !== "all") {
      whereConditions.push(`category = '${category}'`)
    }

    if (level && level !== "all") {
      whereConditions.push(`level = '${level}'`)
    }

    if (search) {
      const searchTerm = search.replace(/'/g, "''") // Escape single quotes
      whereConditions.push(`(
        message ILIKE '%${searchTerm}%' OR 
        source ILIKE '%${searchTerm}%' OR 
        CAST(ip_address AS TEXT) ILIKE '%${searchTerm}%'
      )`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const logs = await sql`
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
      ${sql.unsafe(whereClause)}
      ORDER BY timestamp DESC 
      LIMIT ${limit} 
      OFFSET ${offset}
    `

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total 
      FROM system_logs
      ${sql.unsafe(whereClause)}
    `
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
        timestamp: log.timestamp.toISOString().replace("T", " ").substring(0, 19),
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

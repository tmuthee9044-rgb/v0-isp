import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, olderThan, level } = body

    let result

    if (ids && Array.isArray(ids)) {
      // Delete specific log entries by IDs
      result = await sql`
        DELETE FROM system_logs 
        WHERE id = ANY(${ids})
      `
    } else if (olderThan) {
      // Delete logs older than specified date
      const deleteQuery = level
        ? sql`DELETE FROM system_logs WHERE created_at < ${olderThan} AND level = ${level}`
        : sql`DELETE FROM system_logs WHERE created_at < ${olderThan}`

      result = await deleteQuery
    } else {
      return NextResponse.json({ error: "Invalid delete criteria" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.length} log entries`,
      deletedCount: result.length,
    })
  } catch (error) {
    console.error("Error bulk deleting logs:", error)
    return NextResponse.json({ error: "Failed to delete log entries" }, { status: 500 })
  }
}

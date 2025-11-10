import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_jobs,
        COUNT(CASE WHEN sync_status = 'in_sync' THEN 1 END) as running_jobs,
        COUNT(CASE WHEN sync_status = 'in_sync' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN sync_status = 'out_of_sync' THEN 1 END) as failed_jobs,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN sync_status = 'in_sync' THEN 1 END)::float / COUNT(*)::float) * 100, 1)
          ELSE 100
        END as success_rate
      FROM router_sync_status
      WHERE last_checked >= NOW() - INTERVAL '24 hours'
    `

    return NextResponse.json(stats[0])
  } catch (error) {
    console.error("Error fetching sync stats:", error)
    return NextResponse.json({ message: "Failed to fetch sync stats" }, { status: 500 })
  }
}

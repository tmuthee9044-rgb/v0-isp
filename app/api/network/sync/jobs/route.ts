import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const jobs = await sql`
      SELECT 
        sj.*,
        r.name as router_name
      FROM router_sync_status sj
      LEFT JOIN routers r ON sj.router_id = r.id
      ORDER BY sj.last_checked DESC
      LIMIT 50
    `

    return NextResponse.json(jobs)
  } catch (error) {
    console.error("Error fetching sync jobs:", error)
    return NextResponse.json({ message: "Failed to fetch sync jobs" }, { status: 500 })
  }
}

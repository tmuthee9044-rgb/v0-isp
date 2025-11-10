import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"

    let bandwidthData

    switch (period) {
      case "today":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('hour', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND DATE(rl.log_timestamp) = CURRENT_DATE
          GROUP BY DATE_TRUNC('hour', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 24
        `
        break
      case "week":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('hour', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('hour', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 168
        `
        break
      case "month":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('day', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 30
        `
        break
      case "quarter":
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('day', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND rl.log_timestamp >= NOW() - INTERVAL '90 days'
          GROUP BY DATE_TRUNC('day', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 90
        `
        break
      default:
        bandwidthData = await sql`
          SELECT 
            DATE_TRUNC('hour', rl.log_timestamp) as timestamp,
            SUM(rl.acct_input_octets) as total_download,
            SUM(rl.acct_output_octets) as total_upload
          FROM radius_logs rl
          JOIN customers c ON c.portal_username = rl.username
          WHERE c.id = ${customerId}
            AND DATE(rl.log_timestamp) = CURRENT_DATE
          GROUP BY DATE_TRUNC('hour', rl.log_timestamp)
          ORDER BY timestamp DESC
          LIMIT 24
        `
    }

    // Format the data for the chart
    const formattedData = bandwidthData
      .map((record) => ({
        timestamp: new Date(record.timestamp).toLocaleTimeString(),
        download: Math.round((record.total_download || 0) / 1024 / 1024), // Convert to MB
        upload: Math.round((record.total_upload || 0) / 1024 / 1024), // Convert to MB
      }))
      .reverse()

    return NextResponse.json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error fetching bandwidth data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch bandwidth data" }, { status: 500 })
  }
}

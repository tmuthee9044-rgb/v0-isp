import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"

    // Get date range based on period
    let dateFilter = ""

    switch (period) {
      case "today":
        dateFilter = `AND DATE(sl.timestamp) = CURRENT_DATE`
        break
      case "week":
        dateFilter = `AND sl.timestamp >= NOW() - INTERVAL '7 days'`
        break
      case "month":
        dateFilter = `AND sl.timestamp >= NOW() - INTERVAL '30 days'`
        break
      case "quarter":
        dateFilter = `AND sl.timestamp >= NOW() - INTERVAL '90 days'`
        break
    }

    // Since we don't have a browsing history table, we'll simulate some data
    // In a real implementation, this would come from a web filtering/monitoring system
    const mockBrowsingHistory = [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        domain: "google.com",
        category: "search",
        data_volume: 1024 * 1024 * 2.5, // 2.5 MB
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        domain: "youtube.com",
        category: "streaming",
        data_volume: 1024 * 1024 * 150, // 150 MB
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        domain: "facebook.com",
        category: "social",
        data_volume: 1024 * 1024 * 25, // 25 MB
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        domain: "netflix.com",
        category: "streaming",
        data_volume: 1024 * 1024 * 500, // 500 MB
      },
      {
        id: "5",
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        domain: "github.com",
        category: "work",
        data_volume: 1024 * 1024 * 15, // 15 MB
      },
    ]

    return NextResponse.json({
      success: true,
      history: mockBrowsingHistory,
    })
  } catch (error) {
    console.error("Error fetching browsing history:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch browsing history" }, { status: 500 })
  }
}

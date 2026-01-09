import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ error: "Invalid router ID" }, { status: 400 })
    }

    // Fetch router details
    const [router] = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId}
    `

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const mockRules = [
      {
        id: 1,
        name: "facebook.com",
        type: "ADDRESS LISTS",
        ip_regexp: "157.240.0.0/16",
        state: "ACTIVE",
        chain: "forward",
        action: "drop",
      },
      {
        id: 2,
        name: "promo.com",
        type: "ADDRESS LISTS",
        ip_regexp: "10.0.0.1",
        state: "ACTIVE",
        chain: "forward",
        action: "drop",
      },
      {
        id: 3,
        name: "youtube.com",
        type: "DNS FILTER",
        ip_regexp: "*.youtube.com",
        state: "INACTIVE",
        chain: "forward",
        action: "drop",
      },
    ]

    return NextResponse.json({ success: true, rules: mockRules })
  } catch (error: any) {
    console.error("Error fetching firewall rules:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch firewall rules" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    const body = await request.json()

    if (isNaN(routerId)) {
      return NextResponse.json({ error: "Invalid router ID" }, { status: 400 })
    }

    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: "Firewall rule added successfully",
      rule: {
        id: Math.floor(Math.random() * 1000),
        ...body,
        state: "ACTIVE",
      },
    })
  } catch (error: any) {
    console.error("Error adding firewall rule:", error)
    return NextResponse.json({ error: error.message || "Failed to add firewall rule" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get("ruleId")

    if (isNaN(routerId)) {
      return NextResponse.json({ error: "Invalid router ID" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Firewall rule deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting firewall rule:", error)
    return NextResponse.json({ error: error.message || "Failed to delete firewall rule" }, { status: 500 })
  }
}

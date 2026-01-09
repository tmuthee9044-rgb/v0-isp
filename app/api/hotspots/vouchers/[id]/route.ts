import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const voucher = await sql`
      SELECT 
        hv.*,
        h.name as hotspot_name,
        h.location as hotspot_location
      FROM hotspot_vouchers hv
      JOIN hotspots h ON hv.hotspot_id = h.id
      WHERE hv.id = ${id}
    `

    if (voucher.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
    }

    return NextResponse.json(voucher[0])
  } catch (error) {
    console.error("Error fetching voucher:", error)
    return NextResponse.json({ error: "Failed to fetch voucher" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const body = await request.json()

    const { time_limit, data_limit, max_users, expiry_date, status } = body

    const result = await sql`
      UPDATE hotspot_vouchers 
      SET 
        time_limit = ${time_limit},
        data_limit = ${data_limit},
        max_users = ${max_users},
        expiry_date = ${expiry_date},
        status = ${status},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: result[0].id })
  } catch (error) {
    console.error("Error updating voucher:", error)
    return NextResponse.json({ error: "Failed to update voucher" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const result = await sql`
      DELETE FROM hotspot_vouchers 
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Voucher deleted successfully" })
  } catch (error) {
    console.error("Error deleting voucher:", error)
    return NextResponse.json({ error: "Failed to delete voucher" }, { status: 500 })
  }
}

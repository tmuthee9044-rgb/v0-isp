import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { verifyMobileToken } from "@/lib/mobile-auth"

export const dynamic = "force-dynamic"

/**
 * Get Parental Control Profiles
 * GET /api/mobile/parental-controls?serviceId=123
 */
export async function GET(request: NextRequest) {
  try {
    const customerId = await verifyMobileToken(request)
    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get("serviceId")

    const profiles = await sql`
      SELECT *
      FROM parental_control_profiles
      WHERE customer_id = ${customerId}
        ${serviceId ? sql`AND service_id = ${serviceId}` : sql``}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, profiles })
  } catch (error) {
    console.error("[v0] Error fetching parental controls:", error)
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
  }
}

/**
 * Create or Update Parental Control Profile
 * POST /api/mobile/parental-controls
 */
export async function POST(request: NextRequest) {
  try {
    const customerId = await verifyMobileToken(request)
    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = await getSql()
    const body = await request.json()
    const {
      id,
      serviceId,
      profileName,
      enabled,
      allowedHours,
      allowedDays,
      blockAdult,
      blockSocial,
      blockGaming,
      blockStreaming,
      customBlockedDomains,
      customAllowedDomains,
      maxDownloadMbps,
      maxUploadMbps,
    } = body

    if (id) {
      // Update existing profile
      const result = await sql`
        UPDATE parental_control_profiles
        SET 
          profile_name = ${profileName},
          enabled = ${enabled},
          allowed_hours = ${allowedHours || null},
          allowed_days = ${allowedDays || null},
          block_adult = ${blockAdult || false},
          block_social = ${blockSocial || false},
          block_gaming = ${blockGaming || false},
          block_streaming = ${blockStreaming || false},
          custom_blocked_domains = ${customBlockedDomains || null},
          custom_allowed_domains = ${customAllowedDomains || null},
          max_download_mbps = ${maxDownloadMbps || null},
          max_upload_mbps = ${maxUploadMbps || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND customer_id = ${customerId}
        RETURNING *
      `

      return NextResponse.json({ success: true, profile: result[0] })
    }

    // Create new profile
    const result = await sql`
      INSERT INTO parental_control_profiles (
        customer_id, service_id, profile_name, enabled,
        allowed_hours, allowed_days,
        block_adult, block_social, block_gaming, block_streaming,
        custom_blocked_domains, custom_allowed_domains,
        max_download_mbps, max_upload_mbps
      ) VALUES (
        ${customerId}, ${serviceId || null}, ${profileName}, ${enabled || true},
        ${allowedHours || null}, ${allowedDays || null},
        ${blockAdult || false}, ${blockSocial || false}, ${blockGaming || false}, ${blockStreaming || false},
        ${customBlockedDomains || null}, ${customAllowedDomains || null},
        ${maxDownloadMbps || null}, ${maxUploadMbps || null}
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, profile: result[0] })
  } catch (error) {
    console.error("[v0] Error saving parental control:", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}

/**
 * Delete Parental Control Profile
 * DELETE /api/mobile/parental-controls?id=123
 */
export async function DELETE(request: NextRequest) {
  try {
    const customerId = await verifyMobileToken(request)
    if (!customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 400 })
    }

    await sql`
      DELETE FROM parental_control_profiles
      WHERE id = ${id} AND customer_id = ${customerId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting parental control:", error)
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 })
  }
}

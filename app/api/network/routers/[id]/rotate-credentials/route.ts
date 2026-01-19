import { type NextRequest, NextResponse } from "next/server"
import { rotateRouterCredentials, getRouterCredentials } from "@/lib/router-secret-manager"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * POST /api/network/routers/[id]/rotate-credentials
 * Rotate router admin credentials
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const routerId = Number.parseInt(params.id)
    
    if (Number.isNaN(routerId)) {
      return NextResponse.json(
        { error: "Invalid router ID" },
        { status: 400 }
      )
    }
    
    // Rotate credentials
    const result = await rotateRouterCredentials(routerId)
    
    return NextResponse.json({
      success: true,
      message: "Router credentials rotated successfully",
      newPassword: result.newPassword,
      warning: "Apply this password to the router immediately via terminal or API"
    })
  } catch (error) {
    console.error("[v0] Error rotating credentials:", error)
    return NextResponse.json(
      { error: "Failed to rotate credentials" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/network/routers/[id]/rotate-credentials
 * Check if rotation is needed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const routerId = Number.parseInt(params.id)
    const sql = await getSql()
    
    const router = await sql`
      SELECT id, name, password_last_rotated
      FROM routers
      WHERE id = ${routerId}
    `
    
    if (!router[0]) {
      return NextResponse.json(
        { error: "Router not found" },
        { status: 404 }
      )
    }
    
    const lastRotated = router[0].password_last_rotated
    const daysSince = lastRotated 
      ? (Date.now() - new Date(lastRotated).getTime()) / (1000 * 60 * 60 * 24)
      : null
    
    return NextResponse.json({
      routerId,
      routerName: router[0].name,
      lastRotated,
      daysSinceRotation: daysSince ? Math.floor(daysSince) : null,
      rotationNeeded: !daysSince || daysSince > 90,
      nextRotationDue: lastRotated 
        ? new Date(new Date(lastRotated).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : null
    })
  } catch (error) {
    console.error("[v0] Error checking rotation status:", error)
    return NextResponse.json(
      { error: "Failed to check rotation status" },
      { status: 500 }
    )
  }
}

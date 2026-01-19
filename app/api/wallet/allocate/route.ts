import { type NextRequest, NextResponse } from "next/server"
import { WalletManager } from "@/lib/wallet-manager"

export const dynamic = "force-dynamic"

/**
 * Manual wallet allocation API
 */
export async function POST(request: NextRequest) {
  try {
    const { customerId, serviceId, amount, allocatedBy } = await request.json()

    if (!customerId || !serviceId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await WalletManager.allocateToService(customerId, serviceId, amount, allocatedBy || "admin")

    return NextResponse.json({
      success: true,
      daysAdded: result.daysAdded,
      message: `Successfully added ${result.daysAdded} days to service`,
    })
  } catch (error) {
    console.error("[v0] Allocation error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Allocation failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get("customerId")

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 })
    }

    const balance = await WalletManager.getBalance(customerId)

    return NextResponse.json(balance)
  } catch (error) {
    return NextResponse.json({ error: "Failed to get balance" }, { status: 500 })
  }
}

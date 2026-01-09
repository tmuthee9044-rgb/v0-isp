import { type NextRequest, NextResponse } from "next/server"
import { activateService } from "@/lib/billing-engine"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceId, paymentId } = body

    if (!serviceId || !paymentId) {
      return NextResponse.json({ error: "Missing serviceId or paymentId" }, { status: 400 })
    }

    await activateService(serviceId, paymentId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error activating service:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

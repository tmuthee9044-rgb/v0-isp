import { type NextRequest, NextResponse } from "next/server"
import { serviceActivationEngine } from "@/lib/service-activation-engine"

export async function POST(request: NextRequest) {
  try {
    const activationRequest = await request.json()

    if (
      !activationRequest.customer_service_id ||
      !activationRequest.customer_id ||
      !activationRequest.service_plan_id
    ) {
      return NextResponse.json({ success: false, error: "Missing required activation parameters" }, { status: 400 })
    }

    const result = await serviceActivationEngine.processActivation(activationRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Service activation error:", error)
    return NextResponse.json({ success: false, error: "Service activation failed" }, { status: 500 })
  }
}

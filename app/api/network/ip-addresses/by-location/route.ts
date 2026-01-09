import { type NextRequest, NextResponse } from "next/server"
import { getAvailableIPsByLocation } from "@/lib/location-ip-allocation"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location")

    if (!location) {
      return NextResponse.json({ success: false, error: "Location parameter is required" }, { status: 400 })
    }

    const availableIPs = await getAvailableIPsByLocation(location)

    return NextResponse.json({
      success: true,
      location,
      count: availableIPs.length,
      addresses: availableIPs,
    })
  } catch (error) {
    console.error("Error fetching IPs by location:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch IP addresses" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getRoutersByLocation, getRouterCapabilities, calculateRouterLoad } from "@/lib/router-selection"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const locationId = searchParams.get("location_id")

    if (!locationId) {
      return NextResponse.json({ error: "location_id is required" }, { status: 400 })
    }

    const routers = await getRoutersByLocation(Number.parseInt(locationId))

    // Enrich with capabilities and load percentage
    const enrichedRouters = routers.map((router) => ({
      ...router,
      capabilities: getRouterCapabilities(router.vendor),
      load_percentage: calculateRouterLoad(router),
      load_status: calculateRouterLoad(router) > 80 ? "high" : calculateRouterLoad(router) > 50 ? "medium" : "low",
    }))

    return NextResponse.json({ routers: enrichedRouters })
  } catch (error) {
    console.error("[v0] Error fetching routers:", error)
    return NextResponse.json({ error: "Failed to fetch routers" }, { status: 500 })
  }
}

import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Wifi, Users, Activity, MapPin } from "lucide-react"
import Link from "next/link"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

async function getHotspots() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const hotspots = await sql`
      SELECT 
        h.*,
        COUNT(DISTINCT hu.id) as total_users,
        COUNT(DISTINCT CASE WHEN hs.status = 'active' THEN hs.id END) as active_sessions
      FROM hotspots h
      LEFT JOIN hotspot_users hu ON h.id = hu.hotspot_id AND hu.status = 'active'
      LEFT JOIN hotspot_sessions hs ON h.id = hs.hotspot_id AND hs.status = 'active'
      GROUP BY h.id
      ORDER BY h.created_at DESC
    `
    return hotspots
  } catch (error) {
    console.error("Error fetching hotspots:", error)
    return []
  }
}

function HotspotCard({ hotspot }: { hotspot: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "inactive":
        return "bg-red-500"
      case "maintenance":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{hotspot.name}</CardTitle>
          </div>
          <Badge className={getStatusColor(hotspot.status)}>{hotspot.status}</Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {hotspot.location}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{hotspot.total_users} Users</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{hotspot.active_sessions} Active</span>
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div>
            SSID: <span className="font-mono">{hotspot.ssid}</span>
          </div>
          <div>Bandwidth: {hotspot.bandwidth_limit || "Unlimited"} Mbps</div>
          <div>User Limit: {hotspot.user_limit}</div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button asChild size="sm" variant="outline">
            <Link href={`/hotspots/${hotspot.id}`}>Manage</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/hotspots/${hotspot.id}/users`}>Users</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function HotspotsPage() {
  const hotspots = await getHotspots()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotspot Management</h1>
          <p className="text-gray-600">Manage WiFi hotspots and user access</p>
        </div>
        <Button asChild>
          <Link href="/hotspots/add">
            <Plus className="h-4 w-4 mr-2" />
            Add Hotspot
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Suspense fallback={<div>Loading hotspots...</div>}>
          {hotspots.map((hotspot) => (
            <HotspotCard key={hotspot.id} hotspot={hotspot} />
          ))}
        </Suspense>
      </div>

      {hotspots.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Hotspots Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first WiFi hotspot</p>
            <Button asChild>
              <Link href="/hotspots/add">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Hotspot
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Router, Wifi, Activity, AlertTriangle } from "lucide-react"

interface NetworkStats {
  totalRouters: number
  activeRouters: number
  totalSubnets: number
  assignedIPs: number
  availableIPs: number
  syncHealth: number
  failedSyncs: number
}

export function NetworkOverview() {
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNetworkStats()
  }, [])

  const fetchNetworkStats = async () => {
    try {
      const response = await fetch("/api/network/overview")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch network stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return <div>Loading network overview...</div>
  }

  const routerHealthPercentage =
    stats.totalRouters > 0 ? Math.round((stats.activeRouters / stats.totalRouters) * 100) : 0

  const ipUtilizationPercentage =
    stats.assignedIPs + stats.availableIPs > 0
      ? Math.round((stats.assignedIPs / (stats.assignedIPs + stats.availableIPs)) * 100)
      : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Router Health</CardTitle>
          <Router className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{routerHealthPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeRouters} of {stats.totalRouters} routers online
          </p>
          <div className="mt-2">
            <Badge
              variant={
                routerHealthPercentage >= 90 ? "default" : routerHealthPercentage >= 70 ? "secondary" : "destructive"
              }
            >
              {routerHealthPercentage >= 90 ? "Excellent" : routerHealthPercentage >= 70 ? "Good" : "Poor"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">IP Utilization</CardTitle>
          <Wifi className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ipUtilizationPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.assignedIPs} assigned, {stats.availableIPs} available
          </p>
          <div className="mt-2">
            <Badge
              variant={
                ipUtilizationPercentage < 80 ? "default" : ipUtilizationPercentage < 95 ? "secondary" : "destructive"
              }
            >
              {ipUtilizationPercentage < 80 ? "Healthy" : ipUtilizationPercentage < 95 ? "High" : "Critical"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sync Health</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.syncHealth}%</div>
          <p className="text-xs text-muted-foreground">Last 24 hours success rate</p>
          <div className="mt-2">
            <Badge variant={stats.syncHealth >= 95 ? "default" : stats.syncHealth >= 85 ? "secondary" : "destructive"}>
              {stats.syncHealth >= 95 ? "Excellent" : stats.syncHealth >= 85 ? "Good" : "Poor"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed Syncs</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.failedSyncs}</div>
          <p className="text-xs text-muted-foreground">Requiring attention</p>
          <div className="mt-2">
            <Badge variant={stats.failedSyncs === 0 ? "default" : stats.failedSyncs < 5 ? "secondary" : "destructive"}>
              {stats.failedSyncs === 0 ? "All Clear" : stats.failedSyncs < 5 ? "Minor Issues" : "Attention Needed"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

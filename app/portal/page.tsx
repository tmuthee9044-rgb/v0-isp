"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Globe, Settings, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface PortalStats {
  portalUsers: number
  activeSessions: number
  dailyLogins: number
  growthPercentage: number
  portalStatus: string
  uptime: string
  recentActivities: Array<{
    type: string
    action: string
    details: string
    timestamp: string
    timeAgo: string
  }>
}

export default function PortalPage() {
  const router = useRouter()
  const [stats, setStats] = useState<PortalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log("[v0] Fetching portal stats from database")
        const response = await fetch("/api/portal/stats")
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Portal stats loaded:", data)
          setStats(data)
        } else {
          console.error("[v0] Failed to fetch portal stats")
        }
      } catch (error) {
        console.error("[v0] Error fetching portal stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customer Portal</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push("/settings/portal")}>
            <Settings className="mr-2 h-4 w-4" />
            Portal Settings
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portal Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.portalUsers.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Globe className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Logins</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.dailyLogins || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.growthPercentage
                ? `${stats.growthPercentage > 0 ? "+" : ""}${stats.growthPercentage}% from yesterday`
                : "No change"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portal Status</CardTitle>
            <Globe className={`h-4 w-4 ${stats?.portalStatus === "online" ? "text-green-600" : "text-red-600"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={stats?.portalStatus === "online" ? "default" : "destructive"}>
                {stats?.portalStatus || "Unknown"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{stats?.uptime || "0"}% uptime</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portal Features</CardTitle>
            <CardDescription>Available customer portal features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Account Management</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Bill Payment</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Usage Monitoring</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Support Tickets</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Service Upgrades</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest customer portal activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.type === "payment"
                          ? "bg-green-500"
                          : activity.type === "registration"
                            ? "bg-blue-500"
                            : activity.type === "support"
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                      }`}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{activity.details || "Customer activity"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.timeAgo}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal Management</CardTitle>
          <CardDescription>Manage customer portal settings and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-20 flex-col" onClick={() => router.push("/customers")}>
              <Users className="h-6 w-6 mb-2" />
              User Management
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col bg-transparent"
              onClick={() => router.push("/settings/portal")}
            >
              <Settings className="h-6 w-6 mb-2" />
              Portal Settings
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col bg-transparent"
              onClick={() => router.push("/settings/company")}
            >
              <Globe className="h-6 w-6 mb-2" />
              Customization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

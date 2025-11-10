"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle, Clock, RefreshCw, Router, Wifi, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SyncStatus {
  id: number
  router_name: string
  router_type: string
  ip_address: string
  customer_name: string
  sync_status: "in_sync" | "out_of_sync" | "pending"
  retry_count: number
  last_checked: string
  last_synced: string | null
  sync_message: string | null
}

interface RouterHealth {
  id: number
  name: string
  type: string
  status: "connected" | "disconnected"
  location: string
  last_ping: string | null
  response_time: number | null
  assigned_customers: number
  sync_health: number
}

export default function SyncDashboard() {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([])
  const [routerHealth, setRouterHealth] = useState<RouterHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchSyncData()
    const interval = setInterval(fetchSyncData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSyncData = async () => {
    try {
      const [syncResponse, healthResponse] = await Promise.all([
        fetch("/api/network/sync/status"),
        fetch("/api/network/sync/health"),
      ])

      if (syncResponse.ok && healthResponse.ok) {
        const syncData = await syncResponse.json()
        const healthData = await healthResponse.json()
        setSyncStatuses(syncData)
        setRouterHealth(healthData)
      }
    } catch (error) {
      console.error("Failed to fetch sync data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch sync data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForceSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch("/api/network/sync/force", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Force sync initiated",
        })
        setTimeout(fetchSyncData, 2000) // Refresh after 2 seconds
      } else {
        throw new Error("Force sync failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate force sync",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleRetrySync = async (id: number) => {
    try {
      const response = await fetch(`/api/network/sync/${id}/retry`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Retry sync initiated",
        })
        fetchSyncData()
      } else {
        throw new Error("Retry sync failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry sync",
        variant: "destructive",
      })
    }
  }

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "in_sync":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            In Sync
          </Badge>
        )
      case "out_of_sync":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Out of Sync
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getRouterStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Wifi className="w-3 h-3 mr-1" />
            Online
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const syncHealthPercentage =
    syncStatuses.length > 0
      ? Math.round((syncStatuses.filter((s) => s.sync_status === "in_sync").length / syncStatuses.length) * 100)
      : 0

  const routerHealthPercentage =
    routerHealth.length > 0
      ? Math.round((routerHealth.filter((r) => r.status === "connected").length / routerHealth.length) * 100)
      : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Network Sync Dashboard</h1>
          <p className="text-muted-foreground">Monitor router synchronization and health status</p>
        </div>
        <Button onClick={handleForceSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Force Sync All
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncHealthPercentage}%</div>
            <Progress value={syncHealthPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {syncStatuses.filter((s) => s.sync_status === "in_sync").length} of {syncStatuses.length} in sync
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Router Health</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routerHealthPercentage}%</div>
            <Progress value={routerHealthPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {routerHealth.filter((r) => r.status === "connected").length} of {routerHealth.length} online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Sync</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {syncStatuses.filter((s) => s.sync_status === "out_of_sync").length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Services requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {syncStatuses.filter((s) => s.sync_status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Services being processed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sync-status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sync-status">Sync Status</TabsTrigger>
          <TabsTrigger value="router-health">Router Health</TabsTrigger>
        </TabsList>

        <TabsContent value="sync-status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Synchronization Status</CardTitle>
              <CardDescription>Real-time sync status between system and routers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Router</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retry Count</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="font-medium">{status.customer_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Router className="w-4 h-4" />
                          <span>{status.router_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {status.router_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{status.ip_address}</TableCell>
                      <TableCell>{getSyncStatusBadge(status.sync_status)}</TableCell>
                      <TableCell>
                        {status.retry_count > 0 && (
                          <Badge variant="outline" className="text-red-600">
                            {status.retry_count}/3
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(status.last_checked).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {status.sync_status === "out_of_sync" && (
                          <Button size="sm" variant="outline" onClick={() => handleRetrySync(status.id)}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="router-health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Router Health Status</CardTitle>
              <CardDescription>Connection status and performance metrics for all routers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Router</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Sync Health</TableHead>
                    <TableHead>Last Ping</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routerHealth.map((router) => (
                    <TableRow key={router.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Router className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{router.name}</div>
                            <div className="text-sm text-muted-foreground">{router.type}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{router.location}</TableCell>
                      <TableCell>{getRouterStatusBadge(router.status)}</TableCell>
                      <TableCell>
                        {router.response_time ? (
                          <span
                            className={`font-mono text-sm ${
                              router.response_time < 100
                                ? "text-green-600"
                                : router.response_time < 500
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {router.response_time}ms
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{router.assigned_customers}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={router.sync_health} className="w-16" />
                          <span className="text-sm">{router.sync_health}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {router.last_ping ? new Date(router.last_ping).toLocaleString() : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  AlertTriangle,
  Download,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react"

export default function OverviewPage() {
  const [selectedTab, setSelectedTab] = useState("network")
  const [networkData, setNetworkData] = useState({
    bandwidth: { used: 78, total: 100, unit: "Gbps" },
    latency: 12,
    packetLoss: 0.02,
    uptime: 99.8,
    serviceAreas: [
      { name: "Downtown", customers: 1247, uptime: 99.9 },
      { name: "Suburbs", customers: 892, uptime: 99.7 },
      { name: "Industrial", customers: 456, uptime: 99.8 },
      { name: "Residential", customers: 252, uptime: 99.6 },
    ],
  })
  const [customerData, setCustomerData] = useState({
    total: 2847,
    new: 156,
    churn: 23,
    satisfaction: 4.6,
    support: {
      open: 12,
      resolved: 89,
      avgTime: "2.4 hours",
    },
    distribution: [
      { area: "Downtown", count: 1247, percentage: 44 },
      { area: "Suburbs", count: 892, percentage: 31 },
      { area: "Industrial", count: 456, percentage: 16 },
      { area: "Residential", count: 252, percentage: 9 },
    ],
  })
  const [financialData, setFinancialData] = useState({
    monthlyRevenue: 45231,
    yearlyProjection: 542772,
    arpu: 89.5,
    margin: 68,
    collections: 94.2,
    outstanding: 12847,
    areaRevenue: [
      { area: "Downtown", revenue: 19847, percentage: 44 },
      { area: "Suburbs", revenue: 15623, percentage: 35 },
      { area: "Industrial", revenue: 6234, percentage: 14 },
      { area: "Residential", revenue: 3527, percentage: 7 },
    ],
  })
  const [infrastructureData, setInfrastructureData] = useState({
    routers: { total: 24, online: 23, offline: 1 },
    servers: { total: 8, online: 8, offline: 0 },
    resources: {
      cpu: 45,
      memory: 67,
      storage: 78,
      network: 82,
    },
  })

  const alerts = [
    {
      id: 1,
      type: "error",
      message: "Router R-001 offline",
      time: "5 minutes ago",
      severity: "high",
    },
    {
      id: 2,
      type: "warning",
      message: "High bandwidth usage in Downtown area",
      time: "15 minutes ago",
      severity: "medium",
    },
    {
      id: 3,
      type: "info",
      message: "Scheduled maintenance completed",
      time: "1 hour ago",
      severity: "low",
    },
    {
      id: 4,
      type: "success",
      message: "New customer onboarded successfully",
      time: "2 hours ago",
      severity: "low",
    },
  ]

  const systemHealth = [
    { name: "Overall System", status: 98, color: "bg-green-500" },
    { name: "Network", status: 99, color: "bg-green-500" },
    { name: "Servers", status: 97, color: "bg-green-500" },
    { name: "Database", status: 95, color: "bg-yellow-500" },
    { name: "Services", status: 96, color: "bg-green-500" },
  ]

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getHealthColor = (status: number) => {
    if (status >= 98) return "bg-green-500"
    if (status >= 95) return "bg-yellow-500"
    return "bg-red-500"
  }

  useEffect(() => {
    fetchRealData()
  }, [])

  const fetchRealData = async () => {
    try {
      const [networkRes, customerRes, financialRes, infrastructureRes] = await Promise.all([
        fetch("/api/overview/network"),
        fetch("/api/overview/customers"),
        fetch("/api/overview/financial"),
        fetch("/api/overview/infrastructure"),
      ])

      if (networkRes.ok) {
        const data = await networkRes.json()
        setNetworkData(data)
      }

      if (customerRes.ok) {
        const data = await customerRes.json()
        setCustomerData(data)
      }

      if (financialRes.ok) {
        const data = await financialRes.json()
        setFinancialData(data)
      }

      if (infrastructureRes.ok) {
        const data = await infrastructureRes.json()
        setInfrastructureData(data)
      }
    } catch (error) {
      console.error("Failed to fetch overview data:", error)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            System Overview
          </h2>
          <p className="text-muted-foreground">Comprehensive view of your ISP operations and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Report
          </Button>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* System Health */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            System Health Dashboard
          </CardTitle>
          <CardDescription>Real-time monitoring of all system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {systemHealth.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.status}%</span>
                </div>
                <Progress value={item.status} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Bandwidth Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{networkData.bandwidth.used}%</div>
                <Progress value={networkData.bandwidth.used} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {networkData.bandwidth.used} / {networkData.bandwidth.total} {networkData.bandwidth.unit}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Network Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{networkData.latency}ms</div>
                <p className="text-xs text-muted-foreground mt-1">Average response time</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Packet Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{networkData.packetLoss}%</div>
                <p className="text-xs text-muted-foreground mt-1">Network reliability</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Network Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{networkData.uptime}%</div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Service Areas Performance</CardTitle>
              <CardDescription>Network performance by geographic area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {networkData.serviceAreas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{area.name}</p>
                        <p className="text-sm text-muted-foreground">{area.customers} customers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{area.uptime}%</p>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerData.total.toLocaleString()}</div>
                <p className="text-xs text-green-600 mt-1">+{customerData.new} this month</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((customerData.churn / customerData.total) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">{customerData.churn} customers left</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{customerData.satisfaction}/5.0</div>
                <p className="text-xs text-muted-foreground mt-1">Customer rating</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerData.support.open}</div>
                <p className="text-xs text-muted-foreground mt-1">Open tickets</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Support Overview</CardTitle>
                <CardDescription>Customer support metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Open Tickets</span>
                  <Badge variant="destructive">{customerData.support.open}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Resolved This Week</span>
                  <Badge variant="secondary">{customerData.support.resolved}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg Resolution Time</span>
                  <Badge variant="outline">{customerData.support.avgTime}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Customer Distribution</CardTitle>
                <CardDescription>Customers by service area</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerData.distribution.map((area, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{area.area}</span>
                      <span className="text-sm text-muted-foreground">
                        {area.count} ({area.percentage}%)
                      </span>
                    </div>
                    <Progress value={area.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${financialData.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-green-600 mt-1">+8% from last month</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Yearly Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${financialData.yearlyProjection.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Based on current trends</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ARPU</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${financialData.arpu}</div>
                <p className="text-xs text-muted-foreground mt-1">Average revenue per user</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{financialData.margin}%</div>
                <p className="text-xs text-muted-foreground mt-1">Net profit margin</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Collections & Outstanding</CardTitle>
                <CardDescription>Payment collection metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Collection Rate</span>
                    <span className="font-medium text-green-600">{financialData.collections}%</span>
                  </div>
                  <Progress value={financialData.collections} className="h-2" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span>Outstanding Amount</span>
                  <span className="font-medium text-orange-600">${financialData.outstanding.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Revenue by Area</CardTitle>
                <CardDescription>Revenue distribution across service areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {financialData.areaRevenue.map((area, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{area.area}</span>
                      <span className="text-sm text-muted-foreground">
                        ${area.revenue.toLocaleString()} ({area.percentage}%)
                      </span>
                    </div>
                    <Progress value={area.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Network Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {infrastructureData.routers.online}/{infrastructureData.routers.total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Routers online</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Server Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {infrastructureData.servers.online}/{infrastructureData.servers.total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Servers online</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{infrastructureData.resources.cpu}%</div>
                <Progress value={infrastructureData.resources.cpu} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{infrastructureData.resources.memory}%</div>
                <Progress value={infrastructureData.resources.memory} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>System Resources</CardTitle>
              <CardDescription>Real-time system resource utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Storage</span>
                      <span className="text-sm text-muted-foreground">{infrastructureData.resources.storage}%</span>
                    </div>
                    <Progress value={infrastructureData.resources.storage} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Network I/O</span>
                      <span className="text-sm text-muted-foreground">{infrastructureData.resources.network}%</span>
                    </div>
                    <Progress value={infrastructureData.resources.network} className="h-2" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Disk Space</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>Used: 1.2 TB / 2.0 TB</p>
                      <p>Available: 800 GB</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                System Alerts
              </CardTitle>
              <CardDescription>Real-time system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{alert.message}</p>
                        <Badge
                          variant={
                            alert.severity === "high"
                              ? "destructive"
                              : alert.severity === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{alert.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

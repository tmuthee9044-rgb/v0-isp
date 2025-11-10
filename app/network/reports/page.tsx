"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { Router, Users, Activity, TrendingUp, Download } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"

interface RouterUtilization {
  router_name: string
  location: string
  total_ips: number
  assigned_ips: number
  utilization_percentage: number
  active_customers: number
}

interface LocationStats {
  location: string
  router_count: number
  customer_count: number
  total_bandwidth: number
  avg_utilization: number
}

interface SyncHealthTrend {
  date: string
  in_sync: number
  out_of_sync: number
  pending: number
  total: number
  health_percentage: number
}

interface BandwidthUsage {
  router_name: string
  location: string
  upload_mbps: number
  download_mbps: number
  peak_usage: number
  avg_usage: number
}

export default function NetworkReports() {
  const [routerUtilization, setRouterUtilization] = useState<RouterUtilization[]>([])
  const [locationStats, setLocationStats] = useState<LocationStats[]>([])
  const [syncHealthTrend, setSyncHealthTrend] = useState<SyncHealthTrend[]>([])
  const [bandwidthUsage, setBandwidthUsage] = useState<BandwidthUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  useEffect(() => {
    fetchReportData()
  }, [selectedLocation, dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        location: selectedLocation,
        from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
        to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
      })

      const [utilizationRes, locationRes, syncRes, bandwidthRes] = await Promise.all([
        fetch(`/api/network/reports/utilization?${params}`),
        fetch(`/api/network/reports/locations?${params}`),
        fetch(`/api/network/reports/sync-trend?${params}`),
        fetch(`/api/network/reports/bandwidth?${params}`),
      ])

      if (utilizationRes.ok && locationRes.ok && syncRes.ok && bandwidthRes.ok) {
        const [utilization, locations, sync, bandwidth] = await Promise.all([
          utilizationRes.json(),
          locationRes.json(),
          syncRes.json(),
          bandwidthRes.json(),
        ])

        setRouterUtilization(utilization)
        setLocationStats(locations)
        setSyncHealthTrend(sync)
        setBandwidthUsage(bandwidth)
      }
    } catch (error) {
      console.error("Failed to fetch report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (reportType: string) => {
    try {
      const params = new URLSearchParams({
        type: reportType,
        location: selectedLocation,
        from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
        to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
      })

      const response = await fetch(`/api/network/reports/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Failed to export report:", error)
    }
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  const utilizationChartData = routerUtilization.map((router) => ({
    name: router.router_name,
    utilization: router.utilization_percentage,
    customers: router.active_customers,
  }))

  const locationPieData = locationStats.map((location) => ({
    name: location.location,
    value: location.customer_count,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Network Reports</h1>
          <p className="text-muted-foreground">Comprehensive network monitoring and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locationStats.map((location) => (
                <SelectItem key={location.location} value={location.location}>
                  {location.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Routers</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routerUtilization.length}</div>
            <p className="text-xs text-muted-foreground">Across {locationStats.length} locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {routerUtilization.reduce((sum, router) => sum + router.active_customers, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total provisioned services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {routerUtilization.length > 0
                ? Math.round(
                    routerUtilization.reduce((sum, router) => sum + router.utilization_percentage, 0) /
                      routerUtilization.length,
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">IP address utilization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncHealthTrend.length > 0
                ? Math.round(syncHealthTrend[syncHealthTrend.length - 1]?.health_percentage || 0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Current sync status</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilization">Router Utilization</TabsTrigger>
          <TabsTrigger value="locations">Location Analytics</TabsTrigger>
          <TabsTrigger value="sync-health">Sync Health Trends</TabsTrigger>
          <TabsTrigger value="bandwidth">Bandwidth Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Router Utilization Chart</CardTitle>
                <CardDescription>IP address utilization by router</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={utilizationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="utilization" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Router Details</CardTitle>
                    <CardDescription>Detailed utilization metrics</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => exportReport("utilization")}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Router</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Customers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routerUtilization.map((router, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{router.router_name}</TableCell>
                        <TableCell>{router.location}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${router.utilization_percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{router.utilization_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{router.active_customers}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Distribution</CardTitle>
                <CardDescription>Customers by location</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={locationPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {locationPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Location Statistics</CardTitle>
                    <CardDescription>Performance by location</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => exportReport("locations")}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Routers</TableHead>
                      <TableHead>Customers</TableHead>
                      <TableHead>Avg Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationStats.map((location, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{location.location}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{location.router_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{location.customer_count}</Badge>
                        </TableCell>
                        <TableCell>{location.avg_utilization}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync-health" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sync Health Trend</CardTitle>
                  <CardDescription>Network synchronization health over time</CardDescription>
                </div>
                <Button size="sm" onClick={() => exportReport("sync-health")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={syncHealthTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="health_percentage" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="in_sync" stroke="#82ca9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="out_of_sync" stroke="#ff7c7c" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bandwidth" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bandwidth Usage</CardTitle>
                  <CardDescription>Network traffic by router</CardDescription>
                </div>
                <Button size="sm" onClick={() => exportReport("bandwidth")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Router</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Upload (Mbps)</TableHead>
                    <TableHead>Download (Mbps)</TableHead>
                    <TableHead>Peak Usage</TableHead>
                    <TableHead>Avg Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bandwidthUsage.map((usage, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{usage.router_name}</TableCell>
                      <TableCell>{usage.location}</TableCell>
                      <TableCell className="font-mono">{usage.upload_mbps}</TableCell>
                      <TableCell className="font-mono">{usage.download_mbps}</TableCell>
                      <TableCell className="font-mono">{usage.peak_usage}%</TableCell>
                      <TableCell className="font-mono">{usage.avg_usage}%</TableCell>
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

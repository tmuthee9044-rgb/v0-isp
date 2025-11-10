"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { RefreshCw, Download, Search, Eye, Power, Globe, Clock, Activity } from "lucide-react"

interface OnlineSession {
  id: string
  login_id: string
  data_in: number
  data_out: number
  start_time: string
  duration: string
  ip_address: string
  mac_address: string
  nas: string
  status: "active" | "expired" | "suspended"
}

interface BandwidthData {
  timestamp: string
  upload: number
  download: number
}

interface BrowsingRecord {
  id: string
  timestamp: string
  domain: string
  category: string
  data_volume: number
}

interface CustomerStatisticsTabProps {
  customerId: string
}

export function CustomerStatisticsTab({ customerId }: CustomerStatisticsTabProps) {
  const [sessions, setSessions] = useState<OnlineSession[]>([])
  const [bandwidthData, setBandwidthData] = useState<BandwidthData[]>([])
  const [browsingHistory, setBrowsingHistory] = useState<BrowsingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState("all")
  const [dateRange, setDateRange] = useState("today")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => {
    loadStatistics()
  }, [customerId, selectedService, dateRange])

  const loadStatistics = async () => {
    try {
      setLoading(true)

      // Load bandwidth data - this API endpoint exists
      const bandwidthResponse = await fetch(`/api/customers/${customerId}/bandwidth?period=${dateRange}`)
      if (bandwidthResponse.ok) {
        const contentType = bandwidthResponse.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const bandwidthData = await bandwidthResponse.json()
          setBandwidthData(bandwidthData.data || [])
        } else {
          // API returned non-JSON response, set empty array
          setBandwidthData([])
        }
      } else {
        setBandwidthData([])
      }

      const sessionsResponse = await fetch(`/api/customers/${customerId}/sessions?period=${dateRange}`)
      if (sessionsResponse.ok) {
        const contentType = sessionsResponse.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const sessionsData = await sessionsResponse.json()
          setSessions(sessionsData.sessions || [])
        } else {
          setSessions([])
        }
      } else {
        // If API doesn't exist yet, set empty array instead of mock data
        setSessions([])
      }

      const browsingResponse = await fetch(`/api/customers/${customerId}/browsing-history?period=${dateRange}`)
      if (browsingResponse.ok) {
        const contentType = browsingResponse.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const browsingData = await browsingResponse.json()
          setBrowsingHistory(browsingData.history || [])
        } else {
          setBrowsingHistory([])
        }
      } else {
        // If API doesn't exist yet, set empty array instead of mock data
        setBrowsingHistory([])
      }
    } catch (error) {
      console.error("Error loading statistics:", error)
      // Set empty arrays on error instead of mock data
      setSessions([])
      setBandwidthData([])
      setBrowsingHistory([])
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/sessions/${sessionId}/disconnect`, {
        method: "POST",
      })
      if (response.ok) {
        loadStatistics()
      }
    } catch (error) {
      console.error("Error disconnecting session:", error)
    }
  }

  const exportData = async (type: "csv" | "pdf") => {
    try {
      const response = await fetch(`/api/customers/${customerId}/export?type=${type}&period=${dateRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `customer-${customerId}-statistics.${type}`
        a.click()
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "expired":
        return "bg-gray-500"
      case "suspended":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const filteredBrowsingHistory = browsingHistory.filter((record) => {
    const matchesSearch = record.domain.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || record.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const topSites = browsingHistory
    .reduce(
      (acc, record) => {
        const existing = acc.find((item) => item.domain === record.domain)
        if (existing) {
          existing.data_volume += record.data_volume
        } else {
          acc.push({ domain: record.domain, data_volume: record.data_volume })
        }
        return acc
      },
      [] as { domain: string; data_volume: number }[],
    )
    .sort((a, b) => b.data_volume - a.data_volume)
    .slice(0, 5)

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Customer Statistics & Live Usage
              </CardTitle>
              <CardDescription>Real-time and historical view of customer internet usage</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                  <SelectItem value="fiber">Fiber</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>

              <Button variant="outline" size="sm" onClick={() => exportData("pdf")}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>

              <Button variant="outline" size="sm" onClick={loadStatistics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Bandwidth Usage Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Bandwidth Usage
            </CardTitle>
            <CardDescription>Real-time upload and download activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bandwidthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`${value} MB`, name === "download" ? "Download" : "Upload"]} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="download"
                    stackId="1"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="upload"
                    stackId="1"
                    stroke="#dc2626"
                    fill="#dc2626"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Usage Summary Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Summary</CardTitle>
            <CardDescription>Current period statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Download</span>
              <span className="text-lg font-bold text-blue-600">
                {formatBytes(bandwidthData.reduce((sum, item) => sum + item.download * 1024 * 1024, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Upload</span>
              <span className="text-lg font-bold text-red-600">
                {formatBytes(bandwidthData.reduce((sum, item) => sum + item.upload * 1024 * 1024, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Peak Usage</span>
              <span className="text-lg font-bold text-green-600">
                {Math.max(...bandwidthData.map((item) => item.download + item.upload))} MB/h
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Usage</span>
              <span className="text-lg font-bold text-orange-600">
                {Math.round(
                  bandwidthData.reduce((sum, item) => sum + item.download + item.upload, 0) / bandwidthData.length || 0,
                )}{" "}
                MB/h
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Sites Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sites</CardTitle>
            <CardDescription>Most visited domains by data usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topSites}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ domain, percent }) => `${domain} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="data_volume"
                  >
                    {topSites.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatBytes(value as number), "Data Usage"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Sessions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Online Sessions
          </CardTitle>
          <CardDescription>Active and recent customer sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Login ID</TableHead>
                  <TableHead>Data In/Out</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>NAS</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`} />
                        <Badge variant={session.status === "active" ? "default" : "secondary"}>{session.status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{session.login_id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">↓ {formatBytes(session.data_in)}</div>
                        <div className="text-sm">↑ {formatBytes(session.data_out)}</div>
                        <Progress value={((session.data_in + session.data_out) / 1000000) * 100} className="h-1" />
                      </div>
                    </TableCell>
                    <TableCell>{new Date(session.start_time).toLocaleString()}</TableCell>
                    <TableCell>{session.duration}</TableCell>
                    <TableCell className="font-mono text-sm">{session.ip_address}</TableCell>
                    <TableCell className="font-mono text-sm">{session.mac_address}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        {session.nas}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        {session.status === "active" && (
                          <Button variant="outline" size="sm" onClick={() => handleDisconnectSession(session.id)}>
                            <Power className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Browsing History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Browsing History
          </CardTitle>
          <CardDescription>Recent domains visited by the customer</CardDescription>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="streaming">Streaming</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="news">News</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Domain/URL</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Data Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrowsingHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{record.domain}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.category}</Badge>
                    </TableCell>
                    <TableCell>{formatBytes(record.data_volume)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <Button variant="outline">View Full Browsing Log</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Activity,
  Download,
  RefreshCw,
  Search,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle,
  Shield,
  Lock,
  Router,
  Users,
  Settings,
  Eye,
  Server,
  Smartphone,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface LogEntry {
  id: string
  timestamp: string
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "DEBUG"
  source: string
  category: string
  message: string
  ip_address?: string
  user_id?: string
  customer_id?: string
  details?: any
  session_id?: string
  user_agent?: string
}

interface LogsResponse {
  logs: LogEntry[]
  total: number
  categoryStats: Record<string, number>
  levelStats: Record<string, number>
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({})
  const [levelStats, setLevelStats] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        category: activeTab,
        level: levelFilter,
        search: searchTerm,
        limit: "100",
        offset: "0",
      })

      const response = await fetch(`/api/logs?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch logs")
      }

      const data: LogsResponse = await response.json()

      // Ensure we're using real database data
      setLogs(data.logs || [])
      setFilteredLogs(data.logs || [])
      setCategoryStats(data.categoryStats || {})
      setLevelStats(data.levelStats || {})
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Error fetching logs:", error)
      // Set empty arrays instead of mock data on error
      setLogs([])
      setFilteredLogs([])
      setCategoryStats({})
      setLevelStats({})
      setTotal(0)

      toast({
        title: "Error",
        description: "Failed to fetch logs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [activeTab, levelFilter, searchTerm])

  const stats = {
    total: total,
    errors: levelStats.ERROR || 0,
    warnings: levelStats.WARNING || 0,
    info: (levelStats.INFO || 0) + (levelStats.SUCCESS || 0),
  }

  const handleRefresh = async () => {
    await fetchLogs()
    toast({
      title: "Logs refreshed",
      description: "Latest log entries have been loaded.",
    })
  }

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "Level", "Source", "Category", "Message", "IP Address", "User ID"],
      ...filteredLogs.map((log) => [
        log.timestamp,
        log.level,
        log.source,
        log.category,
        log.message,
        log.ip_address || "",
        log.user_id || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `system-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export completed",
      description: "Logs have been exported to CSV file.",
    })
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
          <p className="text-muted-foreground">Monitor OpenVPN, RADIUS, M-Pesa, and system activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
            <p className="text-xs text-muted-foreground">Normal operations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
          <CardDescription>Search and filter system logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="level-filter">Level</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="DEBUG">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="all">All Logs</TabsTrigger>
          <TabsTrigger value="openvpn">
            <Lock className="mr-1 h-3 w-3" />
            OpenVPN ({categoryStats.openvpn || 0})
          </TabsTrigger>
          <TabsTrigger value="radius">
            <Shield className="mr-1 h-3 w-3" />
            RADIUS ({categoryStats.radius || 0})
          </TabsTrigger>
          <TabsTrigger value="mpesa">
            <Smartphone className="mr-1 h-3 w-3" />
            M-Pesa ({categoryStats.mpesa || 0})
          </TabsTrigger>
          <TabsTrigger value="router">
            <Router className="mr-1 h-3 w-3" />
            Router ({categoryStats.router || 0})
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server className="mr-1 h-3 w-3" />
            System ({categoryStats.system || 0})
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Settings className="mr-1 h-3 w-3" />
            Admin ({categoryStats.admin || 0})
          </TabsTrigger>
          <TabsTrigger value="user">
            <Users className="mr-1 h-3 w-3" />
            User ({categoryStats.user || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {activeTab === "all" ? (
                  <Activity className="h-4 w-4" />
                ) : activeTab === "openvpn" ? (
                  <Lock className="h-4 w-4" />
                ) : activeTab === "radius" ? (
                  <Shield className="h-4 w-4" />
                ) : activeTab === "mpesa" ? (
                  <Smartphone className="h-4 w-4" />
                ) : activeTab === "router" ? (
                  <Router className="h-4 w-4" />
                ) : activeTab === "system" ? (
                  <Server className="h-4 w-4" />
                ) : activeTab === "admin" ? (
                  <Settings className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                <span>
                  {activeTab === "all"
                    ? "All System Logs"
                    : activeTab === "openvpn"
                      ? "OpenVPN Logs"
                      : activeTab === "radius"
                        ? "RADIUS Logs"
                        : activeTab === "mpesa"
                          ? "M-Pesa Transaction Logs"
                          : activeTab === "router"
                            ? "Router Logs"
                            : activeTab === "system"
                              ? "System Logs"
                              : activeTab === "admin"
                                ? "Admin Activity Logs"
                                : "User Activity Logs"}
                </span>
              </CardTitle>
              <CardDescription>
                {activeTab === "all"
                  ? "Real-time system activity and events"
                  : activeTab === "openvpn"
                    ? "VPN connection events and authentication logs"
                    : activeTab === "radius"
                      ? "RADIUS authentication and accounting logs"
                      : activeTab === "mpesa"
                        ? "M-Pesa payment transactions and callbacks"
                        : activeTab === "router"
                          ? "Network device status and performance logs"
                          : activeTab === "system"
                            ? "System health, backups, and maintenance logs"
                            : activeTab === "admin"
                              ? "Administrator actions and configuration changes"
                              : "Customer portal activities and interactions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[100px]">Level</TableHead>
                      <TableHead className="w-[120px]">Source</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[140px]">IP Address</TableHead>
                      <TableHead className="w-[50px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading logs...
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No logs found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {log.level === "ERROR" ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : log.level === "WARNING" ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              ) : log.level === "SUCCESS" ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Info className="h-4 w-4 text-blue-500" />
                              )}
                              <Badge
                                variant={
                                  log.level === "ERROR"
                                    ? "destructive"
                                    : log.level === "WARNING"
                                      ? "secondary"
                                      : log.level === "SUCCESS"
                                        ? "default"
                                        : "outline"
                                }
                                className="text-xs"
                              >
                                {log.level}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {log.category === "openvpn" ? (
                                <Lock className="h-4 w-4" />
                              ) : log.category === "radius" ? (
                                <Shield className="h-4 w-4" />
                              ) : log.category === "mpesa" ? (
                                <Smartphone className="h-4 w-4" />
                              ) : log.category === "router" ? (
                                <Router className="h-4 w-4" />
                              ) : log.category === "system" ? (
                                <Server className="h-4 w-4" />
                              ) : log.category === "admin" ? (
                                <Settings className="h-4 w-4" />
                              ) : log.category === "user" ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                <Activity className="h-4 w-4" />
                              )}
                              <span className="text-sm">{log.source}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={log.message}>
                              {log.message}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.ip_address || "-"}</TableCell>
                          <TableCell>
                            {log.details && (
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

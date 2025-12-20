"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Info,
  Loader2,
  Network,
  RouterIcon,
  Save,
  Signal,
  Shield,
  Terminal,
  RefreshCw,
  BarChart3,
  Database,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { MapPicker } from "@/components/ui/map-picker"

interface Router {
  id: number
  name: string
  type: "mikrotik" | "ubiquiti" | "juniper" | "other"
  location_id: number
  location_name?: string
  connection_type: "public_ip" | "private_ip" | "vpn"
  hostname: string
  api_port: number
  ssh_port: number
  username: string
  status: "connected" | "disconnected"
  created_at: string
  updated_at: string
  gps_latitude?: number
  gps_longitude?: number
  mikrotik_user?: string
  trafficking_record?: string
  speed_control?: string
  save_visited_ips?: boolean
  radius_secret?: string
  radius_nas_ip?: string
}

interface Location {
  id: number
  name: string
  city: string
  region: string
}

interface TrafficData {
  time: string
  tx: number
  rx: number
}

interface BlockingRule {
  id: number
  name: string
  type: string
  ip_regexp: string
  state: string
}

interface RouterInterface {
  name: string
  type: string
  running: boolean
  disabled: boolean
  rxBytes: number
  txBytes: number
  rxPackets: number
  txPackets: number
  rxErrors: number
  txErrors: number // Added txErrors based on usage in formattedBytes
  txDrops: number
}

interface InterfaceTraffic {
  interface: string
  history: Array<{
    time: string
    rxMbps: number
    txMbps: number
  }>
}

interface LogEntry {
  id: number
  time: string
  topics: string
  message: string
}

// Define FormData interface for better type safety
interface FormData {
  name: string
  type: "mikrotik" | "ubiquiti" | "juniper" | "other"
  location_id: string
  connection_type: "public_ip" | "private_ip" | "vpn"
  hostname: string
  api_port: number
  ssh_port: number
  username: string
  password: string
  mikrotik_user: string
  mikrotik_password: string
  trafficking_record: string
  speed_control: string
  save_visited_ips: boolean
  radius_secret: string
  radius_nas_ip: string
  gps_latitude: number
  gps_longitude: number
}

export default function EditRouterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const routerId = params.id as string

  const [routerData, setRouterData] = useState<Router | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [trafficData, setTrafficData] = useState<TrafficData[]>([])
  const [blockingRules, setBlockingRules] = useState<BlockingRule[]>([])
  const [interfaces, setInterfaces] = useState<RouterInterface[]>([])
  const [trafficHistory, setTrafficHistory] = useState<InterfaceTraffic[]>([])
  const [selectedInterface, setSelectedInterface] = useState<string>("all")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logFilter, setLogFilter] = useState<string>("")
  const [liveTraffic, setLiveTraffic] = useState<InterfaceTraffic[]>([])
  const [historicalRange, setHistoricalRange] = useState<"24h" | "7d" | "30d">("24h")

  const [troubleshootResults, setTroubleshootResults] = useState<any>(null)
  const [isTroubleshooting, setIsTroubleshooting] = useState(false)
  const [showTroubleshoot, setShowTroubleshoot] = useState(false)

  const [routerDetails, setRouterDetails] = useState<any>(null)

  const [radiusSettings, setRadiusSettings] = useState<any>(null)
  const [radiusTestResult, setRadiusTestResult] = useState<any>(null)
  const [radiusTestLoading, setRadiusTestLoading] = useState(false)

  useEffect(() => {
    fetchRouter()
    fetchLocations()
    fetchTrafficData()
    fetchBlockingRules()
    fetchInterfaces()
    fetchLogs()
    // Fetch router details on mount
    fetchRouterDetails()
    const fetchRadiusSettings = async () => {
      try {
        const response = await fetch("/api/server-settings")
        if (response.ok) {
          const data = await response.json()
          setRadiusSettings(data.radius)
        }
      } catch (error) {
        console.error("Error fetching RADIUS settings:", error)
      }
    }
    fetchRadiusSettings()
  }, [routerId])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveTraffic()
    }, 5000)

    return () => clearInterval(interval)
  }, [routerId])

  const fetchRouter = async () => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}`)
      if (response.ok) {
        const data = await response.json()
        setRouterData(data)
        setFormData({
          name: data.name,
          type: data.type,
          location_id: data.location_id?.toString() || "",
          connection_type: data.connection_type,
          hostname: data.hostname,
          api_port: data.api_port,
          ssh_port: data.ssh_port,
          username: data.username,
          password: "",
          mikrotik_user: data.mikrotik_user || "demo",
          mikrotik_password: "",
          trafficking_record: data.trafficking_record || "Traffic Flow (RouterOS V6x,V7.x)",
          speed_control: data.speed_control || "PCQ + Addresslist",
          save_visited_ips: data.save_visited_ips ?? true,
          radius_secret: data.radius_secret || "",
          radius_nas_ip: data.radius_nas_ip || "",
          gps_latitude: data.gps_latitude || -1.2921,
          gps_longitude: data.gps_longitude || 36.8219,
        })
      } else {
        // Handle cases where router is not found
        setRouterData(null)
      }
    } catch (error) {
      console.error("Error fetching router:", error)
      toast.error("Failed to fetch router data")
      setRouterData(null) // Ensure routerData is null on error
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
    }
  }

  const fetchTrafficData = async () => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/monitor`)
      if (response.ok) {
        const data = await response.json()
        // Convert monitor data to traffic chart format
        if (data.realtime && data.performance) {
          const trafficPoints = data.performance
            .slice(0, 20)
            .reverse()
            .map((point: any) => ({
              time: new Date(point.timestamp).toLocaleTimeString(),
              tx: point.bandwidth_out || 0,
              rx: point.bandwidth_in || 0,
            }))
          setTrafficData(trafficPoints)
        } else {
          // If no historical data, create single current point
          setTrafficData([
            {
              time: new Date().toLocaleTimeString(),
              tx: 0,
              rx: 0,
            },
          ])
        }
      } else {
        setTrafficData([])
      }
    } catch (error) {
      console.error("Error fetching traffic data:", error)
      setTrafficData([])
    }
  }

  const fetchBlockingRules = async () => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/firewall-rules`)
      if (response.ok) {
        const data = await response.json()
        setBlockingRules(data.rules || [])
      }
    } catch (error) {
      console.error("Error fetching blocking rules:", error)
    }
  }

  const fetchInterfaces = async () => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/interfaces`)
      if (response.ok) {
        const data = await response.json()
        setInterfaces(data.interfaces || [])
        setTrafficHistory(data.trafficHistory || [])
        if (data.interfaces && data.interfaces.length > 0) {
          setSelectedInterface(data.interfaces[0].name)
        }
      }
    } catch (error) {
      console.error("Error fetching interfaces:", error)
    }
  }

  const fetchLiveTraffic = async () => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/interfaces?live=true`)
      if (response.ok) {
        const data = await response.json()
        setLiveTraffic(data.trafficHistory || [])
      }
    } catch (error) {
      console.error("Error fetching live traffic:", error)
    }
  }

  const fetchHistoricalTraffic = async (range: "24h" | "7d" | "30d") => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/interfaces?range=${range}`)
      if (response.ok) {
        const data = await response.json()
        setTrafficHistory(data.trafficHistory || [])
      }
    } catch (error) {
      console.error("Error fetching historical traffic:", error)
    }
  }

  const handleHistoricalRangeChange = (range: "24h" | "7d" | "30d") => {
    setHistoricalRange(range)
    fetchHistoricalTraffic(range)
  }

  const fetchLogs = async () => {
    try {
      console.log("[v0] Fetching logs from API...")
      const response = await fetch(`/api/network/routers/${routerId}/logs`)

      console.log("[v0] Logs API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Logs API response data:", {
          success: data.success,
          logsCount: data.logs?.length || 0,
          error: data.error,
          details: data.details,
        })

        if (data.logs && data.logs.length > 0) {
          console.log("[v0] Setting logs state with", data.logs.length, "entries")
          console.log("[v0] First log entry:", data.logs[0])
          setLogs(data.logs)
        } else {
          console.warn("[v0] No logs returned from API")
          setLogs([])

          if (data.error) {
            toast.error(data.error)
          } else {
            toast.info("No logs available from the MikroTik router")
          }
        }
      } else {
        console.error("[v0] Logs API returned error status:", response.status)
        setLogs([])
        toast.error("Failed to fetch router logs")
      }
    } catch (error) {
      console.error("[v0] Error fetching logs:", error)
      setLogs([])
      toast.error("Failed to fetch router logs")
    }
  }

  const fetchRouterDetails = async () => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/test-connection`, {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        setRouterDetails(data)
      }
    } catch (error) {
      console.error("Error fetching router details:", error)
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/firewall-rules?ruleId=${ruleId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success("Blocking rule deleted successfully")
        fetchBlockingRules()
      } else {
        toast.error("Failed to delete blocking rule")
      }
    } catch (error) {
      console.error("Error deleting blocking rule:", error)
      toast.error("Failed to delete blocking rule")
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = 2
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  const formatLogTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
      log.topics.toLowerCase().includes(logFilter.toLowerCase()),
  )

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "mikrotik" as const,
    location_id: "",
    connection_type: "public_ip" as const,
    hostname: "",
    api_port: 8728,
    ssh_port: 22,
    username: "",
    password: "",
    mikrotik_user: "",
    mikrotik_password: "",
    trafficking_record: "Traffic Flow (RouterOS V6x,V7.x)",
    speed_control: "PCQ + Addresslist",
    save_visited_ips: true,
    radius_secret: "",
    radius_nas_ip: "",
    gps_latitude: -1.2921,
    gps_longitude: 36.8219,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/network/routers/${routerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success("Router updated successfully")
        router.push("/network/routers")
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to update router")
      }
    } catch (error) {
      console.error("Error updating router:", error)
      toast.error("Failed to update router")
    } finally {
      setSaving(false)
    }
  }

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData((prev) => ({
      ...prev,
      gps_latitude: lat,
      gps_longitude: lng,
    }))
  }

  const handleTroubleshoot = async () => {
    setIsTroubleshooting(true)
    setShowTroubleshoot(true)
    setTroubleshootResults(null)

    try {
      const response = await fetch(`/api/network/routers/${routerId}/troubleshoot`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Troubleshooting request failed")
      }

      const data = await response.json()
      setTroubleshootResults(data)
    } catch (error) {
      console.error("[v0] Troubleshooting error:", error)
      toast.error("Troubleshooting Failed: Could not complete router diagnostics")
    } finally {
      setIsTroubleshooting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle2 className="w-5 h-5 text-green-500" />
    if (status === "failed") return <XCircle className="w-5 h-5 text-red-500" />
    if (status === "running") return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />
  }

  const handleTestRadius = async () => {
    setRadiusTestLoading(true)
    setRadiusTestResult(null)

    try {
      const response = await fetch(`/api/network/routers/${routerId}/test-radius`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setRadiusTestResult(data)
        toast({
          title: data.success ? "Test Completed" : "Test Completed with Issues",
          description: data.success ? "RADIUS connectivity test passed" : "Some tests failed. Check details below.",
          variant: data.success ? "default" : "destructive",
        })
      } else {
        toast({
          title: "Test Failed",
          description: data.error || "Failed to test RADIUS connectivity",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error testing RADIUS:", error)
      toast({
        title: "Error",
        description: "Failed to perform RADIUS test",
        variant: "destructive",
      })
    } finally {
      setRadiusTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!routerData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Router not found or failed to load.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Router Configuration: {routerData.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Network</span>
              <span>/</span>
              <span>Routers</span>
              <span>/</span>
              <span className="text-blue-600">Edit {routerData.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRouter}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/network/routers")}>
            ✕
          </Button>
        </div>
      </div>

      {/* Troubleshooting Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>Connection Troubleshooting</CardTitle>
            </div>
            <Button onClick={handleTroubleshoot} disabled={isTroubleshooting}>
              {isTroubleshooting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {showTroubleshoot && (
          <CardContent className="space-y-4">
            {troubleshootResults ? (
              <>
                {/* Overall Status */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Overall Status</div>
                    <div className="text-lg font-semibold">
                      {troubleshootResults.overallStatus === "healthy" && (
                        <span className="text-green-500">✓ All Systems Operational</span>
                      )}
                      {troubleshootResults.overallStatus === "partial" && (
                        <span className="text-yellow-500">⚠ Partial Connectivity</span>
                      )}
                      {troubleshootResults.overallStatus === "failed" && (
                        <span className="text-red-500">✗ Connection Failed</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {troubleshootResults.summary.passed}/{troubleshootResults.summary.total}
                    </div>
                    <div className="text-sm text-muted-foreground">Tests Passed</div>
                  </div>
                </div>

                {/* Diagnostic Tests */}
                <div className="space-y-3">
                  {troubleshootResults.tests.map((test: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        test.status === "success"
                          ? "border-green-200 bg-green-50"
                          : test.status === "failed"
                            ? "border-red-200 bg-red-50"
                            : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(test.status)}
                        <div className="flex-1">
                          <div className="font-semibold">{test.name}</div>
                          {test.error && <div className="text-sm text-red-600 mt-1">{test.error}</div>}
                          {test.details && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(test.details).map(([key, value]: any) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium">{key}:</span>{" "}
                                  <span className="text-muted-foreground">
                                    {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground text-right">
                  Completed at {new Date(troubleshootResults.timestamp).toLocaleString()}
                </div>
              </>
            ) : isTroubleshooting ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Running diagnostic tests...</span>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click "Run Diagnostics" to test router connectivity.
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="data-config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="data-config" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data & Configuration
          </TabsTrigger>
          <TabsTrigger value="router-details" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Router Details
          </TabsTrigger>
          <TabsTrigger value="mikrotik" className="flex items-center gap-2">
            <RouterIcon className="w-4 h-4" />
            Mikrotik
          </TabsTrigger>
          <TabsTrigger value="graphics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Graphics
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data-config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Router Information */}
            <Card>
              <CardHeader>
                <CardTitle>Router Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="router-name">Router Name</Label>
                      <Input
                        id="router-name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Router Demo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="router-type">Router Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: any) => setFormData((prev) => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mikrotik">MikroTik</SelectItem>
                          <SelectItem value="ubiquiti">Ubiquiti</SelectItem>
                          <SelectItem value="juniper">Juniper</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Select
                        value={formData.location_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, location_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name} - {location.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ip-host">IP / Host</Label>
                      <Input
                        id="ip-host"
                        value={formData.hostname}
                        onChange={(e) => setFormData((prev) => ({ ...prev, hostname: e.target.value }))}
                        placeholder="45.77.1.85"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="connection-type">Connection Type</Label>
                      <Select
                        value={formData.connection_type}
                        onValueChange={(value: any) => setFormData((prev) => ({ ...prev, connection_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public_ip">Public IP</SelectItem>
                          <SelectItem value="private_ip">Private IP</SelectItem>
                          <SelectItem value="vpn">VPN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-port">API Port</Label>
                      <Input
                        id="api-port"
                        type="number"
                        value={formData.api_port}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, api_port: Number.parseInt(e.target.value, 10) }))
                        }
                        placeholder="8728"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ssh-port">SSH Port</Label>
                      <Input
                        id="ssh-port"
                        type="number"
                        value={formData.ssh_port}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, ssh_port: Number.parseInt(e.target.value, 10) }))
                        }
                        placeholder="22"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                        placeholder="admin"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="••••"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Radius Configuration */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">RADIUS Configuration</h3>
                        {radiusSettings?.enabled && (
                          <Badge variant="success" className="bg-green-100 text-green-800">
                            <Activity className="w-3 h-3 mr-1" />
                            RADIUS Server Active
                          </Badge>
                        )}
                      </div>

                      {radiusSettings?.enabled ? (
                        <>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            <p className="font-medium text-blue-900 mb-1">FreeRADIUS Integration</p>
                            <p className="text-blue-700">
                              This router is configured to work with your FreeRADIUS server at{" "}
                              <span className="font-mono">
                                {radiusSettings.host}:{radiusSettings.authPort}
                              </span>
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="radius-secret">RADIUS Secret 🔒</Label>
                            <Input
                              id="radius-secret"
                              type="password"
                              value={formData.radius_secret}
                              onChange={(e) => setFormData((prev) => ({ ...prev, radius_secret: e.target.value }))}
                              placeholder="Enter shared secret (must match FreeRADIUS server)"
                            />
                            <p className="text-xs text-muted-foreground">
                              This secret authenticates communication between the router and RADIUS server
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="radius-nas-ip">RADIUS NAS IP</Label>
                            <Input
                              id="radius-nas-ip"
                              value={formData.radius_nas_ip}
                              onChange={(e) => setFormData((prev) => ({ ...prev, radius_nas_ip: e.target.value }))}
                              placeholder={formData.hostname || "Enter NAS IP address"}
                            />
                            <p className="text-xs text-muted-foreground">
                              Network Access Server IP - typically the router's management IP
                            </p>
                          </div>

                          <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-sm">RADIUS Test & Troubleshooting</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Verify router can connect to FreeRADIUS server
                                </p>
                              </div>
                              <Button
                                onClick={handleTestRadius}
                                disabled={radiusTestLoading}
                                size="sm"
                                variant="outline"
                                className="gap-2 bg-transparent"
                              >
                                {radiusTestLoading ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <Activity className="w-4 h-4" />
                                    Run Test
                                  </>
                                )}
                              </Button>
                            </div>

                            {radiusTestResult && (
                              <div className="space-y-3">
                                {/* Test Results */}
                                {radiusTestResult.tests?.map((test: any, index: number) => (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg border ${
                                      test.status === "success"
                                        ? "bg-green-50 border-green-200"
                                        : test.status === "failed"
                                          ? "bg-red-50 border-red-200"
                                          : test.status === "warning"
                                            ? "bg-amber-50 border-amber-200"
                                            : "bg-blue-50 border-blue-200"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {test.status === "success" && (
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                                      )}
                                      {test.status === "failed" && (
                                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                                      )}
                                      {test.status === "warning" && (
                                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                                      )}
                                      {test.status === "info" && <Info className="w-4 h-4 text-blue-600 mt-0.5" />}
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{test.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{test.message}</p>

                                        {test.details && (
                                          <div className="mt-2 text-xs font-mono bg-white p-2 rounded border">
                                            <div>Host: {test.details.host}</div>
                                            <div>Port: {test.details.port}</div>
                                            {test.details.responseTime && (
                                              <div>Response Time: {test.details.responseTime}</div>
                                            )}
                                            <div>Status: {test.details.status}</div>
                                            {test.details.error && (
                                              <div className="text-red-600">Error: {test.details.error}</div>
                                            )}
                                          </div>
                                        )}

                                        {test.checks && (
                                          <div className="mt-2 space-y-1">
                                            {test.checks.map((check: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-2 text-xs">
                                                {check.status === "success" && (
                                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                                )}
                                                {check.status === "error" && (
                                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                                )}
                                                {check.status === "warning" && (
                                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                )}
                                                <span className="font-medium">{check.item}:</span>
                                                <span className="text-muted-foreground">{check.message}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* MikroTik Configuration Commands */}
                                {radiusTestResult.mikrotikConfig && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm font-medium text-amber-900 mb-2">
                                      MikroTik Configuration Commands
                                    </p>
                                    <div className="space-y-1 text-xs font-mono bg-white p-3 rounded border max-h-48 overflow-y-auto">
                                      {radiusTestResult.mikrotikConfig.commands.map((cmd: string, idx: number) => (
                                        <div
                                          key={idx}
                                          className={cmd.startsWith("#") ? "text-amber-800 font-semibold mt-2" : ""}
                                        >
                                          {cmd}
                                        </div>
                                      ))}
                                    </div>
                                    <p className="text-xs text-amber-700 mt-2">
                                      Copy these commands and paste them into your MikroTik terminal
                                    </p>
                                  </div>
                                )}

                                {/* Troubleshooting Tips */}
                                <div className="p-3 bg-slate-50 border rounded-lg">
                                  <p className="text-sm font-medium mb-2">Troubleshooting Checklist</p>
                                  <ul className="text-xs space-y-1 text-muted-foreground">
                                    <li>✓ Verify RADIUS secret matches on both router and server</li>
                                    <li>✓ Ensure router can ping RADIUS server IP: {radiusSettings.host}</li>
                                    <li>
                                      ✓ Check firewall allows UDP ports {radiusSettings.authPort} and{" "}
                                      {radiusSettings.acctPort}
                                    </li>
                                    <li>✓ Confirm FreeRADIUS service is running: systemctl status freeradius</li>
                                    <li>✓ Check FreeRADIUS logs: tail -f /var/log/freeradius/radius.log</li>
                                    <li>✓ Test from MikroTik: /radius incoming print</li>
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                            <p className="text-sm font-medium text-amber-900">MikroTik Configuration Commands</p>
                            <div className="space-y-1 text-xs font-mono bg-white p-2 rounded border">
                              <div className="text-amber-800"># Add RADIUS server to MikroTik</div>
                              <div>
                                /radius add service=ppp,login address={radiusSettings.host} secret=
                                {formData.radius_secret || "YOUR_SECRET"}
                              </div>
                              <div className="text-amber-800 mt-2"># Enable RADIUS authentication</div>
                              <div>/ppp aaa set use-radius=yes</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-2 bg-gray-50 rounded">
                              <p className="text-muted-foreground">Auth Port</p>
                              <p className="font-medium font-mono">{radiusSettings.authPort}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <p className="text-muted-foreground">Accounting Port</p>
                              <p className="font-medium font-mono">{radiusSettings.acctPort}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-900">RADIUS Server Not Configured</p>
                              <p className="text-sm text-yellow-700 mt-1">
                                Configure your FreeRADIUS server in{" "}
                                <a href="/settings/servers" className="underline font-medium">
                                  Settings → Servers
                                </a>{" "}
                                to enable AAA (Authentication, Authorization, Accounting) for this router.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Current Traffic */}
            <Card>
              <CardHeader>
                <CardTitle>Current Traffic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Interface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Interfaces</SelectItem>
                      {interfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>
                          {iface.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trafficData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis tickFormatter={(value) => `${value.toFixed(1)} Mbps`} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(2)} Mbps`,
                            name === "tx" ? "TX" : "RX",
                          ]}
                        />
                        <Line type="monotone" dataKey="tx" stroke="#ef4444" strokeWidth={2} name="TX" />
                        <Line type="monotone" dataKey="rx" stroke="#3b82f6" strokeWidth={2} name="RX" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500"></div>
                      <span>TX: {trafficData[trafficData.length - 1]?.tx.toFixed(2) || "0.00"} Mbps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500"></div>
                      <span>RX: {trafficData[trafficData.length - 1]?.rx.toFixed(2) || "0.00"} Mbps</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-full">
            <MapPicker
              title="Router GPS Location"
              onLocationSelect={handleLocationSelect}
              initialLat={formData.gps_latitude}
              initialLng={formData.gps_longitude}
              height="400px"
            />
          </div>
        </TabsContent>

        <TabsContent value="router-details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Signal className="w-5 h-5" />
                  Connection Status
                </CardTitle>
                <Button size="sm" variant="outline" onClick={fetchRouterDetails}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Status */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Status</span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          routerDetails?.success ? "bg-green-500 animate-pulse" : "bg-red-500"
                        }`}
                      />
                      <span className="font-medium capitalize">
                        {routerDetails?.success ? "Connected" : routerData?.status || "Disconnected"}
                      </span>
                    </div>
                  </div>

                  {/* Platform */}
                  {routerDetails?.details?.system_resources?.platform && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Platform</span>
                      <span className="font-medium">{routerDetails.details.system_resources.platform}</span>
                    </div>
                  )}

                  {/* Board Name */}
                  {routerDetails?.details?.system_resources?.["board-name"] && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Board Name</span>
                      <span className="font-medium">{routerDetails.details.system_resources["board-name"]}</span>
                    </div>
                  )}

                  {/* RouterOS Version */}
                  {routerDetails?.details?.system_resources?.version && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">RouterOS Version</span>
                      <span className="font-medium">{routerDetails.details.system_resources.version}</span>
                    </div>
                  )}

                  {/* CPU Usage */}
                  {routerDetails?.details?.system_resources?.["cpu-load"] !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">CPU Usage</span>
                      <span className="font-medium">{routerDetails.details.system_resources["cpu-load"]}%</span>
                    </div>
                  )}

                  {/* Last Sync Status */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Last Sync Status</span>
                    <span className="font-medium">
                      {routerDetails?.success ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Success
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not synced</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Connection message and latency */}
                {routerDetails?.success && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">{routerDetails.message}</p>
                    {routerDetails.details?.ping?.latency && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Latency: {routerDetails.details.ping.latency}ms
                      </p>
                    )}
                  </div>
                )}

                {/* Error message if connection failed */}
                {!routerDetails?.success && routerDetails?.error && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {routerDetails.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Resources */}
            {routerDetails?.details?.system_resources && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    System Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">CPU Load</p>
                      <p className="font-medium mt-1">{routerDetails.details.system_resources["cpu-load"] || "N/A"}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Free Memory</p>
                      <p className="font-medium mt-1">
                        {routerDetails.details.system_resources["free-memory"]
                          ? `${(routerDetails.details.system_resources["free-memory"] / 1024 / 1024).toFixed(0)} MB`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Memory</p>
                      <p className="font-medium mt-1">
                        {routerDetails.details.system_resources["total-memory"]
                          ? `${(routerDetails.details.system_resources["total-memory"] / 1024 / 1024).toFixed(0)} MB`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Free HDD Space</p>
                      <p className="font-medium mt-1">
                        {routerDetails.details.system_resources["free-hdd-space"]
                          ? `${(routerDetails.details.system_resources["free-hdd-space"] / 1024 / 1024).toFixed(0)} MB`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  {routerDetails.details.system_resources.uptime && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className="font-medium mt-1">{routerDetails.details.system_resources.uptime}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Router Identity & Version */}
            {routerDetails?.details?.identity && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RouterIcon className="w-5 h-5" />
                    Router Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Identity Name</p>
                    <p className="font-medium mt-1">{routerDetails.details.identity.name || routerData?.name}</p>
                  </div>
                  {routerDetails.details.system_resources?.version && (
                    <div>
                      <p className="text-sm text-muted-foreground">RouterOS Version</p>
                      <p className="font-medium mt-1">{routerDetails.details.system_resources.version}</p>
                    </div>
                  )}
                  {routerDetails.details.system_resources?.["board-name"] && (
                    <div>
                      <p className="text-sm text-muted-foreground">Board Name</p>
                      <p className="font-medium mt-1">{routerDetails.details.system_resources["board-name"]}</p>
                    </div>
                  )}
                  {routerDetails.details.system_resources?.["architecture-name"] && (
                    <div>
                      <p className="text-sm text-muted-foreground">Architecture</p>
                      <p className="font-medium mt-1">{routerDetails.details.system_resources["architecture-name"]}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Network Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Network Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Hostname</p>
                  <p className="font-medium mt-1 font-mono text-blue-600">{routerData?.hostname || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SSH Port</p>
                  <p className="font-medium mt-1">{routerData?.ssh_port || "22"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium mt-1">{routerData?.username || "N/A"}</p>
                </div>
                {routerData?.radius_nas_ip && (
                  <div>
                    <p className="text-sm text-muted-foreground">RADIUS NAS IP</p>
                    <p className="font-medium mt-1 font-mono">{routerData.radius_nas_ip}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Full System Info Card */}
          {routerDetails?.details && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Raw System Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(routerDetails.details, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blocking" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Blocking Pages</CardTitle>
              <div className="flex items-center gap-2">
                <Select defaultValue="15">
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => toast.info("Add new blocking rule feature coming soon")}>
                  New
                </Button>
                <Button size="sm" variant="outline" onClick={fetchBlockingRules}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input placeholder="Look for..." className="max-w-sm ml-auto" />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>NAME/HOST</TableHead>
                      <TableHead>TYPE</TableHead>
                      <TableHead>IP/REGEXP</TableHead>
                      <TableHead>STATE</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockingRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.id}</TableCell>
                        <TableCell>{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{rule.type}</Badge>
                        </TableCell>
                        <TableCell className="text-blue-600">{rule.ip_regexp}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              rule.state === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }
                          >
                            {rule.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toast.info("Toggle rule feature coming soon")}
                            >
                              <Switch checked={rule.state === "ACTIVE"} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)}>
                              🗑️
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing {blockingRules.length} of {blockingRules.length} rules
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mikrotik" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">MIKROTIK</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mikrotik-user">User (API)</Label>
                    <Input
                      id="mikrotik-user"
                      value={formData.mikrotik_user}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mikrotik_user: e.target.value }))}
                      placeholder="demo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mikrotik-password">Password (API)</Label>
                    <div className="relative">
                      <Input
                        id="mikrotik-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.mikrotik_password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, mikrotik_password: e.target.value }))}
                        placeholder="••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trafficking-record">Trafficking record</Label>
                    <Select
                      value={formData.trafficking_record}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, trafficking_record: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Traffic Flow (RouterOS V6x,V7.x)">
                          Traffic Flow (RouterOS V6x,V7.x)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="speed-control">Speed Control</Label>
                    <Select
                      value={formData.speed_control}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, speed_control: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCQ + Addresslist">PCQ + Addresslist</SelectItem>
                        <SelectItem value="Simple (Dynamic) Queues">Simple (Dynamic) Queues</SelectItem>
                        <SelectItem value="DHCP Lease (Dynamic Single Leases)">
                          DHCP Lease (Dynamic Single Leases)
                        </SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="save-visited-ips"
                      checked={formData.save_visited_ips}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, save_visited_ips: checked }))}
                    />
                    <Label htmlFor="save-visited-ips">Save Visited IPs</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graphics">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Live Traffic Usage</CardTitle>
                <Badge variant="outline" className="animate-pulse">
                  Live - Updates every 5s
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Label>Select Interface:</Label>
                  <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Interfaces</SelectItem>
                      {interfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>
                          {iface.name} ({iface.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={fetchLiveTraffic}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </div>

                {selectedInterface !== "all" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Current Traffic - {selectedInterface}</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={
                            liveTraffic
                              .find((t) => t.interface === selectedInterface)
                              ?.history.slice(-20)
                              .map((h) => ({
                                time: new Date(h.time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                }),
                                rx: typeof h.rxMbps === "number" ? h.rxMbps : 0,
                                tx: typeof h.txMbps === "number" ? h.txMbps : 0,
                              })) || []
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis label={{ value: "Mbps", angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            formatter={(value: any) => `${typeof value === "number" ? value.toFixed(2) : "0.00"} Mbps`}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="rx"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="RX (Download)"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="tx"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="TX (Upload)"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {selectedInterface === "all" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveTraffic.map((traffic) => (
                      <Card key={traffic.interface}>
                        <CardHeader>
                          <CardTitle className="text-base">{traffic.interface}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={traffic.history.slice(-10).map((h) => ({
                                  time: new Date(h.time).toLocaleTimeString([], {
                                    minute: "2-digit",
                                    second: "2-digit",
                                  }),
                                  rx: typeof h.rxMbps === "number" ? h.rxMbps : 0,
                                  tx: typeof h.txMbps === "number" ? h.txMbps : 0,
                                }))}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" fontSize={10} />
                                <YAxis fontSize={10} />
                                <Tooltip
                                  formatter={(value: any) =>
                                    `${typeof value === "number" ? value.toFixed(1) : "0.0"} Mbps`
                                  }
                                />
                                <Line type="monotone" dataKey="rx" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                                <Line type="monotone" dataKey="tx" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                            <span>
                              RX:{" "}
                              {typeof traffic.history[traffic.history.length - 1]?.rxMbps === "number"
                                ? traffic.history[traffic.history.length - 1].rxMbps.toFixed(2)
                                : "0.00"}{" "}
                              Mbps
                            </span>
                            <span>
                              TX:{" "}
                              {typeof traffic.history[traffic.history.length - 1]?.txMbps === "number"
                                ? traffic.history[traffic.history.length - 1].txMbps.toFixed(2)
                                : "0.00"}{" "}
                              Mbps
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historical Traffic Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Label>Time Range:</Label>
                  <Select value={historicalRange} onValueChange={(value: any) => handleHistoricalRangeChange(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Interface:</Label>
                  <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Interfaces</SelectItem>
                      {interfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name}>
                          {iface.name} ({iface.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Interface</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>RX Bytes</TableHead>
                        <TableHead>TX Bytes</TableHead>
                        <TableHead>RX Packets</TableHead>
                        <TableHead>TX Packets</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interfaces.map((iface) => (
                        <TableRow key={iface.name}>
                          <TableCell className="font-medium">{iface.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{iface.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={iface.running ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                            >
                              {iface.running ? "Running" : "Down"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatBytes(iface.rxBytes)}</TableCell>
                          <TableCell>{formatBytes(iface.txBytes)}</TableCell>
                          <TableCell>{iface.rxPackets.toLocaleString()}</TableCell>
                          <TableCell>{iface.txPackets.toLocaleString()}</TableCell>
                          <TableCell>
                            {(iface.rxErrors || 0) + (iface.txErrors || 0) > 0 ? (
                              <span className="text-red-600">{(iface.rxErrors || 0) + (iface.txErrors || 0)}</span>
                            ) : (
                              <span className="text-green-600">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedInterface !== "all" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Traffic History - {selectedInterface} (
                      {historicalRange === "24h"
                        ? "Last 24 Hours"
                        : historicalRange === "7d"
                          ? "Last 7 Days"
                          : "Last 30 Days"}
                      )
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={
                            trafficHistory
                              .find((t) => t.interface === selectedInterface)
                              ?.history.map((h) => ({
                                time: new Date(h.time).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                                rx: typeof h.rxMbps === "number" ? h.rxMbps : 0,
                                tx: typeof h.txMbps === "number" ? h.txMbps : 0,
                              })) || []
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis label={{ value: "Mbps", angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            formatter={(value: any) => `${typeof value === "number" ? value.toFixed(2) : "0.00"} Mbps`}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="rx" stroke="#3b82f6" strokeWidth={2} name="RX (Download)" />
                          <Line type="monotone" dataKey="tx" stroke="#ef4444" strokeWidth={2} name="TX (Upload)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {selectedInterface === "all" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trafficHistory.map((traffic) => (
                      <Card key={traffic.interface}>
                        <CardHeader>
                          <CardTitle className="text-base">{traffic.interface}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={traffic.history.map((h) => ({
                                  time: new Date(h.time).toLocaleTimeString([], { hour: "2-digit" }),
                                  rx: typeof h.rxMbps === "number" ? h.rxMbps : 0,
                                  tx: typeof h.txMbps === "number" ? h.txMbps : 0,
                                }))}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)} Mbps`} />
                                <Line type="monotone" dataKey="rx" stroke="#3b82f6" strokeWidth={1.5} />
                                <Line type="monotone" dataKey="tx" stroke="#ef4444" strokeWidth={1.5} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="log">
          <Card>
            <CardHeader>
              <CardTitle>Mikrotik Audit Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Filter logs by message or topic..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="max-w-md"
                />
                <Button size="sm" variant="outline" onClick={fetchLogs}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Time</TableHead>
                      <TableHead className="w-40">Topics</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length > 0 ? (
                      (logFilter ? filteredLogs : logs).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{formatLogTime(log.time)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.topics}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono">{log.message}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="w-8 h-8 opacity-50" />
                            <p>No logs available from the physical MikroTik router</p>
                            <p className="text-xs">
                              Make sure the REST API is enabled on the router (IP → Services → www/www-ssl)
                            </p>
                            <Button size="sm" variant="outline" onClick={fetchLogs} className="mt-2 bg-transparent">
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Try Again
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {logFilter ? filteredLogs.length : logs.length} log entries from physical router</span>
                {logs.length > 0 && <span className="text-xs">Last updated: {new Date().toLocaleTimeString()}</span>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saving} className="min-w-32">
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}

"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Activity,
  CheckCircle,
  Database,
  Info,
  RouterIcon,
  BarChart3,
  FileText,
  Shield,
  Save,
  RefreshCw,
  ArrowLeft,
  EyeOff,
  Eye,
  Signal,
  XCircle,
  Network,
  Terminal,
  Loader2,
  AlertTriangle,
  Twitch as Switch,
} from "lucide-react"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

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
  customer_auth_method?: string // Added customer_auth_method to Router interface
  enable_traffic_recording?: boolean // Changed from trafficking_record
  enable_speed_control?: boolean // Changed from speed_control
  blocking_page_url?: string // Changed from save_visited_ips
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
type FormData = {
  name: string
  type: "mikrotik" | "ubiquiti" | "juniper" | "other"
  location_id: string
  connection_type: string
  hostname: string
  api_port: number
  ssh_port: number
  username: string
  password: string
  mikrotik_user: string
  mikrotik_password: string
  customer_auth_method: string
  enable_traffic_recording: boolean // Changed from trafficking_record
  enable_speed_control: boolean // Changed from speed_control
  blocking_page_url: string // Changed from save_visited_ips
  radius_secret: string
  radius_nas_ip: string
  gps_latitude: string
  gps_longitude: string
}

export default function RouterEditPage({ params }: { params: { id: string } }) {
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

  const [portTrafficHistory, setPortTrafficHistory] = useState<any[]>([])
  const [availablePorts, setAvailablePorts] = useState<string[]>([])

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
          name: data.name || "",
          type: data.type || "mikrotik",
          location_id: data.location_id?.toString() || "",
          connection_type: data.connection_type || "public_ip",
          hostname: data.hostname || data.ip_address || "",
          api_port: data.api_port || 8728,
          ssh_port: data.ssh_port || 22,
          username: data.username || "admin",
          password: "",
          mikrotik_user: data.mikrotik_user || "demo",
          mikrotik_password: "",
          customer_auth_method: data.customer_auth_method || "pppoe_radius",
          enable_traffic_recording: data.enable_traffic_recording || false, // Changed
          enable_speed_control: data.enable_speed_control || false, // Changed
          blocking_page_url: data.blocking_page_url || "", // Changed
          radius_secret: data.radius_secret || "",
          radius_nas_ip: data.radius_nas_ip || "",
          gps_latitude: data.gps_latitude?.toString() || "",
          gps_longitude: data.gps_longitude?.toString() || "",
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
      console.log("[v0] Fetching traffic data for router", routerId)
      const response = await fetch(`/api/network/routers/${routerId}/monitor`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Monitor API response:", data)

        if (data.performance && data.performance.length > 0) {
          const trafficPoints = data.performance
            .slice(0, 20)
            .reverse()
            .map((point: any) => ({
              time: new Date(point.timestamp).toLocaleTimeString(),
              tx: point.bandwidth_out || 0,
              rx: point.bandwidth_in || 0,
            }))
          console.log("[v0] Setting traffic data points:", trafficPoints.length)
          setTrafficData(trafficPoints)
        } else if (data.realtime) {
          setTrafficData([
            {
              time: new Date().toLocaleTimeString(),
              tx: 0,
              rx: 0,
            },
          ])
        } else {
          console.log("[v0] No traffic data available")
          setTrafficData([])
        }
      } else {
        console.error("[v0] Monitor API error:", response.status)
        setTrafficData([])
      }
    } catch (error) {
      console.error("[v0] Error fetching traffic data:", error)
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
      const response = await fetch(`/api/network/routers/${routerId}/interfaces?snapshot=true`)
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

  const fetchPortTrafficHistory = async (range: string) => {
    try {
      const response = await fetch(`/api/network/routers/${routerId}/port-traffic-history?range=${range}`)
      const data = await response.json()

      console.log("[v0] Port traffic history data:", data)

      if (data.success) {
        setPortTrafficHistory(data.history || [])
        setAvailablePorts(data.ports || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching port traffic history:", error)
    }
  }

  const handleHistoricalRangeChange = async (value: string) => {
    setHistoricalRange(value as "24h" | "7d" | "30d")
    await fetchHistoricalTraffic(value as "24h" | "7d" | "30d")
    await fetchPortTrafficHistory(value)
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
    connection_type: "public_ip",
    hostname: "",
    api_port: 8728,
    ssh_port: 22,
    username: "",
    password: "",
    mikrotik_user: "",
    mikrotik_password: "",
    customer_auth_method: "pppoe_radius",
    enable_traffic_recording: false, // Changed from trafficking_record
    enable_speed_control: false, // Changed from speed_control
    blocking_page_url: "", // Changed from save_visited_ips
    radius_secret: "",
    radius_nas_ip: "",
    gps_latitude: "",
    gps_longitude: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true) // Changed from setLoading to setSaving
    setLoading(true) // Keeping setLoading as per the update

    try {
      console.log("[v0] Submitting router update with data:", formData)

      const response = await fetch(`/api/network/routers/${routerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          location_id: formData.location_id,
          connection_type: formData.connection_type,
          hostname: formData.hostname,
          api_port: formData.api_port,
          ssh_port: formData.ssh_port,
          username: formData.username,
          password: formData.password,
          mikrotik_user: formData.mikrotik_user,
          mikrotik_password: formData.mikrotik_password,
          customer_auth_method: formData.customer_auth_method,
          enable_traffic_recording: formData.enable_traffic_recording,
          enable_speed_control: formData.enable_speed_control,
          blocking_page_url: formData.blocking_page_url,
          radius_secret: formData.radius_secret,
          radius_nas_ip: formData.radius_nas_ip,
          gps_latitude: formData.gps_latitude,
          gps_longitude: formData.gps_longitude,
          status: routerData?.status || "active",
        }),
      })

      console.log("[v0] Response status:", response.status)

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
      setLoading(false) // Added setLoading(false) here
    }
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
    if (status === "success") return <CheckCircle className="w-5 h-5 text-green-500" /> // Changed from CheckCircle2
    if (status === "failed") return <AlertCircle className="w-5 h-5 text-red-500" />
    if (status === "running") return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> // Loader2 was not imported in updates, but was present in existing. Keeping Loader2.
    return <AlertTriangle className="w-5 h-5 text-yellow-500" /> // AlertTriangle was not imported in updates, but was present in existing. Keeping AlertTriangle.
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
            <ArrowLeft className="w-4 h-4 mr-2" /> {/* ArrowLeft was not imported in updates, keeping it */}
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  {/* Loader2 was not imported in updates, but was present in existing. Keeping Loader2. */}
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />{" "}
                {/* Loader2 was not imported in updates, but was present in existing. Keeping Loader2. */}
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="data-config" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data & Configuration
          </TabsTrigger>
          <TabsTrigger value="router-details" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Router Details
          </TabsTrigger>
          {/* Security tab added */}
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="mikrotik" className="flex items-center gap-2">
            <RouterIcon className="w-4 h-4" />
            Mikrotik
          </TabsTrigger>
          <TabsTrigger value="graphics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Monitoring
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
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{" "}
                          {/* EyeOff, Eye were not imported in updates, keeping them */}
                        </Button>
                      </div>
                    </div>

                    {/* Radius Configuration */}
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
        </TabsContent>

        <TabsContent value="router-details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Signal className="w-5 h-5" /> {/* Signal was not imported in updates, keeping it */}
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
                          <CheckCircle className="w-4 h-4" />
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
                      <XCircle className="w-4 h-4" /> {/* XCircle was not imported in updates, keeping it */}
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
                  <Network className="w-5 h-5" /> {/* Network was not imported in updates, keeping it */}
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
                  <Terminal className="w-5 h-5" /> {/* Terminal was not imported in updates, keeping it */}
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

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>Configure authentication and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Router Authentication */}
              <div className="space-y-4">
                <h3 className="font-semibold">Router Authentication</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="admin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connection_type">Connection Method</Label>
                  <Select
                    value={formData.connection_type}
                    onValueChange={(value: any) => setFormData({ ...formData, connection_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public_ip">Public IP (Recommended)</SelectItem>
                      <SelectItem value="private_ip">Private IP</SelectItem>
                      <SelectItem value="vpn">VPN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">RADIUS Authentication (FreeRADIUS)</h3>
                  {radiusSettings?.enabled && (
                    <Badge className="bg-green-100 text-green-800">
                      <Activity className="w-3 h-3 mr-1" />
                      Server Active
                    </Badge>
                  )}
                </div>

                {radiusSettings?.enabled ? (
                  <>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
                      <p className="font-medium text-blue-900">FreeRADIUS Server Detected</p>
                      <div className="space-y-1 text-blue-700">
                        <p>
                          Server:{" "}
                          <span className="font-mono">
                            {radiusSettings.host}:{radiusSettings.authPort}
                          </span>
                        </p>
                        <p>Protocols: PPPoE, IPoE, Hotspot, Wireless</p>
                        <p>Accounting: {radiusSettings.acctPort}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="radius_secret">RADIUS Shared Secret 🔒</Label>
                        <Input
                          id="radius_secret"
                          type="password"
                          value={formData.radius_secret}
                          onChange={(e) => setFormData({ ...formData, radius_secret: e.target.value })}
                          placeholder="Enter shared secret"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Must match the secret configured in FreeRADIUS clients.conf
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="radius_nas_ip">NAS IP Address</Label>
                        <Input
                          id="radius_nas_ip"
                          value={formData.radius_nas_ip}
                          onChange={(e) => setFormData({ ...formData, radius_nas_ip: e.target.value })}
                          placeholder={routerData?.ip_address || "Router IP address"}
                        />
                        <p className="text-xs text-muted-foreground">
                          Network Access Server identifier (usually router IP)
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 border rounded-lg space-y-2">
                      <p className="text-sm font-medium">Configure MikroTik RADIUS:</p>
                      <div className="space-y-1 text-xs font-mono bg-white p-2 rounded border">
                        <div className="text-muted-foreground"># Add RADIUS server</div>
                        <div>/radius add service=ppp,login address={radiusSettings.host} secret=[YOUR_SECRET]</div>
                        <div className="text-muted-foreground mt-2"># Enable RADIUS AAA</div>
                        <div>/ppp aaa set use-radius=yes accounting=yes</div>
                      </div>
                    </div>

                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-900">
                        <strong>Supported Features:</strong> User authentication, bandwidth control via vendor-specific
                        attributes (Mikrotik-Rate-Limit), session accounting, and failover redundancy.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="radius_secret">RADIUS Secret (Optional)</Label>
                        <Input
                          id="radius_secret"
                          type="password"
                          value={formData.radius_secret}
                          onChange={(e) => setFormData({ ...formData, radius_secret: e.target.value })}
                          placeholder="Leave empty if not using RADIUS"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="radius_nas_ip">NAS IP Address (Optional)</Label>
                        <Input
                          id="radius_nas_ip"
                          value={formData.radius_nas_ip}
                          onChange={(e) => setFormData({ ...formData, radius_nas_ip: e.target.value })}
                          placeholder="Leave empty if not using RADIUS"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-900">FreeRADIUS Not Configured</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            To enable centralized AAA (Authentication, Authorization, Accounting) with FreeRADIUS,
                            configure your RADIUS server in{" "}
                            <a
                              href="/settings/servers"
                              target="_blank"
                              className="underline font-medium"
                              rel="noreferrer"
                            >
                              Settings → Servers
                            </a>
                            .
                          </p>
                          <p className="text-sm text-yellow-700 mt-2">
                            <strong>Benefits:</strong> Centralized user management, PPPoE/IPoE/Hotspot authentication,
                            dynamic bandwidth control, session tracking, and multi-vendor support (MikroTik, Ubiquiti,
                            Cisco, Juniper, Cambium, Huawei).
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocking">
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
                              <Switch checked={rule.state === "ACTIVE"} />{" "}
                              {/* Switch was not imported in updates, keeping it */}
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
              <CardTitle>MikroTik Configuration</CardTitle>
              <CardDescription>MikroTik specific settings and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_username">API Username</Label>
                  <Input
                    id="api_username"
                    value={formData.mikrotik_user}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mikrotik_user: e.target.value }))}
                    placeholder="admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_password">API Password</Label>
                  <Input
                    id="api_password"
                    type="password"
                    value={formData.mikrotik_password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mikrotik_password: e.target.value }))}
                    placeholder="Enter API password"
                  />
                </div>
              </div>

              {/* Customer Authorization Method dropdown */}
              <div className="space-y-2">
                <Label htmlFor="customer_auth_method">Customer Authorization Method</Label>
                <Select
                  value={formData.customer_auth_method || "pppoe_radius"}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, customer_auth_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select authorization method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dhcp_lease">
                      <div className="flex flex-col">
                        <span className="font-medium">DHCP Lease</span>
                        <span className="text-xs text-muted-foreground">
                          Customers get IP addresses via DHCP without authentication
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pppoe_radius">
                      <div className="flex flex-col">
                        <span className="font-medium">PPPoE with DHCP and RADIUS Authentication</span>
                        <span className="text-xs text-muted-foreground">
                          Customers authenticate via PPPoE using RADIUS server (Recommended)
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pppoe_secrets">
                      <div className="flex flex-col">
                        <span className="font-medium">PPPoE Secrets</span>
                        <span className="text-xs text-muted-foreground">
                          Customers authenticate via PPPoE using local router secrets
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This setting determines how customers will be authorized to browse the internet
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Traffic Recording</Label>
                    <p className="text-sm text-muted-foreground">Record traffic data for monitoring</p>
                  </div>
                  <Switch
                    checked={formData.enable_traffic_recording}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, enable_traffic_recording: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Speed Control</Label>
                    <p className="text-sm text-muted-foreground">Enable bandwidth management</p>
                  </div>
                  <Switch
                    checked={formData.enable_speed_control}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enable_speed_control: checked }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blocking_page_url">Blocking Page URL</Label>
                <Input
                  id="blocking_page_url"
                  value={formData.blocking_page_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, blocking_page_url: e.target.value }))}
                  placeholder="http://example.com/blocked"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graphics">
          <div className="space-y-6">
            {/* Current Traffic (Live Traffic Usage) Card */}
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
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)} Mbps`} />
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

            {/* Traffic History - Per Port Card */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic History - Per Port</CardTitle>
                <CardDescription>Historical bandwidth usage across all router ports/interfaces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Label>Time Range:</Label>
                  <Select value={historicalRange} onValueChange={(value: any) => handleHistoricalRangeChange(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last 1 Hour</SelectItem>
                      <SelectItem value="6h">Last 6 Hours</SelectItem>
                      <SelectItem value="12h">Last 12 Hours</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last 1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => fetchPortTrafficHistory(historicalRange)}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </div>

                {portTrafficHistory.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={portTrafficHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="time"
                            tickFormatter={(time) => {
                              const date = new Date(time)
                              if (historicalRange === "1h" || historicalRange === "6h") {
                                return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              } else if (historicalRange === "24h" || historicalRange === "7d") {
                                return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit" })
                              } else {
                                return date.toLocaleDateString([], { month: "short", day: "numeric" })
                              }
                            }}
                          />
                          <YAxis label={{ value: "Mbps", angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            formatter={(value: any) => `${typeof value === "number" ? value.toFixed(2) : "0.00"} Mbps`}
                            labelFormatter={(time) => new Date(time).toLocaleString()}
                          />
                          <Legend />
                          {availablePorts.map((port, index) => {
                            const colors = [
                              "#3b82f6",
                              "#ef4444",
                              "#10b981",
                              "#f59e0b",
                              "#8b5cf6",
                              "#ec4899",
                              "#14b8a6",
                              "#f97316",
                            ]
                            const colorIndex = index % colors.length
                            const rxColor = colors[colorIndex]
                            const txColor = colors[colorIndex] + "99" // Add transparency for TX

                            return (
                              <>
                                <Bar
                                  key={`${port}_rx`}
                                  dataKey={`${port}_rx`}
                                  fill={rxColor}
                                  name={`${port} Download`}
                                  stackId={`port_${index}`}
                                />
                                <Bar
                                  key={`${port}_tx`}
                                  dataKey={`${port}_tx`}
                                  fill={txColor}
                                  name={`${port} Upload`}
                                  stackId={`port_${index}`}
                                />
                              </>
                            )
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Active Ports ({availablePorts.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {availablePorts.map((port, index) => {
                            const colors = [
                              "#3b82f6",
                              "#ef4444",
                              "#10b981",
                              "#f59e0b",
                              "#8b5cf6",
                              "#ec4899",
                              "#14b8a6",
                              "#f97316",
                            ]
                            const colorIndex = index % colors.length
                            return (
                              <div key={port} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[colorIndex] }} />
                                <span>{port}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Legend:</p>
                        <p>• Solid colors = Download (RX)</p>
                        <p>• Transparent colors = Upload (TX)</p>
                        <p>• Each bar shows stacked traffic per port</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="w-12 h-12 mb-4 opacity-50" />
                    <p>No port traffic history available</p>
                    <p className="text-sm">Traffic data will appear once the router starts collecting statistics</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historical Traffic Usage Card with Table */}
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
                              Make sure the REST API is enabled on the router (IP → Services → www/ssl)
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

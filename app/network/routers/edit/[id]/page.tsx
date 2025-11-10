"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, ArrowLeft, Save, RefreshCw, Database, Users, RouterIcon, BarChart3, FileText } from "lucide-react"
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
  txErrors: number
  rxDrops: number
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

export default function EditRouterPage() {
  const router = useRouter()
  const params = useParams()
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

  useEffect(() => {
    fetchRouter()
    fetchLocations()
    fetchTrafficData()
    fetchBlockingRules()
    fetchInterfaces()
    fetchLogs()
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
      }
    } catch (error) {
      console.error("Error fetching router:", error)
      toast.error("Failed to fetch router data")
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
    const mockData: TrafficData[] = []
    const now = new Date()
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000)
      mockData.push({
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tx: Math.random() * 0.8,
        rx: Math.random() * 0.6,
      })
    }
    setTrafficData(mockData)
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
      const response = await fetch(`/api/network/routers/${routerId}/logs`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
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
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
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

  const [formData, setFormData] = useState({
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!routerData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Router not found</p>
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
            <h1 className="text-2xl font-bold">Router Configuration</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Start</span>
              <span>/</span>
              <span>Lista Routers</span>
              <span>/</span>
              <span className="text-blue-600">Edit router</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            ✕
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="data-config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="data-config" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data & Configuration
          </TabsTrigger>
          <TabsTrigger value="blocking" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Blocking Pages
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
                      <Label htmlFor="router-number">Router Number</Label>
                      <Input
                        id="router-number"
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
                      <Label htmlFor="security">Security</Label>
                      <Select value="ppp_accounting_radius" onValueChange={() => {}}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none_accounting_api">None / Accounting API</SelectItem>
                          <SelectItem value="ppp_accounting_api">PPP / Accounting API</SelectItem>
                          <SelectItem value="hotspot_accounting_api">Hotspot / Accounting API</SelectItem>
                          <SelectItem value="ppp_accounting_radius">PPP / Accounting Radius</SelectItem>
                          <SelectItem value="hotspot_accounting_radius">Hotspot / Accounting Radius</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Radius Configuration */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold">Radius Configuration</h3>

                      <div className="space-y-2">
                        <Label htmlFor="radius-secret">Radius Secret 🔒</Label>
                        <Input
                          id="radius-secret"
                          value={formData.radius_secret}
                          onChange={(e) => setFormData((prev) => ({ ...prev, radius_secret: e.target.value }))}
                          placeholder="kG5CF9eUpHD5VS5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="radius-nas-ip">Radius NAS IP</Label>
                        <Input
                          id="radius-nas-ip"
                          value={formData.radius_nas_ip}
                          onChange={(e) => setFormData((prev) => ({ ...prev, radius_nas_ip: e.target.value }))}
                          placeholder="45.77.1.85"
                        />
                      </div>
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
                  <Select defaultValue="all-interfaces">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Interface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-interfaces">Select Interface</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trafficData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 1.0]} tickFormatter={(value) => `${value.toFixed(1)} Mbps`} />
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
                      <span>TX: 0 Mbps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500"></div>
                      <span>RX: 0 Mbps</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GPS Location Picker */}
          <div className="grid grid-cols-1 gap-6">
            <MapPicker
              title="Router GPS Location"
              onLocationSelect={handleLocationSelect}
              initialLat={formData.gps_latitude}
              initialLng={formData.gps_longitude}
              height="400px"
            />
          </div>
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
                                rx: h.rxMbps,
                                tx: h.txMbps,
                              })) || []
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis label={{ value: "Mbps", angle: -90, position: "insideLeft" }} />
                          <Tooltip formatter={(value: number) => `${value.toFixed(2)} Mbps`} />
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
                                  rx: h.rxMbps,
                                  tx: h.txMbps,
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
                              RX: {traffic.history[traffic.history.length - 1]?.rxMbps.toFixed(2) || "0.00"} Mbps
                            </span>
                            <span>
                              TX: {traffic.history[traffic.history.length - 1]?.txMbps.toFixed(2) || "0.00"} Mbps
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
                            {iface.rxErrors + iface.txErrors > 0 ? (
                              <span className="text-red-600">{iface.rxErrors + iface.txErrors}</span>
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
                                rx: h.rxMbps,
                                tx: h.txMbps,
                              })) || []
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis label={{ value: "Mbps", angle: -90, position: "insideLeft" }} />
                          <Tooltip formatter={(value: number) => `${value.toFixed(2)} Mbps`} />
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
                                  rx: h.rxMbps,
                                  tx: h.txMbps,
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
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
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
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {logs.length} log entries
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

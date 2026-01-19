"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  Save,
  Check,
  RouterIcon,
  Shield,
  Network,
  Activity,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { RADIUSConfigGenerator } from "@/components/radius-config-generator"
import { Troubleshooter } from "@/components/troubleshooter"

interface Location {
  id: number
  name: string
}

interface Router {
  id: number
  name: string
  type: "mikrotik" | "ubiquiti" | "juniper" | "other"
  location_id: number
  ip_address: string
  port: number
  ssh_port: number
  username: string
  status: string
  connection_method: string
  api_username?: string
  api_password?: string
  customer_auth_method?: string
  enable_traffic_recording?: boolean
  enable_speed_control?: boolean
  blocking_page_url?: string
  radius_secret?: string
  nas_ip_address?: string
  latitude?: number
  longitude?: number
}

const STEPS = [
  { id: 1, title: "Vendor Selection", description: "Choose router vendor" },
  { id: 2, title: "Basic Information", description: "Router details" },
  { id: 3, title: "Network Configuration", description: "IP and ports" },
  { id: 4, title: "Authentication", description: "Credentials and security" },
  { id: 5, title: "Configuration", description: "Vendor-specific settings" },
]

export default function EditRouterPage() {
  const router = useRouter()
  const params = useParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [isTroubleshooting, setIsTroubleshooting] = useState(false)
  const [troubleshootResults, setTroubleshootResults] = useState<any>(null)

  const [formData, setFormData] = useState({
    // Step 1: Vendor
    type: "mikrotik" as "mikrotik" | "ubiquiti" | "juniper" | "other",
    // Step 2: Basic Info
    name: "",
    location_id: "",
    status: "active",
    // Step 3: Network
    ip_address: "",
    port: "8728",
    ssh_port: "22",
    connection_method: "api",
    // Step 4: Authentication
    username: "admin",
    password: "",
    radius_secret: "",
    nas_ip_address: "",
    // Step 5: Vendor Specific
    api_username: "admin",
    api_password: "",
    customer_auth_method: "pppoe_radius",
    enable_traffic_recording: true,
    enable_speed_control: true,
    blocking_page_url: "",
    latitude: 0,
    longitude: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch router data
        const routerResponse = await fetch(`/api/network/routers/${params.id}`)
        if (routerResponse.ok) {
          const routerData: Router = await routerResponse.json()
          setFormData({
            type: routerData.type || "mikrotik",
            name: routerData.name || "",
            location_id: routerData.location_id?.toString() || "",
            status: routerData.status || "active",
            ip_address: routerData.ip_address || "",
            port: routerData.port?.toString() || "8728",
            ssh_port: routerData.ssh_port?.toString() || "22",
            connection_method: routerData.connection_method || "api",
            username: routerData.username || "admin",
            password: "",
            radius_secret: routerData.radius_secret || "",
            nas_ip_address: routerData.nas_ip_address || "",
            api_username: routerData.api_username || "admin",
            api_password: "",
            customer_auth_method: routerData.customer_auth_method || "pppoe_radius",
            enable_traffic_recording: routerData.enable_traffic_recording ?? true,
            enable_speed_control: routerData.enable_speed_control ?? true,
            blocking_page_url: routerData.blocking_page_url || "",
            latitude: routerData.latitude || 0,
            longitude: routerData.longitude || 0,
          })
        } else {
          toast({ title: "Error", description: "Failed to load router", variant: "destructive" })
          router.push("/network/routers")
        }

        // Fetch locations
        const locationsResponse = await fetch("/api/locations")
        if (locationsResponse.ok) {
          const data = await locationsResponse.json()
          setLocations(Array.isArray(data) ? data : data.locations || [])
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load router data", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, router])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.type !== ""
      case 2:
        return formData.name !== "" && formData.location_id !== ""
      case 3:
        return formData.ip_address !== ""
      case 4:
        return formData.username !== ""
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      console.log("[v0] Submitting router update with formData:", formData)

      const payload = {
        ...formData,
        location_id: Number.parseInt(formData.location_id),
        port: Number.parseInt(formData.port),
        ssh_port: Number.parseInt(formData.ssh_port),
        api_port: Number.parseInt(formData.port),
        radius_nas_ip: formData.nas_ip_address,
        gps_latitude: formData.latitude,
        gps_longitude: formData.longitude,
        mikrotik_user: formData.api_username,
        mikrotik_password: formData.api_password,
        hostname: formData.ip_address,
        connection_method: formData.connection_method,
        customer_auth_method: formData.customer_auth_method,
      }

      console.log("[v0] Sending payload to API:", payload)

      const response = await fetch(`/api/network/routers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({ title: "Success", description: "Router updated successfully" })
        router.push("/network/routers")
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update router",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update router",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getVendorDefaultPorts = (vendor: string) => {
    switch (vendor) {
      case "mikrotik":
        return { port: "8728", ssh_port: "22" }
      case "ubiquiti":
        return { port: "443", ssh_port: "22" }
      case "juniper":
        return { port: "830", ssh_port: "22" }
      default:
        return { port: "22", ssh_port: "22" }
    }
  }

  const handleVendorChange = (vendor: string) => {
    const defaults = getVendorDefaultPorts(vendor)
    setFormData((prev) => ({
      ...prev,
      type: vendor as any,
      port: defaults.port,
      ssh_port: defaults.ssh_port,
      connection_method: vendor === "mikrotik" ? "api" : vendor === "juniper" ? "netconf" : "ssh",
    }))
  }

  const handleTroubleshoot = async () => {
    setIsTroubleshooting(true)
    setTroubleshootResults(null)

    try {
      const response = await fetch(`/api/network/routers/${params.id}/troubleshoot`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Troubleshooting request failed")
      }

      const data = await response.json()
      setTroubleshootResults(data)
    } catch (error) {
      console.error("[v0] Troubleshooting error:", error)
      toast({ title: "Error", description: "Troubleshooting failed", variant: "destructive" })
    } finally {
      setIsTroubleshooting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="w-5 h-5 text-green-500" />
    if (status === "failed") return <AlertCircle className="w-5 h-5 text-red-500" />
    if (status === "running") return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />
  }

  const progress = (currentStep / STEPS.length) * 100

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/network/routers")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Routers
        </Button>
        <h1 className="text-3xl font-bold">Edit Router</h1>
        <p className="text-muted-foreground mt-1">Update multi-vendor network router configuration</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <div className="text-xs font-medium mt-2 text-center max-w-[80px]">{step.title}</div>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${currentStep > step.id ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Vendor Selection */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: "mikrotik", label: "MikroTik", desc: "RouterOS API (Port 8728)" },
                { value: "ubiquiti", label: "Ubiquiti", desc: "EdgeRouter / UniFi" },
                { value: "juniper", label: "Juniper", desc: "JunOS NETCONF" },
              ].map((vendor) => (
                <Card
                  key={vendor.value}
                  className={`cursor-pointer transition-all ${
                    formData.type === vendor.value ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => handleVendorChange(vendor.value)}
                >
                  <CardContent className="p-6 text-center">
                    <RouterIcon className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold text-lg">{vendor.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{vendor.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Router Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Core Router 01"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select
                    value={formData.location_id}
                    onValueChange={(value) => handleInputChange("location_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected Vendor</p>
                <Badge className="mt-2">{formData.type.toUpperCase()}</Badge>
              </div>
            </div>
          )}

          {/* Step 3: Network Configuration */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address *</Label>
                <Input
                  id="ip_address"
                  value={formData.ip_address}
                  onChange={(e) => handleInputChange("ip_address", e.target.value)}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port">
                    {formData.type === "mikrotik"
                      ? "API Port"
                      : formData.type === "juniper"
                        ? "NETCONF Port"
                        : "Management Port"}
                  </Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => handleInputChange("port", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssh_port">SSH Port</Label>
                  <Input
                    id="ssh_port"
                    type="number"
                    value={formData.ssh_port}
                    onChange={(e) => handleInputChange("ssh_port", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="connection_method">Connection Method</Label>
                <Select
                  value={formData.connection_method}
                  onValueChange={(value) => handleInputChange("connection_method", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.type === "mikrotik" && <SelectItem value="api">MikroTik API</SelectItem>}
                    {formData.type === "juniper" && <SelectItem value="netconf">NETCONF</SelectItem>}
                    <SelectItem value="ssh">SSH</SelectItem>
                    <SelectItem value="both">Both API & SSH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Authentication */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Router Credentials
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="Leave empty to keep existing"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  RADIUS Configuration (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="radius_secret">RADIUS Shared Secret</Label>
                    <Input
                      id="radius_secret"
                      type="password"
                      value={formData.radius_secret}
                      onChange={(e) => handleInputChange("radius_secret", e.target.value)}
                      placeholder="Leave empty if not using RADIUS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nas_ip_address">NAS IP Address</Label>
                    <Input
                      id="nas_ip_address"
                      value={formData.nas_ip_address}
                      onChange={(e) => handleInputChange("nas_ip_address", e.target.value)}
                      placeholder={formData.ip_address || "Router IP"}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Configuration */}
          {currentStep === 5 && (
            <div className="space-y-4">
              {formData.type === "mikrotik" && (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Specific Settings</h3>
                    <p className="text-sm text-blue-700">Configure RouterOS features</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_auth_method">Customer Authorization Method</Label>
                    <Select
                      value={formData.customer_auth_method}
                      onValueChange={(value) => handleInputChange("customer_auth_method", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pppoe_radius">PPPoE + RADIUS</SelectItem>
                        <SelectItem value="pppoe_local">PPPoE Local</SelectItem>
                        <SelectItem value="hotspot">Hotspot</SelectItem>
                        <SelectItem value="ipoe">IPoE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enable_traffic_recording">Enable Traffic Recording</Label>
                      <Switch
                        id="enable_traffic_recording"
                        checked={formData.enable_traffic_recording}
                        onCheckedChange={(checked) => handleInputChange("enable_traffic_recording", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enable_speed_control">Enable Speed Control</Label>
                      <Switch
                        id="enable_speed_control"
                        checked={formData.enable_speed_control}
                        onCheckedChange={(checked) => handleInputChange("enable_speed_control", checked)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blocking_page_url">Blocking Page URL</Label>
                    <Input
                      id="blocking_page_url"
                      value={formData.blocking_page_url}
                      onChange={(e) => handleInputChange("blocking_page_url", e.target.value)}
                      placeholder="http://portal.isp.com/blocked"
                    />
                  </div>
                </>
              )}

              {formData.type === "ubiquiti" && (
                <div className="p-4 bg-muted rounded-lg space-y-4">
                  <h3 className="font-semibold">Ubiquiti Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Ubiquiti routers use SSH and RADIUS with WISPr-Bandwidth attributes for speed control.
                  </p>
                  <div className="p-3 bg-background rounded border">
                    <p className="text-xs font-mono">Authentication: RADIUS + SSH</p>
                    <p className="text-xs font-mono">Speed Control: WISPr-Bandwidth-Max-Up/Down</p>
                  </div>
                </div>
              )}

              {formData.type === "juniper" && (
                <div className="p-4 bg-muted rounded-lg space-y-4">
                  <h3 className="font-semibold">Juniper Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Juniper routers use NETCONF and RADIUS with ERX-Qos-Profile attributes.
                  </p>
                  <div className="p-3 bg-background rounded border">
                    <p className="text-xs font-mono">Protocol: NETCONF over SSH (Port 830)</p>
                    <p className="text-xs font-mono">Speed Control: ERX-Qos-Profile</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1 || isSaving}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        {currentStep < STEPS.length ? (
          <Button onClick={handleNext} disabled={isSaving}>
            Next
            <Save className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {formData.type && formData.nas_ip_address && formData.radius_secret && (
        <div className="mt-6">
          <RADIUSConfigGenerator
            vendor={formData.type as "mikrotik" | "ubiquiti" | "juniper"}
            routerName={formData.name || "Router"}
            nasIpAddress={formData.nas_ip_address}
            radiusSecret={formData.radius_secret}
          />
        </div>
      )}

      {/* Connection Troubleshooting Tool */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Connection Troubleshooting
            </CardTitle>
            <CardDescription>Diagnose connectivity issues and verify router configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleTroubleshoot} disabled={isTroubleshooting} className="w-full">
              {isTroubleshooting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Run Diagnostics
                </>
              )}
            </Button>

            {troubleshootResults && (
              <div className="space-y-3 mt-4">
                {troubleshootResults.checks?.map((check: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      check.status === "success"
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                        : check.status === "failed"
                          ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                          : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{check.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                        {check.details && (
                          <pre className="text-xs mt-2 p-2 bg-background rounded border overflow-x-auto">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

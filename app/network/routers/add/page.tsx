"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { MapPicker } from "@/components/ui/map-picker"
import { ArrowLeft, Save, Database, Shield, Settings, MapPin, Activity } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Location {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
}

export default function AddRouterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "mikrotik",
    location_id: "",
    ip_address: "",
    port: "8728",
    ssh_port: "22",
    username: "admin",
    password: "",
    connection_method: "api",
    radius_secret: "",
    nas_ip_address: "",
    api_username: "admin",
    api_password: "",
    enable_traffic_recording: true,
    enable_speed_control: true,
    latitude: 0,
    longitude: 0,
    blocking_page_url: "",
    status: "active",
  })

  // Load locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/locations")
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setLocations(data)
          } else if (data && Array.isArray(data.locations)) {
            setLocations(data.locations)
          } else {
            console.error("Locations API returned unexpected format:", data)
            setLocations([])
          }
        }
      } catch (error) {
        console.error("Error fetching locations:", error)
        setLocations([])
      }
    }
    fetchLocations()
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleLocationChange = (locationId: string) => {
    const location = locations.find((loc) => loc.id.toString() === locationId)
    if (location) {
      setFormData((prev) => ({
        ...prev,
        location_id: locationId,
        latitude: location.latitude,
        longitude: location.longitude,
      }))
    }
  }

  const handleGPSChange = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        ...formData,
        location_id: formData.location_id ? Number.parseInt(formData.location_id) : null,
        port: Number.parseInt(formData.port),
        ssh_port: Number.parseInt(formData.ssh_port),
      }

      console.log("[v0] Submitting router data:", payload)

      const response = await fetch("/api/network/routers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Router created successfully:", data)
        toast({
          title: "Success",
          description: "Router created successfully",
        })
        router.push("/network/routers")
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error || "Failed to create router"
        console.error("[v0] Error response:", errorData)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating router:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create router",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/network/routers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Routers
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add New Router</h1>
            <p className="text-muted-foreground">Configure a new network router</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Creating..." : "Create Router"}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data & Configuration
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="mikrotik" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              MikroTik
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          {/* Basic Configuration */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Router Information</CardTitle>
                <CardDescription>Configure the basic router settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Router Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter router name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Router Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Select value={formData.location_id} onValueChange={handleLocationChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(locations) && locations.length > 0 ? (
                          locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No locations available</div>
                        )}
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ip_address">IP Address</Label>
                    <Input
                      id="ip_address"
                      value={formData.ip_address}
                      onChange={(e) => handleInputChange("ip_address", e.target.value)}
                      placeholder="192.168.1.1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">API Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => handleInputChange("port", e.target.value)}
                      placeholder="8728"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ssh_port">SSH Port</Label>
                    <Input
                      id="ssh_port"
                      type="number"
                      value={formData.ssh_port}
                      onChange={(e) => handleInputChange("ssh_port", e.target.value)}
                      placeholder="22"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Configuration */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Configuration</CardTitle>
                <CardDescription>Configure authentication and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      placeholder="admin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      placeholder="Enter password"
                      required
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
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="ssh">SSH</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="radius_secret">RADIUS Secret</Label>
                    <Input
                      id="radius_secret"
                      value={formData.radius_secret}
                      onChange={(e) => handleInputChange("radius_secret", e.target.value)}
                      placeholder="Enter RADIUS secret"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nas_ip_address">NAS IP Address</Label>
                    <Input
                      id="nas_ip_address"
                      value={formData.nas_ip_address}
                      onChange={(e) => handleInputChange("nas_ip_address", e.target.value)}
                      placeholder="192.168.1.1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MikroTik Configuration */}
          <TabsContent value="mikrotik">
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
                      value={formData.api_username}
                      onChange={(e) => handleInputChange("api_username", e.target.value)}
                      placeholder="admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api_password">API Password</Label>
                    <Input
                      id="api_password"
                      type="password"
                      value={formData.api_password}
                      onChange={(e) => handleInputChange("api_password", e.target.value)}
                      placeholder="Enter API password"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Traffic Recording</Label>
                      <p className="text-sm text-muted-foreground">Record traffic data for monitoring</p>
                    </div>
                    <Switch
                      checked={formData.enable_traffic_recording}
                      onCheckedChange={(checked) => handleInputChange("enable_traffic_recording", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Speed Control</Label>
                      <p className="text-sm text-muted-foreground">Enable bandwidth management</p>
                    </div>
                    <Switch
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
                    placeholder="http://example.com/blocked"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Configuration */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle>GPS Location</CardTitle>
                <CardDescription>Set the precise GPS coordinates for this router</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange("latitude", Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange("longitude", Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Interactive Map</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <MapPicker
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onLocationChange={handleGPSChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Configuration */}
          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <CardTitle>Monitoring & Alerts</CardTitle>
                <CardDescription>Configure monitoring and alerting settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Monitoring configuration will be available after router creation</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}

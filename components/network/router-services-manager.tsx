"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Settings, CheckCircle, XCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RouterService {
  id: number
  router_id: number
  service_type: string
  is_enabled: boolean
  configuration: any
  created_at: string
}

interface ServiceStats {
  value: string
  label: string
  description: string
  router_count: number
  enabled_count: number
  disabled_count: number
  router_names: string[]
}

interface RouterServicesManagerProps {
  routerId?: number
  routerName?: string
}

const SERVICE_DESCRIPTIONS = {
  pppoe: "Enables PPPoE server for dial-up connections. Commonly used for DSL and fiber connections.",
  dhcp: "Provides automatic IP address assignment to connected devices. Essential for most networks.",
  hotspot: "Creates a captive portal for guest access with authentication and bandwidth control.",
  static_ip: "Allows manual assignment of IP addresses to specific devices or customers.",
  radius: "Integrates with RADIUS servers for centralized authentication and accounting.",
}

export function RouterServicesManager({ routerId, routerName }: RouterServicesManagerProps) {
  const [services, setServices] = useState<RouterService[]>([])
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [routerId])

  const fetchData = async () => {
    try {
      if (routerId) {
        // Fetch services for specific router
        const response = await fetch(`/api/network/routers/${routerId}/services`)
        if (response.ok) {
          const data = await response.json()
          setServices(data)
        }
      } else {
        // Fetch service statistics for all routers
        const response = await fetch("/api/network/services")
        if (response.ok) {
          const data = await response.json()
          setServiceStats(data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch services:", error)
      toast({
        title: "Error",
        description: "Failed to fetch services",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleService = async (serviceType: string, enabled: boolean) => {
    if (!routerId) return

    setUpdating(serviceType)
    try {
      const response = await fetch(`/api/network/routers/${routerId}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceType,
          is_enabled: enabled,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${serviceType.toUpperCase()} service ${enabled ? "enabled" : "disabled"}`,
        })
        fetchData()
      } else {
        throw new Error("Failed to update service")
      }
    } catch (error) {
      console.error("Failed to update service:", error)
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      })
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <div>Loading services...</div>
  }

  if (routerId) {
    // Router-specific services view
    const allServiceTypes = ["pppoe", "dhcp", "hotspot", "static_ip", "radius"]

    return (
      <Card>
        <CardHeader>
          <CardTitle>Router Services</CardTitle>
          <CardDescription>Configure services for {routerName || `Router ${routerId}`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {allServiceTypes.map((serviceType) => {
            const service = services.find((s) => s.service_type === serviceType)
            const isEnabled = service?.is_enabled || false
            const isUpdating = updating === serviceType

            return (
              <div key={serviceType} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium capitalize">{serviceType.replace("_", " ")}</h4>
                    <Badge variant={isEnabled ? "default" : "secondary"}>{isEnabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {SERVICE_DESCRIPTIONS[serviceType as keyof typeof SERVICE_DESCRIPTIONS]}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={serviceType}
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleService(serviceType, checked)}
                      disabled={isUpdating}
                    />
                    <Label htmlFor={serviceType} className="sr-only">
                      Toggle {serviceType}
                    </Label>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configure {serviceType.toUpperCase()}</DialogTitle>
                        <DialogDescription>Advanced configuration options for {serviceType} service</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Service configuration will be available in a future update. Currently, you can
                            enable/disable services.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  // Global services overview
  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Services Overview</CardTitle>
        <CardDescription>Overview of services across all routers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serviceStats.map((service) => (
          <div key={service.value} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{service.label}</h4>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium">{service.router_count} routers</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {service.enabled_count} enabled
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-600" />
                      {service.disabled_count} disabled
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {service.router_names.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {service.router_names.slice(0, 5).map((name, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
                {service.router_names.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{service.router_names.length - 5} more
                  </Badge>
                )}
              </div>
            )}
            <Separator />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

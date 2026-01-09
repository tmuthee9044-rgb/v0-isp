"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Radio, Wifi, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Router {
  id: number
  name: string
  vendor: string
  load_percentage: number
  load_status: string
  supports_radius: boolean
  supports_direct_push: boolean
  capabilities: {
    supportedAuthMethods: string[]
    supportedEnforcementModes: string[]
    recommendedMode: string
  }
}

interface RouterSelectionModalProps {
  open: boolean
  onClose: () => void
  locationId: number
  onSelect: (selection: {
    routerId: number
    authMethod: string
    enforcementMode: string
  }) => void
}

export function RouterSelectionModal({ open, onClose, locationId, onSelect }: RouterSelectionModalProps) {
  const [routers, setRouters] = useState<Router[]>([])
  const [selectedRouter, setSelectedRouter] = useState<Router | null>(null)
  const [authMethod, setAuthMethod] = useState<string>("pppoe")
  const [enforcementMode, setEnforcementMode] = useState<string>("radius")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && locationId) {
      fetchRouters()
    }
  }, [open, locationId])

  const fetchRouters = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customer-services/routers?location_id=${locationId}`)
      const data = await response.json()
      setRouters(data.routers || [])
    } catch (error) {
      console.error("Error fetching routers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRouterSelect = (router: Router) => {
    setSelectedRouter(router)
    setEnforcementMode(router.capabilities.recommendedMode)
  }

  const handleSubmit = () => {
    if (selectedRouter) {
      onSelect({
        routerId: selectedRouter.id,
        authMethod,
        enforcementMode,
      })
      onClose()
    }
  }

  const getLoadColor = (status: string) => {
    switch (status) {
      case "high":
        return "text-red-500"
      case "medium":
        return "text-yellow-500"
      default:
        return "text-green-500"
    }
  }

  const getEnforcementModeIcon = (mode: string) => {
    switch (mode) {
      case "radius":
        return <Radio className="h-4 w-4" />
      case "direct":
        return <Wifi className="h-4 w-4" />
      case "hybrid":
        return <Lock className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Router Selection</DialogTitle>
          <DialogDescription>
            Select router, authentication method, and enforcement mode for this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Router Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Step 1: Select Router</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading routers...</div>
            ) : routers.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active routers found for this location. Please add a router first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3">
                {routers.map((router) => (
                  <div
                    key={router.id}
                    onClick={() => handleRouterSelect(router)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRouter?.id === router.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{router.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {router.vendor.toUpperCase()} • RADIUS {router.supports_radius ? "✓" : "✗"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getLoadColor(router.load_status)}`}>
                            {router.load_percentage}%
                          </div>
                          <div className="text-xs text-muted-foreground">Load</div>
                        </div>
                        {selectedRouter?.id === router.id && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Authentication Method */}
          {selectedRouter && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Step 2: Authentication Method</Label>
              <RadioGroup value={authMethod} onValueChange={setAuthMethod}>
                {selectedRouter.capabilities.supportedAuthMethods.map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <RadioGroupItem value={method} id={method} />
                    <Label htmlFor={method} className="font-normal capitalize cursor-pointer">
                      {method.replace("-", " ")}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 3: Enforcement Mode */}
          {selectedRouter && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Step 3: Enforcement Mode</Label>
              <RadioGroup value={enforcementMode} onValueChange={setEnforcementMode}>
                {selectedRouter.capabilities.supportedEnforcementModes.map((mode) => (
                  <div key={mode} className="flex items-center space-x-2">
                    <RadioGroupItem value={mode} id={mode} />
                    <Label htmlFor={mode} className="font-normal capitalize cursor-pointer flex items-center gap-2">
                      {getEnforcementModeIcon(mode)}
                      {mode}
                      {mode === "radius" && (
                        <Badge variant="outline" className="ml-2">
                          Recommended
                        </Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {enforcementMode === "radius" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>RADIUS Mode (Recommended)</strong>: All authentication handled by FreeRADIUS. No direct
                    router writes. Best performance and security.
                  </AlertDescription>
                </Alert>
              )}

              {enforcementMode === "direct" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Direct Mode</strong>: Credentials written directly to router. Use only when RADIUS is not
                    available. May impact router performance.
                  </AlertDescription>
                </Alert>
              )}

              {enforcementMode === "hybrid" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Hybrid Mode</strong>: RADIUS authentication with direct router sync. Provides redundancy but
                    increases complexity.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedRouter}>
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

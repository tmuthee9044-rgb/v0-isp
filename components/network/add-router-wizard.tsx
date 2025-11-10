"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Router,
  Network,
  Settings,
  CheckCircle,
  XCircle,
  TestTube,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Location {
  id: number
  name: string
  address: string
  city: string
}

interface SubnetData {
  cidr: string
  description: string
}

interface RouterFormData {
  // Step 1: Location
  location_id: number | null

  // Step 2: Router Details
  name: string
  type: string
  model: string
  serial: string
  notes: string

  // Step 3: Connection Details
  ip_address: string
  port: number
  username: string
  password: string
  connection_method: string

  // Step 4: IP Subnets
  subnets: SubnetData[]

  // Step 5: Services
  services: string[]
}

const ROUTER_TYPES = [
  { value: "mikrotik", label: "MikroTik" },
  { value: "ubiquiti", label: "Ubiquiti" },
  { value: "cisco", label: "Cisco" },
  { value: "other", label: "Other" },
]

const CONNECTION_METHODS = [
  { value: "public_ip", label: "Public IP" },
  { value: "private_ip", label: "Private IP via VPN" },
  { value: "openvpn", label: "OpenVPN Tunnel" },
]

const ROUTER_SERVICES = [
  { value: "pppoe", label: "PPPoE" },
  { value: "dhcp", label: "DHCP" },
  { value: "hotspot", label: "Hotspot" },
  { value: "static_ip", label: "Static IP Assignment" },
  { value: "radius", label: "RADIUS Authentication" },
]

interface AddRouterWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddRouterWizard({ open, onOpenChange, onSuccess }: AddRouterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [locations, setLocations] = useState<Location[]>([])
  const [formData, setFormData] = useState<RouterFormData>({
    location_id: null,
    name: "",
    type: "",
    model: "",
    serial: "",
    notes: "",
    ip_address: "",
    port: 8728,
    username: "",
    password: "",
    connection_method: "public_ip",
    subnets: [],
    services: [],
  })
  const [connectionTest, setConnectionTest] = useState<{
    testing: boolean
    result: { success: boolean; message: string } | null
  }>({ testing: false, result: null })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const totalSteps = 6
  const progress = (currentStep / totalSteps) * 100

  useEffect(() => {
    if (open) {
      fetchLocations()
    }
  }, [open])

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/network/locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error)
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive",
      })
    }
  }

  const updateFormData = (updates: Partial<RouterFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const testConnection = async () => {
    if (!formData.ip_address || !formData.username || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in IP address, username, and password first",
        variant: "destructive",
      })
      return
    }

    setConnectionTest({ testing: true, result: null })

    try {
      // Create a temporary router object for testing
      const testData = {
        ip_address: formData.ip_address,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        type: formData.type,
        connection_method: formData.connection_method,
      }

      const response = await fetch("/api/network/routers/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      })

      const result = await response.json()
      setConnectionTest({ testing: false, result })

      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Connection test failed:", error)
      setConnectionTest({
        testing: false,
        result: { success: false, message: "Connection test failed" },
      })
      toast({
        title: "Error",
        description: "Connection test failed",
        variant: "destructive",
      })
    }
  }

  const validateSubnet = async (cidr: string) => {
    try {
      const response = await fetch("/api/network/routers/validate-subnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidr }),
      })
      return await response.json()
    } catch (error) {
      return { valid: false, message: "Validation failed" }
    }
  }

  const addSubnet = async () => {
    const cidr = (document.getElementById("new-subnet-cidr") as HTMLInputElement)?.value
    const description = (document.getElementById("new-subnet-description") as HTMLInputElement)?.value

    if (!cidr) {
      toast({
        title: "Missing CIDR",
        description: "Please enter a CIDR notation",
        variant: "destructive",
      })
      return
    }

    const validation = await validateSubnet(cidr)
    if (!validation.valid) {
      toast({
        title: "Invalid CIDR",
        description: validation.message,
        variant: "destructive",
      })
      return
    }

    const newSubnet = { cidr, description: description || "" }
    updateFormData({ subnets: [...formData.subnets, newSubnet] })

    // Clear inputs
    ;(document.getElementById("new-subnet-cidr") as HTMLInputElement).value = ""
    ;(document.getElementById("new-subnet-description") as HTMLInputElement).value = ""
  }

  const removeSubnet = (index: number) => {
    const updatedSubnets = formData.subnets.filter((_, i) => i !== index)
    updateFormData({ subnets: updatedSubnets })
  }

  const handleServiceToggle = (service: string, checked: boolean) => {
    const updatedServices = checked ? [...formData.services, service] : formData.services.filter((s) => s !== service)
    updateFormData({ services: updatedServices })
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return formData.location_id !== null
      case 2:
        return formData.name && formData.type
      case 3:
        return formData.ip_address && formData.username && formData.password
      case 4:
        return true // Subnets are optional
      case 5:
        return true // Services are optional
      case 6:
        return connectionTest.result?.success === true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceedToNext()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!connectionTest.result?.success) {
      toast({
        title: "Connection Test Required",
        description: "Please test the connection successfully before saving",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/network/routers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Router added successfully",
        })
        onSuccess()
        onOpenChange(false)
        // Reset form
        setCurrentStep(1)
        setFormData({
          location_id: null,
          name: "",
          type: "",
          model: "",
          serial: "",
          notes: "",
          ip_address: "",
          port: 8728,
          username: "",
          password: "",
          connection_method: "public_ip",
          subnets: [],
          services: [],
        })
        setConnectionTest({ testing: false, result: null })
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to add router")
      }
    } catch (error) {
      console.error("Failed to add router:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add router",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Select Location</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location_id?.toString() || ""}
                onValueChange={(value) => updateFormData({ location_id: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">{location.city}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Each location can have multiple routers</p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Router className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Router Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Router Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Main Router"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Router Type *</Label>
                <Select value={formData.type} onValueChange={(value) => updateFormData({ type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select router type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Router Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => updateFormData({ model: e.target.value })}
                  placeholder="RB4011iGS+"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial">Serial Number</Label>
                <Input
                  id="serial"
                  value={formData.serial}
                  onChange={(e) => updateFormData({ serial: e.target.value })}
                  placeholder="ABC123456789"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes/Description</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateFormData({ notes: e.target.value })}
                placeholder="Additional notes about this router..."
                rows={3}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Network className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Connection Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP/Domain *</Label>
                <Input
                  id="ip_address"
                  value={formData.ip_address}
                  onChange={(e) => updateFormData({ ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => updateFormData({ port: Number.parseInt(e.target.value) || 8728 })}
                  placeholder="8728"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => updateFormData({ username: e.target.value })}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password/API Token *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateFormData({ password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="connection_method">Connection Method</Label>
              <Select
                value={formData.connection_method}
                onValueChange={(value) => updateFormData({ connection_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4">
              <Button
                onClick={testConnection}
                disabled={connectionTest.testing || !formData.ip_address || !formData.username || !formData.password}
                className="w-full"
              >
                {connectionTest.testing ? (
                  <>
                    <TestTube className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              {connectionTest.result && (
                <Alert
                  className={`mt-4 ${connectionTest.result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                >
                  <div className="flex items-center gap-2">
                    {connectionTest.result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={connectionTest.result.success ? "text-green-800" : "text-red-800"}>
                      {connectionTest.result.message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Network className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Assign IP Subnets</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="new-subnet-cidr">CIDR Notation</Label>
                  <Input id="new-subnet-cidr" placeholder="192.168.1.0/24" />
                </div>
                <div>
                  <Label htmlFor="new-subnet-description">Description</Label>
                  <Input id="new-subnet-description" placeholder="Main LAN" />
                </div>
              </div>
              <Button onClick={addSubnet} variant="outline" className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Add Subnet
              </Button>
            </div>

            {formData.subnets.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Added Subnets</h4>
                {formData.subnets.map((subnet, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{subnet.cidr}</div>
                      {subnet.description && <div className="text-sm text-muted-foreground">{subnet.description}</div>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removeSubnet(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Services & Configurations</h3>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select the services this router will provide:</p>
              {ROUTER_SERVICES.map((service) => (
                <div key={service.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.value}
                    checked={formData.services.includes(service.value)}
                    onCheckedChange={(checked) => handleServiceToggle(service.value, checked as boolean)}
                  />
                  <Label
                    htmlFor={service.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {service.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Save & Verify</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Router Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Name:</strong> {formData.name}
                  </div>
                  <div>
                    <strong>Type:</strong> {formData.type}
                  </div>
                  <div>
                    <strong>IP Address:</strong> {formData.ip_address}
                  </div>
                  <div>
                    <strong>Port:</strong> {formData.port}
                  </div>
                  <div>
                    <strong>Connection:</strong> {formData.connection_method}
                  </div>
                  <div>
                    <strong>Subnets:</strong> {formData.subnets.length}
                  </div>
                  <div>
                    <strong>Services:</strong> {formData.services.length}
                  </div>
                </div>
              </div>

              {!connectionTest.result?.success && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connection test is required before saving. Please go back to Step 3 and test the connection.
                  </AlertDescription>
                </Alert>
              )}

              {connectionTest.result?.success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Connection test passed. Router is ready to be saved.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Router</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {totalSteps}: Complete the router setup process
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          <Separator />

          {renderStepContent()}

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceedToNext()}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!connectionTest.result?.success || isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Router"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

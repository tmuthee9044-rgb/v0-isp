"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { addCustomerService, updateCustomerService } from "@/app/actions/customer-service-actions"
import { Wifi, Globe, Zap, Clock, CheckCircle, Plus, Network, Shield, Edit, AlertTriangle } from "lucide-react"

interface AddServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  customerData: {
    name: string
    email: string
    phone: string
    portal_username: string
    city?: string
    physical_city?: string
  }
  selectedLocation?: string
  editMode?: boolean
  editingService?: any
}

interface IPPool {
  id: number
  ip_address: string
  subnet_id: number
  status: string
  customer_id?: number
  version?: string
  router_name?: string
}

interface InventoryItem {
  id: number
  name: string
  sku: string
  category: string
  stock_quantity: number
  unit_cost: number
}

export default function AddServiceModal({
  open,
  onOpenChange,
  customerId,
  customerData,
  selectedLocation,
  editMode = false,
  editingService,
}: AddServiceModalProps) {
  const [selectedPlan, setSelectedPlan] = useState("")
  const [connectionType, setConnectionType] = useState("")
  const [autoRenew, setAutoRenew] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [servicePlans, setServicePlans] = useState<any[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [validationError, setValidationError] = useState("")

  const [ipPools, setIpPools] = useState<IPPool[]>([])
  const [selectedIpAddress, setSelectedIpAddress] = useState("")
  const [macAddress, setMacAddress] = useState("")
  const [lockToMac, setLockToMac] = useState(false)
  const [pppoeEnabled, setPppoeEnabled] = useState(false)
  const [pppoeUsername, setPppoeUsername] = useState("")
  const [pppoePassword, setPppoePassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [currentTab, setCurrentTab] = useState("plans")
  const [adminOverride, setAdminOverride] = useState(false)
  const [customerAccountNumber, setCustomerAccountNumber] = useState("")

  const fetchServicePlans = async () => {
    try {
      setLoadingPlans(true)
      const response = await fetch("/api/service-plans")
      const data = await response.json()

      if (data.success && data.plans && Array.isArray(data.plans)) {
        if (data.plans.length === 0) {
          setServicePlans([])
          setLoadingPlans(false)
          setValidationError("No service plans available. Please create service plans at /services first.")
          return
        }

        const transformedPlans = data.plans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          price: Number(plan.price),
          description: plan.description,
          speed_down: plan.speed ? Number.parseInt(plan.speed.split("/")[0]) : plan.download_speed || 0,
          speed_up: plan.speed ? Number.parseInt(plan.speed.split("/")[1]) : plan.upload_speed || 0,
          data_limit: plan.dataLimit || plan.data_limit,
          features:
            plan.features && plan.features.length > 0
              ? plan.features
              : [
                  "24/7 Support",
                  "Email & Web Browsing",
                  plan.category === "business" ? "Business Grade" : "Residential Service",
                ],
          popular: plan.category === "residential" && plan.price >= 4000 && plan.price <= 6000,
        }))
        setServicePlans(transformedPlans)
      } else {
        console.error("Failed to fetch service plans:", data.error || "Invalid data format")
        setServicePlans([])
      }
    } catch (error) {
      console.error("Error fetching service plans:", error)
      setServicePlans([])
    } finally {
      setLoadingPlans(false)
    }
  }

  const fetchIpPools = async () => {
    try {
      let endpoint = "/api/network/ip-addresses?status=available"

      // Get customer location from customerData or fetch it
      const customerLocation = customerData?.city || customerData?.physical_city

      if (customerLocation) {
        console.log("[v0] Fetching IPs for location:", customerLocation)
        endpoint = `/api/network/ip-addresses/by-location?location=${encodeURIComponent(customerLocation)}`
      }

      const response = await fetch(endpoint)
      const data = await response.json()

      if (data.success && Array.isArray(data.addresses)) {
        const availableIps = data.addresses.filter(
          (ip: IPPool) => ip.status === "available" && !ip.customer_id && ip.ip_address !== selectedIpAddress,
        )
        console.log(`[v0] Available IP addresses in ${customerLocation || "all locations"}:`, availableIps.length)
        setIpPools(availableIps)
      } else if (Array.isArray(data)) {
        const availableIps = data.filter(
          (ip: IPPool) => ip.status === "available" && !ip.customer_id && ip.ip_address !== selectedIpAddress,
        )
        console.log("[v0] Available IP addresses from ip_addresses table:", availableIps.length)
        setIpPools(availableIps)
      } else {
        console.error("Unexpected response format:", data)
        setIpPools([])
      }
    } catch (error) {
      console.error("Error fetching IP addresses:", error)
      setIpPools([])
    }
  }

  const generatePppoeCredentials = () => {
    if (customerAccountNumber) {
      setPppoeUsername(customerAccountNumber)

      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      const lowercase = "abcdefghijklmnopqrstuvwxyz"
      const numbers = "0123456789"
      const allChars = uppercase + lowercase + numbers

      let password = ""
      password += uppercase[Math.floor(Math.random() * uppercase.length)]
      password += lowercase[Math.floor(Math.random() * lowercase.length)]
      password += numbers[Math.floor(Math.random() * numbers.length)]

      for (let i = 3; i < 12; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
      }

      password = password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("")
      setPppoePassword(password)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    event.stopPropagation() // Prevent event bubbling to avoid double submission

    console.log("[v0] === handleSubmit START ===")
    console.log("[v0] isLoading:", isLoading)
    console.log("[v0] Timestamp:", new Date().toISOString())

    if (isLoading) {
      console.log("[v0] Already loading, preventing duplicate submission")
      return
    }

    if (!selectedPlan) {
      setValidationError("Please select a service plan")
      return
    }

    if (!connectionType) {
      setValidationError("Please select a connection type")
      return
    }

    setIsLoading(true)
    setValidationError("")

    try {
      const formData = new FormData()
      formData.append("customerId", customerId.toString())
      formData.append("servicePlanId", selectedPlan)
      formData.append("connectionType", connectionType)
      if (selectedLocation) {
        formData.append("locationId", selectedLocation)
      }
      formData.append("autoRenew", autoRenew ? "true" : "false")
      formData.append("adminOverride", adminOverride ? "true" : "false")

      if (selectedIpAddress) formData.append("ipAddress", selectedIpAddress)
      if (macAddress) {
        formData.append("macAddress", macAddress)
        formData.append("deviceId", macAddress) // Legacy field
      }
      formData.append("lockToMac", lockToMac ? "true" : "false")
      formData.append("pppoeEnabled", pppoeEnabled ? "true" : "false")
      if (pppoeEnabled) {
        formData.append("pppoeUsername", pppoeUsername)
        formData.append("pppoePassword", pppoePassword)
      }

      console.log("[v0] Calling addCustomerService/updateCustomerService...")
      console.log("[v0] Edit mode:", editMode)

      const result =
        editMode && editingService
          ? await updateCustomerService(editingService.id, formData)
          : await addCustomerService(customerId, formData)

      console.log("[v0] Result:", result)

      if (result.success) {
        setIsLoading(false)

        console.log("[v0] Service saved successfully, closing modal...")
        onOpenChange(false)

        setSelectedPlan("")
        setConnectionType("")
        setSelectedIpAddress("")
        setMacAddress("")
        setLockToMac(false)
        setPppoeEnabled(false)
        setPppoeUsername("")
        setPppoePassword("")
        setCurrentTab("plans")
        setAdminOverride(false)

        setTimeout(() => {
          console.log("[v0] Dispatching serviceAdded event")
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("serviceAdded", { detail: { customerId } }))
          }
        }, 300)
      } else {
        console.log("[v0] Failed to save service:", result.error)
        setValidationError(result.error || "Failed to add service")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error processing service:", error)
      setValidationError(error instanceof Error ? error.message : "Unknown error occurred")
      setIsLoading(false)
    }

    console.log("[v0] === handleSubmit END ===")
  }

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`)
        if (response.ok) {
          const data = await response.json()
          setCustomerAccountNumber(data.account_number || "")
        }
      } catch (error) {
        console.error("Error fetching customer details:", error)
      }
    }

    fetchCustomerDetails()
    fetchServicePlans()
    fetchIpPools()
  }, [customerId])

  useEffect(() => {
    console.log("[v0] Edit modal useEffect triggered")
    console.log("[v0] editMode:", editMode)
    console.log("[v0] editingService:", JSON.stringify(editingService, null, 2))

    if (editMode && editingService) {
      console.log("[v0] Populating edit form with service data:")
      console.log("[v0] - servicePlanId:", editingService.service_plan_id)
      console.log("[v0] - connectionType:", editingService.connection_type)
      console.log("[v0] - ipAddress:", editingService.ip_address)
      console.log("[v0] - deviceId:", editingService.device_id)
      console.log("[v0] - lockToMac:", editingService.lock_to_mac)
      console.log("[v0] - pppoeUsername:", editingService.pppoe_username)
      console.log("[v0] - pppoePassword:", editingService.pppoe_password ? "***" : "(empty)")
      console.log("[v0] - autoRenew:", editingService.auto_renew)

      setSelectedPlan(editingService.service_plan_id?.toString() || "")
      setConnectionType(editingService.connection_type || "")
      setSelectedIpAddress(editingService.ip_address || "")
      setMacAddress(editingService.device_id || "")
      setLockToMac(editingService.lock_to_mac || false)
      setPppoeEnabled(!!editingService.pppoe_username)
      setPppoeUsername(editingService.pppoe_username || "")
      setPppoePassword(editingService.pppoe_password || "")
      setAutoRenew(editingService.auto_renew !== false)
      setCurrentTab("plans")

      console.log("[v0] Form fields populated successfully")
    }
  }, [editMode, editingService])

  useEffect(() => {
    if (pppoeEnabled && !pppoeUsername && customerAccountNumber) {
      generatePppoeCredentials()
    }
  }, [pppoeEnabled, customerAccountNumber])

  useEffect(() => {
    if (selectedIpAddress && selectedIpAddress !== "auto") {
      fetchIpPools()
    }
  }, [selectedIpAddress])

  const connectionTypes = [
    { value: "fiber", label: "Fiber Optic", icon: Zap, description: "High-speed fiber connection" },
    { value: "wireless", label: "Wireless", icon: Wifi, description: "Wireless radio connection" },
    { value: "cable", label: "Cable", icon: Globe, description: "Cable internet connection" },
  ]

  const selectedPlanData = servicePlans.find((plan) => plan.id === Number.parseInt(selectedPlan))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? `Edit Service for ${customerData.name}` : `Add Service for ${customerData.name}`}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update the internet service configuration"
              : "Configure a new internet service for this customer"}
          </DialogDescription>
        </DialogHeader>

        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{validationError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="plans">Service Plans</TabsTrigger>
              <TabsTrigger value="configuration">Network Config</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-4">
              {loadingPlans ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading service plans...</p>
                </div>
              ) : servicePlans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No service plans available. Please contact administrator.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {servicePlans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer transition-all ${
                        selectedPlan === plan.id.toString() ? "ring-2 ring-primary border-primary" : "hover:shadow-md"
                      } ${plan.popular ? "border-primary" : ""}`}
                      onClick={() => setSelectedPlan(plan.id.toString())}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          {plan.popular && <Badge>Most Popular</Badge>}
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold">KSh {plan.price.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">per month</div>
                          </div>
                          <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-semibold">{plan.speed_down} Mbps</div>
                              <div className="text-muted-foreground">Download</div>
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="text-center">
                              <div className="font-semibold">{plan.speed_up} Mbps</div>
                              <div className="text-muted-foreground">Upload</div>
                            </div>
                          </div>
                          <ul className="space-y-1 text-sm">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="configuration" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5" />
                      Connection Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Connection Type</Label>
                      <RadioGroup value={connectionType} onValueChange={setConnectionType}>
                        {connectionTypes.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={type.value} id={type.value} />
                            <Label htmlFor={type.value} className="flex items-center gap-2 cursor-pointer">
                              <type.icon className="w-4 h-4" />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-sm text-muted-foreground">{type.description}</div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="auto-renew"
                        checked={autoRenew}
                        onCheckedChange={(checked) => setAutoRenew(checked as boolean)}
                      />
                      <Label htmlFor="auto-renew">Enable automatic renewal</Label>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="admin-override"
                          checked={adminOverride}
                          onCheckedChange={(checked) => setAdminOverride(checked as boolean)}
                        />
                        <Label htmlFor="admin-override" className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Admin Override - Activate without payment
                        </Label>
                      </div>
                      {adminOverride && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-sm text-amber-800">
                            <strong>Warning:</strong> This will activate the service immediately without payment. If no
                            payment is received by midnight, the service will be automatically suspended.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      IP Address Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="ip-address">IP Address</Label>
                      <Select value={selectedIpAddress} onValueChange={setSelectedIpAddress}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select IP address from pool" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-assign from customer location</SelectItem>
                          {ipPools.map((pool) => (
                            <SelectItem key={pool.id} value={pool.ip_address}>
                              <div className="flex items-center justify-between w-full">
                                <span>{pool.ip_address}</span>
                                <div className="flex gap-1">
                                  {pool.router_name && (
                                    <Badge variant="outline" className="ml-2">
                                      {pool.router_name}
                                    </Badge>
                                  )}
                                  {pool.version && (
                                    <Badge variant="outline" className="ml-2">
                                      {pool.version}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="ml-2">
                                    {pool.status}
                                  </Badge>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ipPools.length} IP addresses available
                        {customerData?.city && ` in ${customerData.city}`}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="mac-address">MAC Address</Label>
                      <Input
                        id="mac-address"
                        value={macAddress}
                        onChange={(e) => setMacAddress(e.target.value)}
                        placeholder="00:11:22:33:44:55"
                        pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="lock-to-mac"
                        checked={lockToMac}
                        onCheckedChange={(checked) => setLockToMac(checked as boolean)}
                      />
                      <Label htmlFor="lock-to-mac">Lock service to MAC address</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    PPPoE Configuration
                  </CardTitle>
                  <CardDescription>Point-to-Point Protocol over Ethernet for authenticated connections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pppoe-enabled"
                      checked={pppoeEnabled}
                      onCheckedChange={(checked) => setPppoeEnabled(checked as boolean)}
                    />
                    <Label htmlFor="pppoe-enabled">Enable PPPoE Authentication</Label>
                  </div>

                  {pppoeEnabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="pppoeUsername">PPPoE Username</Label>
                        <Input
                          id="pppoeUsername"
                          value={pppoeUsername}
                          onChange={(e) => setPppoeUsername(e.target.value)}
                          placeholder="Account number or username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pppoePassword">PPPoE Password</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="pppoePassword"
                              type={showPassword ? "text" : "password"}
                              value={pppoePassword}
                              onChange={(e) => setPppoePassword(e.target.value)}
                              placeholder="Enter secure password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </Button>
                          </div>
                          <Button type="button" variant="outline" onClick={generatePppoeCredentials} size="sm">
                            Generate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Click Generate for a secure password</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Service Configuration Summary</CardTitle>
                  <CardDescription>Review the service configuration before adding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPlanData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium">Service Plan</h4>
                        <div className="p-3 border rounded-lg">
                          <div className="font-medium">{selectedPlanData.name}</div>
                          <div className="text-sm text-muted-foreground">{selectedPlanData.description}</div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {selectedPlanData.speed_down}Mbps / {selectedPlanData.speed_up}Mbps
                          </div>
                          <div className="text-lg font-semibold mt-2">
                            KSh {selectedPlanData.price.toLocaleString()}/month
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Configuration</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Connection Type:</span>
                            <span className="capitalize">{connectionType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Auto Renew:</span>
                            <span>{autoRenew ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Admin Override:</span>
                            <span className={adminOverride ? "text-amber-600 font-medium" : ""}>
                              {adminOverride ? "Yes - Immediate Activation" : "No"}
                            </span>
                          </div>
                          {selectedIpAddress && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">IP Address:</span>
                              <span>{selectedIpAddress}</span>
                            </div>
                          )}
                          {macAddress && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">MAC Address:</span>
                              <span>{macAddress}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">MAC Locked:</span>
                            <span>{lockToMac ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">PPPoE Enabled:</span>
                            <span>{pppoeEnabled ? "Yes" : "No"}</span>
                          </div>
                          {pppoeEnabled && pppoeUsername && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">PPPoE Username:</span>
                              <span>{pppoeUsername}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {adminOverride && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800">Admin Override Active</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Service will be activated immediately without payment. A midnight check will suspend the
                            service if no payment is received by end of day.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={!selectedPlan || !connectionType || isLoading} size="lg">
                      {isLoading ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          {editMode ? "Updating Service..." : "Adding Service..."}
                        </>
                      ) : (
                        <>
                          {editMode ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          {editMode ? "Update Service" : adminOverride ? "Activate Service Now" : "Add Service"}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  )
}

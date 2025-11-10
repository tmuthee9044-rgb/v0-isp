"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, RefreshCw } from "lucide-react"

interface AddServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  customerName: string
  accountNumber: string
}

interface ServicePlan {
  id: number
  name: string
  price: number
}

interface AvailableIP {
  id: number
  ip_address: string
  subnet_id: number
}

export function AddServiceModal({ open, onOpenChange, customerId, customerName, accountNumber }: AddServiceModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [availableIPs, setAvailableIPs] = useState<AvailableIP[]>([])
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [selectedPlan, setSelectedPlan] = useState("")
  const [connectionType, setConnectionType] = useState("")
  const [pppoeUsername, setPppoeUsername] = useState("")
  const [pppoePassword, setPppoePassword] = useState("")
  const [selectedIP, setSelectedIP] = useState("")

  useEffect(() => {
    if (customerName && accountNumber) {
      const cleanName = customerName.toLowerCase().replace(/\s+/g, "")
      const suggestedUsername = `${cleanName}-${accountNumber}`
      setPppoeUsername(suggestedUsername)
    }
  }, [customerName, accountNumber])

  // Fetch service plans and available IPs
  useEffect(() => {
    if (open) {
      fetchServicePlans()
      fetchAvailableIPs()
    }
  }, [open])

  const fetchServicePlans = async () => {
    try {
      const response = await fetch("/api/service-plans")
      const data = await response.json()
      setServicePlans(data)
    } catch (error) {
      console.error("Error fetching service plans:", error)
    }
  }

  const fetchAvailableIPs = async () => {
    try {
      const response = await fetch("/api/ip-addresses?status=available")
      const data = await response.json()
      setAvailableIPs(data)
    } catch (error) {
      console.error("Error fetching available IPs:", error)
    }
  }

  const generatePassword = () => {
    const length = 12
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setPppoePassword(password)
    toast({
      title: "Password Generated",
      description: "A secure password has been generated",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/customer-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          service_plan_id: selectedPlan,
          connection_type: connectionType,
          pppoe_username: connectionType === "pppoe" ? pppoeUsername : null,
          pppoe_password: connectionType === "pppoe" ? pppoePassword : null,
          ip_address: selectedIP,
          status: "pending",
        }),
      })

      if (!response.ok) throw new Error("Failed to add service")

      toast({
        title: "Service Added",
        description: "The service has been successfully added",
      })

      onOpenChange(false)
      // Refresh the page or update parent component
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add service",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Service for {customerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="service-plan">Service Plan *</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a service plan" />
              </SelectTrigger>
              <SelectContent>
                {servicePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    {plan.name} - KES {plan.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Connection Type */}
          <div className="space-y-2">
            <Label htmlFor="connection-type">Connection Type *</Label>
            <Select value={connectionType} onValueChange={setConnectionType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select connection type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pppoe">PPPoE</SelectItem>
                <SelectItem value="static">Static IP</SelectItem>
                <SelectItem value="dhcp">DHCP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PPPoE Configuration (only shown when PPPoE is selected) */}
          {connectionType === "pppoe" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">PPPoE Configuration</h3>

              {/* PPPoE Username */}
              <div className="space-y-2">
                <Label htmlFor="pppoe-username">PPPoE Username *</Label>
                <Input
                  id="pppoe-username"
                  value={pppoeUsername}
                  onChange={(e) => setPppoeUsername(e.target.value)}
                  placeholder="username"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Suggested: {customerName.toLowerCase().replace(/\s+/g, "")}-{accountNumber}
                </p>
              </div>

              {/* PPPoE Password */}
              <div className="space-y-2">
                <Label htmlFor="pppoe-password">PPPoE Password *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="pppoe-password"
                      type={showPassword ? "text" : "password"}
                      value={pppoePassword}
                      onChange={(e) => setPppoePassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* IP Address Configuration */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">IP Address Configuration</h3>

            <div className="space-y-2">
              <Label htmlFor="ip-address">IP Address *</Label>
              <Select value={selectedIP} onValueChange={setSelectedIP} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an IP address" />
                </SelectTrigger>
                <SelectContent>
                  {availableIPs.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No available IPs
                    </SelectItem>
                  ) : (
                    availableIPs.map((ip) => (
                      <SelectItem key={ip.id} value={ip.id.toString()}>
                        {ip.ip_address}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{availableIPs.length} IP(s) available</p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

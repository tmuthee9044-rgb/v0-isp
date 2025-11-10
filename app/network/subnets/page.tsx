"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  Edit,
  Trash2,
  Network,
  Globe,
  Shield,
  Wifi,
  MapPin,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Activity,
} from "lucide-react"
import { toast } from "sonner"
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface Subnet {
  id: number
  router_id: number
  router_name?: string
  location_name?: string
  location_id?: number
  cidr: string
  type: "public" | "private" | "cgnat" | "ipv6"
  allocation_mode: "dynamic" | "static"
  name?: string
  description?: string
  created_at: string
  updated_at: string
  total_ips?: number
  assigned_ips?: number
  free_ips?: number
}

interface Router {
  id: number
  name: string
  hostname: string
  status: string
  location_id?: number
  location_name?: string
}

interface Location {
  id: number
  name: string
  description?: string
  status: string
}

export default function SubnetsPage() {
  const [subnets, setSubnets] = useState<Subnet[]>([])
  const [routers, setRouters] = useState<Router[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSubnet, setEditingSubnet] = useState<Subnet | null>(null)
  const [generatingIPs, setGeneratingIPs] = useState<number | null>(null)
  const [checkingOverlap, setCheckingOverlap] = useState(false)
  const [overlapError, setOverlapError] = useState<string | null>(null)
  const [cidrValidation, setCidrValidation] = useState<{
    isValid: boolean
    suggestedCidr?: string
    message?: string
  } | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "charts">("table")
  const [formData, setFormData] = useState<{
    router_id: string
    cidr: string
    type: "public" | "private" | "cgnat" | "ipv6"
    allocation_mode: "dynamic" | "static"
    name: string
    description: string
  }>({
    router_id: "",
    cidr: "",
    type: "private",
    allocation_mode: "dynamic",
    name: "",
    description: "",
  })

  const [regenerateSubnet, setRegenerateSubnet] = useState<Subnet | null>(null)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)

  const fetchSubnets = async () => {
    try {
      const response = await fetch("/api/network/ip-subnets")
      if (response.ok) {
        const data = await response.json()
        setSubnets(data.subnets || data)
      }
    } catch (error) {
      console.error("Error fetching subnets:", error)
      toast.error("Failed to fetch subnets")
    } finally {
      setLoading(false)
    }
  }

  const fetchRouters = async () => {
    try {
      const response = await fetch("/api/network/routers")
      if (response.ok) {
        const data = await response.json()
        const activeRouters = data.filter(
          (r: Router) => r.status === "active" || r.status === "connected" || r.status === "online",
        )
        console.log("[v0] Fetched routers:", activeRouters)
        setRouters(activeRouters)
      }
    } catch (error) {
      console.error("Error fetching routers:", error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations")
      if (response.ok) {
        const data = await response.json()
        const locationsArray = Array.isArray(data) ? data : data.locations || []
        setLocations(locationsArray.filter((l: Location) => l.status === "active"))
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
    }
  }

  const checkSubnetOverlap = async (cidr: string) => {
    if (!cidr || !cidr.includes("/")) {
      setOverlapError(null)
      return
    }

    setCheckingOverlap(true)
    setOverlapError(null)

    try {
      const response = await fetch("/api/network/ip-subnets/check-overlap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cidr,
          excludeId: editingSubnet?.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.overlaps) {
          const subnetList = data.subnets.map((s: any) => `${s.name || "Unnamed"} (${s.cidr})`).join(", ")
          setOverlapError(`This subnet overlaps with: ${subnetList}`)
        }
      }
    } catch (error) {
      console.error("Error checking overlap:", error)
    } finally {
      setCheckingOverlap(false)
    }
  }

  const validateCidr = (cidr: string) => {
    if (!cidr || !cidr.includes("/")) {
      setCidrValidation(null)
      return true
    }

    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    if (!cidrRegex.test(cidr)) {
      setCidrValidation({
        isValid: false,
        message: "Invalid CIDR format. Use format like 192.168.1.0/24",
      })
      return false
    }

    const [networkAddr, prefixStr] = cidr.split("/")
    const prefix = Number.parseInt(prefixStr)
    const octets = networkAddr.split(".").map(Number)

    if (octets.some((octet) => octet < 0 || octet > 255)) {
      setCidrValidation({
        isValid: false,
        message: "Invalid IP address. Each octet must be between 0 and 255",
      })
      return false
    }

    if (prefix < 8 || prefix > 30) {
      setCidrValidation({
        isValid: false,
        message: "Subnet prefix must be between /8 and /30",
      })
      return false
    }

    let isValid = true
    const correctCidr = [...octets]

    const hostBits = 32 - prefix
    const fullOctetsToCheck = Math.floor(hostBits / 8)
    const remainingBits = hostBits % 8

    for (let i = 0; i < fullOctetsToCheck; i++) {
      const octetIndex = 3 - i
      if (octets[octetIndex] !== 0) {
        isValid = false
        correctCidr[octetIndex] = 0
      }
    }

    if (remainingBits > 0) {
      const octetIndex = 3 - fullOctetsToCheck
      const mask = (0xff << remainingBits) & 0xff
      const maskedValue = octets[octetIndex] & mask

      if (octets[octetIndex] !== maskedValue) {
        isValid = false
        correctCidr[octetIndex] = maskedValue
      }
    }

    if (!isValid) {
      const suggestedCidr = `${correctCidr.join(".")}/${prefix}`
      setCidrValidation({
        isValid: false,
        suggestedCidr,
        message: `Network address has bits set outside the /${prefix} mask`,
      })
      return false
    }

    setCidrValidation({ isValid: true })
    return true
  }

  const applySuggestedCidr = () => {
    if (cidrValidation?.suggestedCidr) {
      setFormData((prev) => ({ ...prev, cidr: cidrValidation.suggestedCidr! }))
      setCidrValidation({ isValid: true })
      checkSubnetOverlap(cidrValidation.suggestedCidr)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("[v0] ===== SUBNET FORM SUBMISSION START =====")
    console.log("[v0] Form data - router_id:", formData.router_id)
    console.log("[v0] Form data - cidr:", formData.cidr)
    console.log("[v0] Form data - type:", formData.type)
    console.log("[v0] Form data - allocation_mode:", formData.allocation_mode)
    console.log("[v0] Form data - name:", formData.name)
    console.log("[v0] Form data - description:", formData.description)

    if (overlapError) {
      toast.error("Cannot create subnet: " + overlapError)
      return
    }

    if (cidrValidation && !cidrValidation.isValid) {
      toast.error(cidrValidation.message || "Invalid CIDR format")
      return
    }

    if (!formData.router_id) {
      console.log("[v0] Validation failed: No router selected")
      toast.error("Please select a router")
      return
    }

    if (!formData.cidr) {
      console.log("[v0] Validation failed: No CIDR entered")
      toast.error("Please enter a CIDR block")
      return
    }

    if (!validateCidr(formData.cidr)) {
      return
    }

    console.log("[v0] All validations passed, preparing API request")

    try {
      const url = editingSubnet ? `/api/network/ip-subnets/${editingSubnet.id}` : "/api/network/ip-subnets"
      const method = editingSubnet ? "PUT" : "POST"

      const requestData = {
        router_id: formData.router_id,
        cidr: formData.cidr,
        type: formData.type,
        name: formData.name,
        description: formData.description,
      }

      console.log("[v0] API Request URL:", url)
      console.log("[v0] API Request Method:", method)
      console.log("[v0] API Request Data:", requestData)

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      })

      console.log("[v0] API Response Status:", response.status)
      console.log("[v0] API Response OK:", response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] API Response Data:", result)
        toast.success(editingSubnet ? "Subnet updated successfully" : "Subnet added successfully")
        setIsAddDialogOpen(false)
        setEditingSubnet(null)
        resetForm()
        fetchSubnets()
        console.log("[v0] ===== SUBNET FORM SUBMISSION SUCCESS =====")
      } else {
        const error = await response.json()
        console.log("[v0] API Error Response:", error)
        toast.error(error.message || "Failed to save subnet")
        console.log("[v0] ===== SUBNET FORM SUBMISSION FAILED =====")
      }
    } catch (error) {
      console.error("[v0] Exception during subnet submission:", error)
      toast.error("Failed to save subnet")
      console.log("[v0] ===== SUBNET FORM SUBMISSION ERROR =====")
    }
  }

  const generateIPPool = async (subnet: Subnet, forceRegenerate = false) => {
    setGeneratingIPs(subnet.id)
    try {
      const response = await fetch(`/api/network/ip-subnets/${subnet.id}/generate-ips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: forceRegenerate }),
      })

      if (response.status === 409) {
        // IPs already exist, show confirmation dialog
        const result = await response.json()
        setRegenerateSubnet(subnet)
        setShowRegenerateDialog(true)
        setGeneratingIPs(null)
        return
      }

      if (response.ok) {
        const result = await response.json()
        toast.success(
          result.regenerated ? `Regenerated ${result.count} IP addresses` : `Generated ${result.count} IP addresses`,
        )
        fetchSubnets()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to generate IP pool")
      }
    } catch (error) {
      console.error("Error generating IP pool:", error)
      toast.error("Failed to generate IP pool")
    } finally {
      setGeneratingIPs(null)
    }
  }

  const handleConfirmRegenerate = () => {
    if (regenerateSubnet) {
      generateIPPool(regenerateSubnet, true)
    }
    setShowRegenerateDialog(false)
    setRegenerateSubnet(null)
  }

  const deleteSubnet = async (id: number) => {
    if (!confirm("Are you sure you want to delete this subnet? This will also delete all associated IP addresses."))
      return

    try {
      const response = await fetch(`/api/network/ip-subnets/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Subnet deleted successfully")
        fetchSubnets()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to delete subnet")
      }
    } catch (error) {
      console.error("Error deleting subnet:", error)
      toast.error("Failed to delete subnet")
    }
  }

  const resetForm = () => {
    setFormData({
      router_id: "",
      cidr: "",
      type: "private",
      allocation_mode: "dynamic",
      name: "",
      description: "",
    })
  }

  const openEditDialog = (subnet: Subnet) => {
    setEditingSubnet(subnet)
    setFormData({
      router_id: subnet.router_id ? subnet.router_id.toString() : "",
      cidr: subnet.cidr,
      type: subnet.type,
      allocation_mode: subnet.allocation_mode,
      name: subnet.name || "",
      description: subnet.description || "",
    })
    setIsAddDialogOpen(true)
    setOverlapError(null)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "public":
        return <Globe className="w-4 h-4 text-blue-500" />
      case "private":
        return <Shield className="w-4 h-4 text-green-500" />
      case "cgnat":
        return <Network className="w-4 h-4 text-orange-500" />
      case "ipv6":
        return <Wifi className="w-4 h-4 text-purple-500" />
      default:
        return <Network className="w-4 h-4 text-gray-500" />
    }
  }

  const getTypeBadge = (type: string) => {
    if (!type) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          UNKNOWN
        </Badge>
      )
    }

    const colors = {
      public: "bg-blue-100 text-blue-800",
      private: "bg-green-100 text-green-800",
      cgnat: "bg-orange-100 text-orange-800",
      ipv6: "bg-purple-100 text-purple-800",
    }

    return (
      <Badge variant="secondary" className={colors[type as keyof typeof colors]}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  const calculateUtilization = (subnet: Subnet) => {
    if (!subnet.total_ips || subnet.total_ips === 0) return 0
    return Math.round(((subnet.assigned_ips || 0) / subnet.total_ips) * 100)
  }

  const groupedSubnets = subnets.reduce(
    (acc, subnet) => {
      const locationName = subnet.location_name || "Unknown Location"
      if (!acc[locationName]) {
        acc[locationName] = []
      }
      acc[locationName].push(subnet)
      return acc
    },
    {} as Record<string, Subnet[]>,
  )

  const prepareSubnetUtilizationData = () => {
    return subnets.map((subnet) => ({
      name: subnet.name || subnet.cidr,
      assigned: subnet.assigned_ips || 0,
      available: subnet.free_ips || 0,
      utilization: calculateUtilization(subnet),
      location: subnet.location_name || "Unknown",
    }))
  }

  const prepareTypeDistributionData = () => {
    const typeStats = subnets.reduce(
      (acc, subnet) => {
        const type = subnet.type || "unknown"
        if (!acc[type]) {
          acc[type] = { assigned: 0, total: 0 }
        }
        acc[type].assigned += subnet.assigned_ips || 0
        acc[type].total += subnet.total_ips || 0
        return acc
      },
      {} as Record<string, { assigned: number; total: number }>,
    )

    return Object.entries(typeStats).map(([type, stats]) => ({
      name: type.toUpperCase(),
      value: stats.assigned,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0,
    }))
  }

  const prepareLocationUtilizationData = () => {
    const locationStats = subnets.reduce(
      (acc, subnet) => {
        const location = subnet.location_name || "Unknown Location"
        if (!acc[location]) {
          acc[location] = { assigned: 0, total: 0, subnets: 0 }
        }
        acc[location].assigned += subnet.assigned_ips || 0
        acc[location].total += subnet.total_ips || 0
        acc[location].subnets += 1
        return acc
      },
      {} as Record<string, { assigned: number; total: number; subnets: number }>,
    )

    return Object.entries(locationStats).map(([location, stats]) => ({
      name: location,
      assigned: stats.assigned,
      available: stats.total - stats.assigned,
      utilization: stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0,
      subnets: stats.subnets,
    }))
  }

  const TYPE_COLORS = {
    PUBLIC: "#3b82f6",
    PRIVATE: "#10b981",
    CGNAT: "#f97316",
    IPV6: "#a855f7",
    UNKNOWN: "#6b7280",
  }

  useEffect(() => {
    fetchSubnets()
    fetchRouters()
    fetchLocations()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const calculateOverallStats = () => {
    const totalIPs = subnets.reduce((sum, subnet) => sum + (subnet.total_ips || 0), 0)
    const usedIPs = subnets.reduce((sum, subnet) => sum + (subnet.assigned_ips || 0), 0)
    const availableIPs = subnets.reduce((sum, subnet) => sum + (subnet.free_ips || 0), 0)
    const utilization = totalIPs > 0 ? Math.round((usedIPs / totalIPs) * 100) : 0

    return { totalIPs, usedIPs, availableIPs, utilization }
  }

  const overallStats = calculateOverallStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">IP Subnet Management</h1>
          <p className="text-muted-foreground">
            Manage IP subnets and address pools for your network routers by location
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === "table" ? "charts" : "table")}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {viewMode === "table" ? "Show Charts" : "Show Table"}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm()
                  setEditingSubnet(null)
                  setOverlapError(null)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Subnet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingSubnet ? "Edit Subnet" : "Add New Subnet"}</DialogTitle>
                <DialogDescription>Configure IP subnet details and allocation settings</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="router">Router</Label>
                      <Select
                        value={formData.router_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, router_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select router" />
                        </SelectTrigger>
                        <SelectContent>
                          {routers.map((router) => (
                            <SelectItem key={router.id} value={router.id.toString()}>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                {router.name} ({router.hostname})
                                {router.location_name && (
                                  <Badge variant="outline" className="ml-2">
                                    {router.location_name}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidr">CIDR Block</Label>
                      <Input
                        id="cidr"
                        value={formData.cidr}
                        onChange={(e) => {
                          const newCidr = e.target.value
                          setFormData((prev) => ({ ...prev, cidr: newCidr }))
                          validateCidr(newCidr)
                          if (newCidr.includes("/")) {
                            checkSubnetOverlap(newCidr)
                          }
                        }}
                        placeholder="192.168.1.0/24"
                        required
                        className={cidrValidation && !cidrValidation.isValid ? "border-destructive" : ""}
                      />
                      {cidrValidation && !cidrValidation.isValid && (
                        <div className="space-y-2">
                          <p className="text-sm text-destructive">{cidrValidation.message}</p>
                          {cidrValidation.suggestedCidr && (
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">
                                Did you mean{" "}
                                <span className="font-mono font-semibold">{cidrValidation.suggestedCidr}</span>?
                              </p>
                              <Button type="button" size="sm" variant="outline" onClick={applySuggestedCidr}>
                                Use This
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {checkingOverlap && <p className="text-sm text-muted-foreground">Checking for overlaps...</p>}
                      {overlapError && <p className="text-sm text-destructive">{overlapError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Subnet Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: any) => setFormData((prev) => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="cgnat">CGNAT</SelectItem>
                          <SelectItem value="ipv6">IPv6</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allocation_mode">Allocation Mode</Label>
                      <Select
                        value={formData.allocation_mode}
                        onValueChange={(value: any) => setFormData((prev) => ({ ...prev, allocation_mode: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dynamic">Dynamic</SelectItem>
                          <SelectItem value="static">Static</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Subnet Name (Optional)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Customer Pool 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Main customer IP pool for residential users"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={checkingOverlap || !!overlapError || (cidrValidation !== null && !cidrValidation.isValid)}
                  >
                    {editingSubnet ? "Update Subnet" : "Add Subnet"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs Generated</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalIPs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {subnets.length} subnets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used IPs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.usedIPs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Assigned to customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.availableIPs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subnet Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.utilization}%</div>
            <Progress value={overallStats.utilization} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {viewMode === "charts" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subnet IP Utilization</CardTitle>
              <CardDescription>Assigned vs Available IPs across all subnets</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  assigned: {
                    label: "Assigned IPs",
                    color: "hsl(var(--chart-1))",
                  },
                  available: {
                    label: "Available IPs",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareSubnetUtilizationData()}>
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="assigned" fill="hsl(var(--chart-1))" name="Assigned IPs" />
                    <Bar dataKey="available" fill="hsl(var(--chart-2))" name="Available IPs" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>IP Distribution by Type</CardTitle>
                <CardDescription>Assigned IPs across subnet types</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    public: {
                      label: "Public",
                      color: TYPE_COLORS.PUBLIC,
                    },
                    private: {
                      label: "Private",
                      color: TYPE_COLORS.PRIVATE,
                    },
                    cgnat: {
                      label: "CGNAT",
                      color: TYPE_COLORS.CGNAT,
                    },
                    ipv6: {
                      label: "IPv6",
                      color: TYPE_COLORS.IPV6,
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareTypeDistributionData()}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {prepareTypeDistributionData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={TYPE_COLORS[entry.name as keyof typeof TYPE_COLORS] || TYPE_COLORS.UNKNOWN}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">{data.name}</span>
                                    <span className="font-bold text-muted-foreground">
                                      {data.value} / {data.total} IPs
                                    </span>
                                    <span className="text-[0.70rem] text-muted-foreground">
                                      {data.percentage}% Utilization
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Utilization by Location</CardTitle>
                <CardDescription>IP usage across different locations</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    assigned: {
                      label: "Assigned",
                      color: "hsl(var(--chart-1))",
                    },
                    available: {
                      label: "Available",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareLocationUtilizationData()} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">{data.name}</span>
                                    <span className="font-bold">
                                      {data.assigned} assigned, {data.available} available
                                    </span>
                                    <span className="text-[0.70rem] text-muted-foreground">
                                      {data.utilization}% utilized • {data.subnets} subnets
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend />
                      <Bar dataKey="assigned" fill="hsl(var(--chart-1))" stackId="a" name="Assigned" />
                      <Bar dataKey="available" fill="hsl(var(--chart-2))" stackId="a" name="Available" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {viewMode === "table" && (
        <>
          {Object.entries(groupedSubnets).map(([locationName, locationSubnets]) => (
            <Card key={locationName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  {locationName}
                  <Badge variant="outline">{locationSubnets.length} subnets</Badge>
                </CardTitle>
                <CardDescription>IP subnets and address pools for this location</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subnet</TableHead>
                      <TableHead>Router</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationSubnets.map((subnet) => (
                      <TableRow key={subnet.id}>
                        <TableCell>
                          <div>
                            <a
                              href={`/network/subnets/view?id=${subnet.id}`}
                              className="font-medium flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              {getTypeIcon(subnet.type)}
                              {subnet.name || subnet.cidr}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <div className="text-sm text-muted-foreground">
                              {subnet.cidr}
                              {subnet.description && ` • ${subnet.description}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{subnet.router_name || `Router ${subnet.router_id}`}</TableCell>
                        <TableCell>{getTypeBadge(subnet.type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {subnet.allocation_mode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>
                                {subnet.assigned_ips || 0} / {subnet.total_ips || 0}
                              </span>
                              <span>{calculateUtilization(subnet)}%</span>
                            </div>
                            <Progress value={calculateUtilization(subnet)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateIPPool(subnet)}
                              disabled={generatingIPs === subnet.id}
                              title={
                                subnet.total_ips && subnet.total_ips > 0
                                  ? "Regenerate IP addresses"
                                  : "Generate IP addresses"
                              }
                            >
                              {generatingIPs === subnet.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  {subnet.total_ips && subnet.total_ips > 0 ? "Regenerate" : "Generate IPs"}
                                </>
                              )}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(subnet)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteSubnet(subnet.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {locationSubnets.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No subnets configured for this location yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {subnets.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No subnets configured yet.</p>
                <p className="text-sm text-muted-foreground">Add your first subnet to get started.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate IP Addresses?</AlertDialogTitle>
            <AlertDialogDescription>
              This subnet already has IP addresses generated. Regenerating will delete all existing IP addresses and
              create new ones. This action cannot be undone.
              {regenerateSubnet && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium">{regenerateSubnet.name || regenerateSubnet.cidr}</p>
                  <p className="text-sm text-muted-foreground">
                    Current: {regenerateSubnet.total_ips} IPs ({regenerateSubnet.assigned_ips} assigned,{" "}
                    {regenerateSubnet.free_ips} available)
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate} className="bg-destructive text-destructive-foreground">
              Regenerate IPs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

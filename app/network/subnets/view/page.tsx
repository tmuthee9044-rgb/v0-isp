"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Globe,
  Shield,
  Network,
  Wifi,
  CheckCircle,
  User,
  Clock,
  XCircle,
  Search,
  Filter,
  MapPin,
  Server,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface SubnetDetail {
  id: number
  cidr: string
  name?: string
  description?: string
  type: "public" | "private" | "cgnat" | "ipv6"
  router_id: number
  router_name?: string
  router_ip?: string
  location_name?: string
  total_ips_generated: number
  assigned_ips: number
  available_ips: number
  reserved_ips: number
  gateway?: string
  vlan_id?: number
  created_at: string
}

interface IPAddress {
  id: number
  ip_address: string
  status: "available" | "assigned" | "reserved"
  customer_id?: number
  first_name?: string
  last_name?: string
  business_name?: string
  service_id?: number
  assigned_at?: string
  last_seen?: string
}

function SubnetViewContent() {
  const searchParams = useSearchParams()
  const subnetId = searchParams.get("id")

  const [subnet, setSubnet] = useState<SubnetDetail | null>(null)
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingIPs, setGeneratingIPs] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const handleGenerateIPs = async () => {
    setGeneratingIPs(true)
    try {
      const response = await fetch(`/api/network/ip-subnets/${subnetId}/generate`, {
        method: "POST",
      })
      if (response.ok) {
        toast.success("IP Addresses generated successfully")
        fetchIPAddresses()
      } else {
        toast.error("Failed to generate IP Addresses")
      }
    } catch (error) {
      console.error("Error generating IPs:", error)
      toast.error("Failed to generate IP Addresses")
    } finally {
      setGeneratingIPs(false)
    }
  }

  useEffect(() => {
    if (subnetId) {
      fetchSubnetDetails()
      fetchIPAddresses()
    }
  }, [subnetId, statusFilter])

  const fetchSubnetDetails = async () => {
    try {
      const response = await fetch(`/api/network/ip-subnets/${subnetId}`)
      if (response.ok) {
        const data = await response.json()
        setSubnet(data)
      } else {
        toast.error("Failed to fetch subnet details")
      }
    } catch (error) {
      console.error("Error fetching subnet:", error)
      toast.error("Failed to fetch subnet details")
    }
  }

  const fetchIPAddresses = async () => {
    try {
      let url = `/api/network/ip-addresses?subnet_id=${subnetId}`
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`
      }

      console.log("[v0] Fetching IP addresses from:", url)

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] IP addresses response:", data)
        const addresses = Array.isArray(data.addresses) ? data.addresses : Array.isArray(data) ? data : []
        console.log("[v0] Setting IP addresses:", addresses.length)
        setIpAddresses(addresses)
      } else {
        console.error("[v0] Failed to fetch IP addresses, status:", response.status)
        toast.error("Failed to fetch IP addresses")
        setIpAddresses([]) // Set empty array on error
      }
    } catch (error) {
      console.error("[v0] Error fetching IPs:", error)
      toast.error("Failed to fetch IP addresses")
      setIpAddresses([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "public":
        return <Globe className="w-5 h-5 text-blue-500" />
      case "private":
        return <Shield className="w-5 h-5 text-green-500" />
      case "cgnat":
        return <Network className="w-5 h-5 text-orange-500" />
      case "ipv6":
        return <Wifi className="w-5 h-5 text-purple-500" />
      default:
        return <Network className="w-5 h-5 text-gray-500" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      public: "bg-blue-100 text-blue-800",
      private: "bg-green-100 text-green-800",
      cgnat: "bg-orange-100 text-orange-800",
      ipv6: "bg-purple-100 text-purple-800",
    }

    return (
      <Badge variant="secondary" className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "assigned":
        return <User className="w-4 h-4 text-blue-500" />
      case "reserved":
        return <Clock className="w-4 h-4 text-orange-500" />
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      available: "bg-green-100 text-green-800",
      assigned: "bg-blue-100 text-blue-800",
      reserved: "bg-orange-100 text-orange-800",
    }

    return (
      <Badge variant="secondary" className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const calculateUtilization = () => {
    if (!subnet || subnet.total_ips_generated === 0) return 0
    return Math.round((subnet.assigned_ips / subnet.total_ips_generated) * 100)
  }

  const isReservedIP = (ip: string) => {
    if (!subnet) return false

    const [network, prefixStr] = subnet.cidr.split("/")
    const prefix = Number.parseInt(prefixStr)
    const networkParts = network.split(".").map(Number)

    // Calculate network address
    const hostBits = 32 - prefix
    const totalHosts = Math.pow(2, hostBits)

    // Network address (first IP)
    const networkAddr = network

    // Broadcast address (last IP)
    const ipParts = ip.split(".").map(Number)
    const lastOctet = networkParts[3] + totalHosts - 1

    const broadcastAddr = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${lastOctet}`

    // Gateway (usually first usable IP)
    const gatewayAddr =
      subnet.gateway || `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${networkParts[3] + 1}`

    return ip === networkAddr || ip === broadcastAddr || ip === gatewayAddr
  }

  const filteredIPs = Array.isArray(ipAddresses)
    ? ipAddresses.filter((ip) => {
        const matchesSearch =
          ip.ip_address.includes(searchTerm) ||
          ip.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${ip.first_name} ${ip.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
      })
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!subnet) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/network/subnets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subnets
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Subnet not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/network/subnets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subnets
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              {getTypeIcon(subnet.type)}
              <h1 className="text-3xl font-bold">{subnet.name || subnet.cidr}</h1>
              {getTypeBadge(subnet.type)}
            </div>
            <p className="text-muted-foreground mt-1">{subnet.description || "IP address pool details"}</p>
          </div>
        </div>
      </div>

      {/* Subnet Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subnet.total_ips_generated}</div>
            <p className="text-xs text-muted-foreground">{subnet.cidr}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subnet.assigned_ips}</div>
            <p className="text-xs text-muted-foreground">{calculateUtilization()}% utilized</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subnet.available_ips}</div>
            <p className="text-xs text-muted-foreground">
              {subnet.total_ips_generated > 0
                ? Math.round((subnet.available_ips / subnet.total_ips_generated) * 100)
                : 0}
              % free
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subnet.reserved_ips}</div>
            <p className="text-xs text-muted-foreground">Network, Gateway, Broadcast</p>
          </CardContent>
        </Card>
      </div>

      {/* Subnet Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subnet Information</CardTitle>
          <CardDescription>Network configuration and router details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">CIDR Block</p>
                  <p className="text-sm text-muted-foreground font-mono">{subnet.cidr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Router</p>
                  <p className="text-sm text-muted-foreground">
                    {subnet.router_name} ({subnet.router_ip})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{subnet.location_name || "Unknown"}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {subnet.gateway && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Gateway</p>
                    <p className="text-sm text-muted-foreground font-mono">{subnet.gateway}</p>
                  </div>
                </div>
              )}
              {subnet.vlan_id && (
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">VLAN ID</p>
                    <p className="text-sm text-muted-foreground">{subnet.vlan_id}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">{new Date(subnet.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Utilization</p>
            <Progress value={calculateUtilization()} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">
              {subnet.assigned_ips} of {subnet.total_ips_generated} IPs assigned ({calculateUtilization()}%)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* IP Addresses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IP Addresses</CardTitle>
              <CardDescription>All IP addresses in this subnet with allocation status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {subnet && subnet.total_ips_generated === 0 && (
                <Button onClick={handleGenerateIPs} disabled={generatingIPs} size="sm">
                  {generatingIPs ? "Generating..." : "Generate IPs"}
                </Button>
              )}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search IPs, customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subnet && subnet.total_ips_generated === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <Network className="w-16 h-16 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No IP Addresses Generated</h3>
                <p className="text-muted-foreground mt-2">
                  This subnet doesn't have any IP addresses yet. Generate IPs from the CIDR block{" "}
                  <span className="font-mono font-semibold">{subnet.cidr}</span> to start allocating them to customers.
                </p>
              </div>
              <Button onClick={handleGenerateIPs} disabled={generatingIPs} size="lg">
                {generatingIPs ? "Generating IP Addresses..." : "Generate IP Addresses"}
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service ID</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIPs.map((ip) => {
                    const isReserved = isReservedIP(ip.ip_address)
                    return (
                      <TableRow key={ip.id} className={ip.status === "assigned" ? "bg-green-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ip.status)}
                            <span className="font-mono font-medium">{ip.ip_address}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ip.status === "assigned" ? (
                            <span className="text-sm font-medium">Yes</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ip.status === "assigned" && ip.customer_id ? (
                            <Link href={`/customers/${ip.customer_id}`} className="hover:underline text-blue-600">
                              <div className="font-medium">
                                {ip.business_name || `${ip.first_name} ${ip.last_name}`}
                              </div>
                              {ip.service_id && (
                                <div className="text-xs text-muted-foreground">Service ID: {ip.service_id}</div>
                              )}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">---</span>
                          )}
                        </TableCell>
                        <TableCell>{ip.service_id ? <Badge variant="outline">#{ip.service_id}</Badge> : "-"}</TableCell>
                        <TableCell>{ip.assigned_at ? new Date(ip.assigned_at).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          {isReserved && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              Reserved
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {filteredIPs.length === 0 && subnet && subnet.total_ips_generated > 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No IP addresses found matching your filters.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SubnetViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <SubnetViewContent />
    </Suspense>
  )
}

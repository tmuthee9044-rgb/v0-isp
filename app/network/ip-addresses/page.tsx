"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Globe, CheckCircle, XCircle, Clock, User } from "lucide-react"
import { toast } from "sonner"

interface IPAddress {
  id: number
  ip_address: string
  subnet_id: number
  subnet_cidr?: string
  subnet_name?: string
  router_id?: number
  router_name?: string
  status: "available" | "assigned" | "reserved"
  service_id?: number
  customer_id?: number
  first_name?: string
  last_name?: string
  business_name?: string
  assigned_at?: string
  last_seen?: string
}

interface Subnet {
  id: number
  cidr: string
  name?: string
  router_id: number
  router_name?: string
}

export default function IPAddressesPage() {
  const [addresses, setAddresses] = useState<IPAddress[]>([])
  const [subnets, setSubnets] = useState<Subnet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [subnetFilter, setSubnetFilter] = useState<string>("all")
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false)
  const [selectedIP, setSelectedIP] = useState<IPAddress | null>(null)

  useEffect(() => {
    fetchAddresses()
    fetchSubnets()
  }, [statusFilter, subnetFilter])

  const fetchAddresses = async () => {
    try {
      let url = "/api/network/ip-addresses?"
      if (statusFilter !== "all") url += `status=${statusFilter}&`
      if (subnetFilter !== "all") url += `subnet_id=${subnetFilter}&`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error("Error fetching IP addresses:", error)
      toast.error("Failed to fetch IP addresses")
    } finally {
      setLoading(false)
    }
  }

  const fetchSubnets = async () => {
    try {
      const response = await fetch("/api/network/ip-subnets")
      if (response.ok) {
        const data = await response.json()
        setSubnets(data.subnets || data)
      }
    } catch (error) {
      console.error("Error fetching subnets:", error)
    }
  }

  const releaseIP = async () => {
    if (!selectedIP) return

    try {
      const response = await fetch("/api/network/ip-addresses/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: selectedIP.ip_address,
        }),
      })

      if (response.ok) {
        toast.success("IP address released successfully")
        setIsReleaseDialogOpen(false)
        setSelectedIP(null)
        fetchAddresses()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to release IP address")
      }
    } catch (error) {
      console.error("Error releasing IP:", error)
      toast.error("Failed to release IP address")
    }
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

  const filteredAddresses = addresses.filter((addr) => {
    const matchesSearch =
      addr.ip_address.includes(searchTerm) ||
      addr.subnet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.router_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${addr.first_name} ${addr.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const stats = {
    total: addresses.length,
    available: addresses.filter((a) => a.status === "available").length,
    assigned: addresses.filter((a) => a.status === "assigned").length,
    reserved: addresses.filter((a) => a.status === "reserved").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">IP Address Management</h1>
          <p className="text-muted-foreground">View and manage individual IP addresses across all subnets</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available}</div>
            <p className="text-xs text-muted-foreground">{Math.round((stats.available / stats.total) * 100)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
            <p className="text-xs text-muted-foreground">{Math.round((stats.assigned / stats.total) * 100)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reserved}</div>
            <p className="text-xs text-muted-foreground">{Math.round((stats.reserved / stats.total) * 100)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IP Addresses</CardTitle>
              <CardDescription>Search and filter IP addresses by status, subnet, or customer</CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
              <Select value={subnetFilter} onValueChange={setSubnetFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Subnets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subnets</SelectItem>
                  {subnets.map((subnet) => (
                    <SelectItem key={subnet.id} value={subnet.id.toString()}>
                      {subnet.name || subnet.cidr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Subnet</TableHead>
                <TableHead>Router</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAddresses.map((addr) => (
                <TableRow key={addr.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(addr.status)}
                      <span className="font-mono font-medium">{addr.ip_address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{addr.subnet_name || "Unnamed"}</div>
                      <div className="text-sm text-muted-foreground">{addr.subnet_cidr}</div>
                    </div>
                  </TableCell>
                  <TableCell>{addr.router_name || "-"}</TableCell>
                  <TableCell>{getStatusBadge(addr.status)}</TableCell>
                  <TableCell>
                    {addr.status === "assigned" ? (
                      <div>
                        <div className="font-medium">
                          {addr.business_name || `${addr.first_name} ${addr.last_name}`}
                        </div>
                        <div className="text-sm text-muted-foreground">Service #{addr.service_id}</div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{addr.assigned_at ? new Date(addr.assigned_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    {addr.status === "assigned" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIP(addr)
                          setIsReleaseDialogOpen(true)
                        }}
                      >
                        Release
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAddresses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No IP addresses found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release IP Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to release this IP address? It will become available for reassignment.
            </DialogDescription>
          </DialogHeader>
          {selectedIP && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">IP Address:</span>
                <span className="text-sm font-mono">{selectedIP.ip_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Customer:</span>
                <span className="text-sm">
                  {selectedIP.business_name || `${selectedIP.first_name} ${selectedIP.last_name}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Subnet:</span>
                <span className="text-sm">{selectedIP.subnet_name || selectedIP.subnet_cidr}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={releaseIP}>Release IP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

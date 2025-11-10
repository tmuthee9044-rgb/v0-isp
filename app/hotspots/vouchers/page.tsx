"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { useToast } from "@/hooks/use-toast"
import { Plus, Ticket, Copy, Trash2, Eye } from "lucide-react"

interface Voucher {
  id: number
  hotspot_id: number
  hotspot_name: string
  code: string
  time_limit: number
  data_limit: number
  max_users: number
  used_count: number
  expiry_date: string
  status: string
  created_at: string
}

interface Hotspot {
  id: number
  name: string
  location: string
}

export default function HotspotVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedHotspot, setSelectedHotspot] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [newVoucher, setNewVoucher] = useState({
    hotspot_id: "",
    time_limit: 60,
    data_limit: 1024,
    max_users: 1,
    expiry_days: 30,
    quantity: 1,
  })

  useEffect(() => {
    loadVouchers()
    loadHotspots()
  }, [])

  const loadVouchers = async () => {
    try {
      const response = await fetch("/api/hotspots/vouchers")
      if (response.ok) {
        const data = await response.json()
        setVouchers(data)
      }
    } catch (error) {
      console.error("Failed to load vouchers:", error)
      toast({
        title: "Error",
        description: "Failed to load vouchers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadHotspots = async () => {
    try {
      const response = await fetch("/api/hotspots")
      if (response.ok) {
        const data = await response.json()
        setHotspots(data)
      }
    } catch (error) {
      console.error("Failed to load hotspots:", error)
    }
  }

  const generateVouchers = async () => {
    try {
      const response = await fetch("/api/hotspots/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newVoucher,
          hotspot_id: Number.parseInt(newVoucher.hotspot_id),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Generated ${newVoucher.quantity} voucher(s) successfully`,
        })
        setShowCreateModal(false)
        loadVouchers()
        setNewVoucher({
          hotspot_id: "",
          time_limit: 60,
          data_limit: 1024,
          max_users: 1,
          expiry_days: 30,
          quantity: 1,
        })
      } else {
        throw new Error("Failed to generate vouchers")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate vouchers",
        variant: "destructive",
      })
    }
  }

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied",
      description: "Voucher code copied to clipboard",
    })
  }

  const deleteVoucher = async (id: number) => {
    if (!confirm("Are you sure you want to delete this voucher?")) return

    try {
      const response = await fetch(`/api/hotspots/vouchers/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Voucher deleted successfully",
        })
        loadVouchers()
      } else {
        throw new Error("Failed to delete voucher")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete voucher",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      case "used":
        return <Badge className="bg-gray-100 text-gray-800">Used</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredVouchers = vouchers.filter((voucher) => {
    const matchesStatus = filterStatus === "all" || voucher.status === filterStatus
    const matchesSearch =
      voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.hotspot_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesHotspot = !selectedHotspot || voucher.hotspot_id.toString() === selectedHotspot
    return matchesStatus && matchesSearch && matchesHotspot
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vouchers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotspot Vouchers</h1>
          <p className="text-gray-600">Manage access vouchers for your hotspots</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Vouchers
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate New Vouchers</DialogTitle>
              <DialogDescription>Create access vouchers for hotspot users</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Hotspot</Label>
                <Select
                  value={newVoucher.hotspot_id}
                  onValueChange={(value) => setNewVoucher({ ...newVoucher, hotspot_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotspot" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotspots.map((hotspot) => (
                      <SelectItem key={hotspot.id} value={hotspot.id.toString()}>
                        {hotspot.name} - {hotspot.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    value={newVoucher.time_limit}
                    onChange={(e) => setNewVoucher({ ...newVoucher, time_limit: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Data Limit (MB)</Label>
                  <Input
                    type="number"
                    value={newVoucher.data_limit}
                    onChange={(e) => setNewVoucher({ ...newVoucher, data_limit: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Users</Label>
                  <Input
                    type="number"
                    value={newVoucher.max_users}
                    onChange={(e) => setNewVoucher({ ...newVoucher, max_users: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Valid for (days)</Label>
                  <Input
                    type="number"
                    value={newVoucher.expiry_days}
                    onChange={(e) => setNewVoucher({ ...newVoucher, expiry_days: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newVoucher.quantity}
                  onChange={(e) => setNewVoucher({ ...newVoucher, quantity: Number.parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={generateVouchers} disabled={!newVoucher.hotspot_id}>
                Generate Vouchers
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search vouchers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedHotspot} onValueChange={setSelectedHotspot}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All hotspots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hotspots</SelectItem>
                {hotspots.map((hotspot) => (
                  <SelectItem key={hotspot.id} value={hotspot.id.toString()}>
                    {hotspot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Vouchers ({filteredVouchers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVouchers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Hotspot</TableHead>
                  <TableHead>Time Limit</TableHead>
                  <TableHead>Data Limit</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{voucher.code}</code>
                        <Button variant="ghost" size="sm" onClick={() => copyVoucherCode(voucher.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{voucher.hotspot_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>{voucher.time_limit} min</TableCell>
                    <TableCell>{voucher.data_limit} MB</TableCell>
                    <TableCell>
                      {voucher.used_count}/{voucher.max_users}
                    </TableCell>
                    <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                    <TableCell>{new Date(voucher.expiry_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteVoucher(voucher.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Vouchers Found</h3>
              <p className="text-gray-600 mb-4">Generate vouchers to provide temporary access to your hotspots</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate First Vouchers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

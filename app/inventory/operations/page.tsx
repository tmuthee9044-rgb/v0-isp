"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeftRight, Package, RefreshCw, Download, Edit3, RotateCcw, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StockOperation {
  id: number
  type: string
  item_name: string
  quantity: number
  from_location?: string
  to_location?: string
  reason: string
  status: string
  created_at: string
  performed_by: string
}

export default function InventoryOperationsPage() {
  const [operations, setOperations] = useState<StockOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const { toast } = useToast()

  const fetchOperations = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/inventory/movements")
      if (response.ok) {
        const data = await response.json()
        setOperations(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching operations:", error)
      toast({
        title: "Error",
        description: "Failed to load stock operations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOperations()
  }, [])

  const handleTransfer = async (formData: FormData) => {
    try {
      const response = await fetch("/api/inventory/transfers", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Stock transfer initiated successfully",
        })
        setShowTransferModal(false)
        fetchOperations()
      } else {
        throw new Error("Failed to create transfer")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create stock transfer",
        variant: "destructive",
      })
    }
  }

  const handleAdjustment = async (formData: FormData) => {
    try {
      const response = await fetch("/api/inventory/adjustments", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Stock adjustment recorded successfully",
        })
        setShowAdjustmentModal(false)
        fetchOperations()
      } else {
        throw new Error("Failed to create adjustment")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record stock adjustment",
        variant: "destructive",
      })
    }
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4" />
      case "adjustment":
        return <Edit3 className="h-4 w-4" />
      case "reservation":
        return <Settings className="h-4 w-4" />
      case "replacement":
        return <RotateCcw className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "pending":
        return "secondary"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading stock operations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Stock Operations</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowTransferModal(true)}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Transfer Stock
          </Button>
          <Button onClick={() => setShowAdjustmentModal(true)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Quick Actions Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowTransferModal(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inter-Warehouse Transfer</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Move stock between warehouses</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowAdjustmentModal(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Adjustment</CardTitle>
            <Edit3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Adjust stock levels manually</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowReservationModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserve Stock</CardTitle>
            <Settings className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Reserve items for orders</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulk Operations</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Mass updates and transfers</p>
          </CardContent>
        </Card>
      </div>

      {/* Operations History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
          <CardDescription>Track all inventory movements and adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>From/To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((operation) => (
                <TableRow key={operation.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getOperationIcon(operation.type)}
                      <span className="capitalize">{operation.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{operation.item_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{operation.quantity}</Badge>
                  </TableCell>
                  <TableCell>
                    {operation.from_location && operation.to_location
                      ? `${operation.from_location} → ${operation.to_location}`
                      : operation.from_location || operation.to_location || "-"}
                  </TableCell>
                  <TableCell>{operation.reason}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(operation.status)}>{operation.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(operation.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{operation.performed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inter-Warehouse Transfer</DialogTitle>
            <DialogDescription>Transfer stock between warehouse locations</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleTransfer(formData)
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="item_id">Item</Label>
                <Select name="item_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item to transfer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cisco ISR 4331 Router</SelectItem>
                    <SelectItem value="2">TP-Link Archer C7</SelectItem>
                    <SelectItem value="3">Fiber Optic Cable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_warehouse">From Warehouse</Label>
                  <Select name="from_warehouse" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Source warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Warehouse</SelectItem>
                      <SelectItem value="branch1">Branch 1</SelectItem>
                      <SelectItem value="branch2">Branch 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="to_warehouse">To Warehouse</Label>
                  <Select name="to_warehouse" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Destination warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Warehouse</SelectItem>
                      <SelectItem value="branch1">Branch 1</SelectItem>
                      <SelectItem value="branch2">Branch 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" min="1" required />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" name="reason" placeholder="Reason for transfer" required />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Transfer Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjustment Modal */}
      <Dialog open={showAdjustmentModal} onOpenChange={setShowAdjustmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
            <DialogDescription>Manually adjust inventory levels</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAdjustment(formData)
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="item_id">Item</Label>
                <Select name="item_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item to adjust" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cisco ISR 4331 Router</SelectItem>
                    <SelectItem value="2">TP-Link Archer C7</SelectItem>
                    <SelectItem value="3">Fiber Optic Cable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adjustment_type">Adjustment Type</Label>
                  <Select name="adjustment_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase Stock</SelectItem>
                      <SelectItem value="decrease">Decrease Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" required />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Select name="reason" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Damaged Items</SelectItem>
                    <SelectItem value="found">Found Items</SelectItem>
                    <SelectItem value="theft">Theft/Loss</SelectItem>
                    <SelectItem value="correction">Stock Correction</SelectItem>
                    <SelectItem value="expired">Expired Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Additional notes" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAdjustmentModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Edit3 className="mr-2 h-4 w-4" />
                Record Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

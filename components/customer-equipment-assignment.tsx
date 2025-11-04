"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Package, Minus, Router, Wifi, Server, Cable, AlertTriangle, Search, Grid3x3, List } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InventoryItem {
  id: number
  name: string
  category: string
  sku: string
  stockQuantity: number
  unitCost: number
  location: string
  description: string
  specifications: string
}

interface AssignedEquipment {
  id: number
  equipment_name: string
  equipment_type: string
  serial_number?: string
  issued_date: string
  status: string
  monthly_cost?: number
  notes?: string
  inventory_item_id?: number
}

interface CustomerEquipmentAssignmentProps {
  customerId: number
}

export default function CustomerEquipmentAssignment({ customerId }: CustomerEquipmentAssignmentProps) {
  const [availableEquipment, setAvailableEquipment] = useState<InventoryItem[]>([])
  const [assignedEquipment, setAssignedEquipment] = useState<AssignedEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [assignQuantity, setAssignQuantity] = useState(1)
  const [assignNotes, setAssignNotes] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")
  const { toast } = useToast()

  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<AssignedEquipment | null>(null)
  const [returnCondition, setReturnCondition] = useState("")
  const [returnReason, setReturnReason] = useState("")
  const [serialVerification, setSerialVerification] = useState("")

  const fetchAvailableEquipment = async () => {
    try {
      const response = await fetch("/api/inventory/available")
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableEquipment(result.items || [])
        }
      }
    } catch (error) {
      console.error("Error fetching available equipment:", error)
      toast({
        title: "Error",
        description: "Failed to load available equipment",
        variant: "destructive",
      })
    }
  }

  const fetchAssignedEquipment = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/equipment`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAssignedEquipment(result.equipment || [])
        }
      }
    } catch (error) {
      console.error("Error fetching assigned equipment:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchAvailableEquipment(), fetchAssignedEquipment()])
      setLoading(false)
    }
    loadData()
  }, [customerId])

  const handleAssignEquipment = async () => {
    if (!selectedItem) return

    console.log("[v0] Starting equipment assignment:", {
      customerId,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: assignQuantity,
    })

    try {
      const response = await fetch(`/api/customers/${customerId}/equipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventory_item_id: selectedItem.id,
          equipment_name: selectedItem.name,
          equipment_type: selectedItem.category,
          quantity: assignQuantity,
          monthly_cost: selectedItem.unitCost,
          notes: assignNotes,
        }),
      })

      console.log("[v0] Assignment response status:", response.status)

      const result = await response.json()
      console.log("[v0] Assignment result:", result)

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: `${selectedItem.name} assigned successfully`,
        })
        setShowAssignModal(false)
        setSelectedItem(null)
        setAssignQuantity(1)
        setAssignNotes("")
        // Refresh both lists
        await Promise.all([fetchAvailableEquipment(), fetchAssignedEquipment()])
      } else {
        throw new Error(result.error || "Failed to assign equipment")
      }
    } catch (error) {
      console.error("[v0] Error assigning equipment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign equipment",
        variant: "destructive",
      })
    }
  }

  const handleUnassignEquipment = async (equipmentId: number) => {
    if (!confirm("Are you sure you want to unassign this equipment?")) return

    try {
      const response = await fetch(`/api/customers/${customerId}/equipment/${equipmentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Equipment unassigned successfully",
        })
        // Refresh both lists
        await Promise.all([fetchAvailableEquipment(), fetchAssignedEquipment()])
      } else {
        throw new Error("Failed to unassign equipment")
      }
    } catch (error) {
      console.error("Error unassigning equipment:", error)
      toast({
        title: "Error",
        description: "Failed to unassign equipment",
        variant: "destructive",
      })
    }
  }

  const handleReturnEquipment = async () => {
    if (!selectedEquipment) return

    console.log("[v0] Starting equipment return:", {
      equipmentId: selectedEquipment.id,
      condition: returnCondition,
      serialMatch: serialVerification === selectedEquipment.serial_number,
    })

    try {
      const response = await fetch(`/api/customers/${customerId}/equipment/${selectedEquipment.id}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          return_condition: returnCondition,
          return_reason: returnReason,
          serial_number_verification: serialVerification,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setShowReturnModal(false)
        setSelectedEquipment(null)
        setReturnCondition("")
        setReturnReason("")
        setSerialVerification("")
        await fetchAssignedEquipment()
      } else {
        throw new Error(result.error || "Failed to return equipment")
      }
    } catch (error) {
      console.error("[v0] Error returning equipment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to return equipment",
        variant: "destructive",
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "network equipment":
        return <Router className="h-4 w-4" />
      case "wireless equipment":
        return <Wifi className="h-4 w-4" />
      case "server equipment":
        return <Server className="h-4 w-4" />
      case "cables & accessories":
        return <Cable className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const filteredEquipment = availableEquipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(availableEquipment.map((item) => item.category)))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading equipment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Assigned Equipment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Assigned Equipment
              </CardTitle>
              <CardDescription>Equipment currently assigned to this customer</CardDescription>
            </div>
            <Button onClick={() => setShowAssignModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Equipment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignedEquipment.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedEquipment.map((equipment) => (
                  <TableRow key={equipment.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(equipment.equipment_type)}
                        {equipment.equipment_name}
                      </div>
                    </TableCell>
                    <TableCell>{equipment.equipment_type}</TableCell>
                    <TableCell className="font-mono text-sm">{equipment.serial_number || "N/A"}</TableCell>
                    <TableCell>{new Date(equipment.issued_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={equipment.status === "issued" ? "default" : "secondary"}>
                        {equipment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {equipment.monthly_cost ? `KES ${equipment.monthly_cost.toLocaleString()}` : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {equipment.status === "issued" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEquipment(equipment)
                              setShowReturnModal(true)
                            }}
                          >
                            Return
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnassignEquipment(equipment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Equipment Assigned</h3>
              <p className="text-gray-600 mb-4">This customer has no equipment assigned yet</p>
              <Button onClick={() => setShowAssignModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign First Equipment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Equipment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Available Equipment
              </CardTitle>
              <CardDescription>Equipment available for assignment from inventory</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search equipment by name, SKU, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEquipment.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Equipment Found</h3>
              <p className="text-gray-600">
                {searchQuery || categoryFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No equipment available in inventory"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEquipment.map((item) => (
                <Card key={item.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                      </div>
                      <Badge variant={item.stockQuantity > 0 ? "default" : "destructive"}>
                        {item.stockQuantity} in stock
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{item.category}</p>
                    <p className="text-xs text-muted-foreground mb-2">SKU: {item.sku}</p>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">KES {item.unitCost.toLocaleString()}</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item)
                          setShowAssignModal(true)
                        }}
                        disabled={item.stockQuantity === 0}
                      >
                        {item.stockQuantity === 0 ? (
                          <>
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Out of Stock
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Assign
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <Badge variant={item.stockQuantity > 0 ? "default" : "destructive"}>{item.stockQuantity}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">KES {item.unitCost.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.location || "N/A"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item)
                          setShowAssignModal(true)
                        }}
                        disabled={item.stockQuantity === 0}
                      >
                        {item.stockQuantity === 0 ? (
                          <>
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Out of Stock
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Assign
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Equipment</DialogTitle>
            <DialogDescription>Assign equipment to this customer and deduct from inventory</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getCategoryIcon(selectedItem.category)}
                  <h4 className="font-semibold">{selectedItem.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{selectedItem.category}</p>
                <p className="text-sm text-muted-foreground mb-1">SKU: {selectedItem.sku}</p>
                <p className="text-sm text-muted-foreground mb-2">{selectedItem.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Available: {selectedItem.stockQuantity}</span>
                  <span className="text-sm font-medium">KES {selectedItem.unitCost.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity to Assign</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedItem.stockQuantity}
                  value={assignQuantity}
                  onChange={(e) => setAssignQuantity(Number.parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this assignment..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Assigning this equipment will deduct {assignQuantity} unit(s) from inventory
                  stock.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignEquipment} disabled={!selectedItem}>
              Assign Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Equipment Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Return Equipment</DialogTitle>
            <DialogDescription>
              Record equipment return with condition and reason. Serial number verification is recommended.
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedEquipment.equipment_name}</h4>
                <p className="text-sm text-muted-foreground mb-1">Type: {selectedEquipment.equipment_type}</p>
                <p className="text-sm text-muted-foreground mb-1">
                  Serial: {selectedEquipment.serial_number || "Not recorded"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Issued: {new Date(selectedEquipment.issued_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <Label htmlFor="return-condition">Return Condition *</Label>
                <Select value={returnCondition} onValueChange={setReturnCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="working">Working - Fully functional</SelectItem>
                    <SelectItem value="damaged">Damaged - Repairable</SelectItem>
                    <SelectItem value="faulty">Faulty - Not working properly</SelectItem>
                    <SelectItem value="broken">Broken - Beyond repair</SelectItem>
                    <SelectItem value="missing_parts">Missing Parts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="return-reason">Return Reason *</Label>
                <Textarea
                  id="return-reason"
                  placeholder="Explain why the equipment is being returned..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                />
              </div>

              {selectedEquipment.serial_number && (
                <div>
                  <Label htmlFor="serial-verification">Serial Number Verification (Optional)</Label>
                  <Input
                    id="serial-verification"
                    placeholder="Enter serial number to verify"
                    value={serialVerification}
                    onChange={(e) => setSerialVerification(e.target.value)}
                  />
                  {serialVerification && serialVerification !== selectedEquipment.serial_number && (
                    <p className="text-sm text-red-600 mt-1">⚠️ Serial number does not match</p>
                  )}
                  {serialVerification && serialVerification === selectedEquipment.serial_number && (
                    <p className="text-sm text-green-600 mt-1">✓ Serial number verified</p>
                  )}
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This return will be tracked back to the supplier for quality analysis.
                  {(returnCondition === "working" || returnCondition === "damaged") &&
                    " Equipment will be returned to inventory."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReturnEquipment} disabled={!returnCondition || !returnReason}>
              Process Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

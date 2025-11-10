"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Search, Package, Plus } from "lucide-react"

interface AddEquipmentModalProps {
  customerId: number
  customerName: string
  onClose: () => void
  onSuccess: () => void
}

interface InventoryItem {
  id: number
  name: string
  sku: string
  category: string
  stock_quantity: number
  unit_cost: number
  serial_number?: string
}

export default function AddEquipmentModal({ customerId, customerName, onClose, onSuccess }: AddEquipmentModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [reason, setReason] = useState("")
  const [condition, setCondition] = useState("new")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(true)

  useEffect(() => {
    fetchInventoryItems()
  }, [])

  useEffect(() => {
    const filtered = inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredItems(filtered)
  }, [searchTerm, inventoryItems])

  const fetchInventoryItems = async () => {
    try {
      setLoadingItems(true)
      const response = await fetch("/api/inventory?status=active")
      const data = await response.json()
      if (data.success) {
        setInventoryItems(data.data?.items || [])
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
      toast.error("Failed to load inventory items")
    } finally {
      setLoadingItems(false)
    }
  }

  const handleAssignEquipment = async () => {
    if (!selectedItem) {
      toast.error("Please select an equipment item")
      return
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for assignment")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_item_id: selectedItem.id,
          customer_id: customerId,
          movement_type: "assigned",
          quantity: 1,
          reason: reason.trim(),
          condition_before: condition,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Equipment assigned successfully")
        onSuccess()
      } else {
        toast.error(data.error || "Failed to assign equipment")
      }
    } catch (error) {
      console.error("Error assigning equipment:", error)
      toast.error("Failed to assign equipment")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Equipment to {customerName}</DialogTitle>
          <DialogDescription>Search and assign equipment from inventory to this customer</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Equipment Selection */}
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {loadingItems ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading equipment...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No equipment found matching your search</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredItems.map((item) => (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all ${
                        selectedItem?.id === item.id ? "ring-2 ring-primary border-primary" : "hover:shadow-md"
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="w-8 h-8 text-blue-500" />
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                              <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={item.stock_quantity > 0 ? "default" : "destructive"}>
                              {item.stock_quantity} in stock
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">KSh {item.unit_cost.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assignment Details */}
          {selectedItem && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium">Assignment Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reason">Reason for Assignment *</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., New service installation"
                  />
                </div>

                <div>
                  <Label htmlFor="condition">Equipment Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about this assignment..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAssignEquipment} disabled={!selectedItem || !reason.trim() || isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Equipment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

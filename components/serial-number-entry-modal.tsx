"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Package } from "lucide-react"

interface SerialNumberItem {
  inventory_item_id: number
  item_name: string
  sku: string
  quantity_received: number
}

interface SerialNumberEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: SerialNumberItem[]
  onComplete: (serialNumbers: { [itemId: number]: string[] }) => void
  onSkip: () => void
}

export default function SerialNumberEntryModal({
  open,
  onOpenChange,
  items,
  onComplete,
  onSkip,
}: SerialNumberEntryModalProps) {
  const [serialNumbers, setSerialNumbers] = useState<{ [itemId: number]: string[] }>(() => {
    const initial: { [itemId: number]: string[] } = {}
    items.forEach((item) => {
      initial[item.inventory_item_id] = Array(item.quantity_received).fill("")
    })
    return initial
  })

  const updateSerialNumber = (itemId: number, index: number, value: string) => {
    setSerialNumbers((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((sn, i) => (i === index ? value : sn)),
    }))
  }

  const addSerialNumberField = (itemId: number) => {
    setSerialNumbers((prev) => ({
      ...prev,
      [itemId]: [...prev[itemId], ""],
    }))
  }

  const removeSerialNumberField = (itemId: number, index: number) => {
    setSerialNumbers((prev) => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, i) => i !== index),
    }))
  }

  const handleComplete = () => {
    // Filter out empty serial numbers
    const cleanedSerialNumbers: { [itemId: number]: string[] } = {}
    Object.entries(serialNumbers).forEach(([itemId, sns]) => {
      const filtered = sns.filter((sn) => sn.trim() !== "")
      if (filtered.length > 0) {
        cleanedSerialNumbers[Number(itemId)] = filtered
      }
    })
    onComplete(cleanedSerialNumbers)
  }

  const getTotalEntered = (itemId: number) => {
    return serialNumbers[itemId]?.filter((sn) => sn.trim() !== "").length || 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Enter Serial Numbers
          </DialogTitle>
          <DialogDescription>
            The following items require serial number tracking. Enter serial numbers for each unit received, or skip to
            proceed without serial numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.inventory_item_id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{item.item_name}</h4>
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                </div>
                <Badge
                  variant={getTotalEntered(item.inventory_item_id) === item.quantity_received ? "default" : "secondary"}
                >
                  {getTotalEntered(item.inventory_item_id)} / {item.quantity_received} entered
                </Badge>
              </div>

              <div className="space-y-2">
                {serialNumbers[item.inventory_item_id]?.map((sn, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`serial-${item.inventory_item_id}-${index}`} className="sr-only">
                        Serial Number {index + 1}
                      </Label>
                      <Input
                        id={`serial-${item.inventory_item_id}-${index}`}
                        placeholder={`Serial number ${index + 1}`}
                        value={sn}
                        onChange={(e) => updateSerialNumber(item.inventory_item_id, index, e.target.value)}
                      />
                    </div>
                    {serialNumbers[item.inventory_item_id].length > item.quantity_received && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeSerialNumberField(item.inventory_item_id, index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addSerialNumberField(item.inventory_item_id)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Serial Number
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Serial numbers help track equipment from supplier to customer, including returns and
            quality issues. You can skip this step and add serial numbers later if needed.
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip Serial Numbers
          </Button>
          <Button onClick={handleComplete}>Complete & Generate Invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { addFuelLog } from "@/app/actions/vehicle-actions"
import { toast } from "sonner"
import { Fuel, Calculator } from "lucide-react"

interface Vehicle {
  id: number
  name: string
  type: string
  registration: string
  fuel_type: string
  mileage: number
}

interface FuelLogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle
  onSuccess: () => void
}

export function FuelLogModal({ open, onOpenChange, vehicle, onSuccess }: FuelLogModalProps) {
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [pricePerLiter, setPricePerLiter] = useState("")
  const [totalCost, setTotalCost] = useState("")

  const calculateCost = (qty: string, price: string) => {
    const q = Number.parseFloat(qty) || 0
    const p = Number.parseFloat(price) || 0
    const total = q * p
    setTotalCost(total.toFixed(2))
  }

  const handleQuantityChange = (value: string) => {
    setQuantity(value)
    calculateCost(value, pricePerLiter)
  }

  const handlePriceChange = (value: string) => {
    setPricePerLiter(value)
    calculateCost(quantity, value)
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      formData.append("vehicle_id", vehicle.id.toString())
      formData.append("cost", totalCost)
      const result = await addFuelLog(formData)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to add fuel log")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Fuel className="h-5 w-5" />
            <span>Fuel Log - {vehicle.name}</span>
          </DialogTitle>
          <DialogDescription>Record fuel purchase for {vehicle.registration}</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fuel Purchase Details</CardTitle>
              <CardDescription>Enter the fuel purchase information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="log_date">Purchase Date</Label>
                  <Input
                    id="log_date"
                    name="log_date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Fuel Type</Label>
                  <Select name="fuel_type" defaultValue={vehicle.fuel_type} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric (kWh)</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (Liters/kWh)</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_liter">Price per Liter/kWh (KSh)</Label>
                  <Input
                    id="price_per_liter"
                    name="price_per_liter"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={pricePerLiter}
                    onChange={(e) => handlePriceChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Cost (KSh)</Label>
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold">{totalCost || "0.00"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="odometer_reading">Current Mileage/Hours</Label>
                  <Input
                    id="odometer_reading"
                    name="odometer_reading"
                    type="number"
                    defaultValue={vehicle.mileage}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Fuel Station/Location</Label>
                  <Input id="location" name="location" placeholder="e.g., Shell Westlands" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional notes about the fuel purchase..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fuel Efficiency Tracking</CardTitle>
              <CardDescription>Monitor fuel consumption patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">Current Vehicle</h4>
                  <p className="text-sm text-blue-800">{vehicle.name}</p>
                  <p className="text-sm text-blue-800">Type: {vehicle.type}</p>
                  <p className="text-sm text-blue-800">Fuel: {vehicle.fuel_type}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">Efficiency Tips</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Regular maintenance improves efficiency</li>
                    <li>• Check tire pressure monthly</li>
                    <li>• Avoid aggressive driving</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Fuel Purchase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

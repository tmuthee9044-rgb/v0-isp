"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { addVehicle } from "@/app/actions/vehicle-actions"
import { toast } from "sonner"

interface AddVehicleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddVehicleModal({ open, onOpenChange, onSuccess }: AddVehicleModalProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      const result = await addVehicle(formData)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to add vehicle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle/Equipment</DialogTitle>
          <DialogDescription>Add a new vehicle, generator, or equipment to your fleet</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Enter the basic details of the vehicle or equipment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name/Identifier</Label>
                      <Input id="name" name="name" placeholder="e.g., Service Van 01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select name="type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="motorbike">Motorbike</SelectItem>
                          <SelectItem value="generator">Generator</SelectItem>
                          <SelectItem value="bus">Bus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registration">Registration/Serial Number</Label>
                      <Input id="registration" name="registration" placeholder="e.g., KCA 123A or SN123456" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" name="model" placeholder="e.g., Toyota Hiace" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input id="year" name="year" type="number" min="1990" max="2030" placeholder="2020" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to">Assigned To</Label>
                      <Input id="assigned_to" name="assigned_to" placeholder="Employee name or department" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Current Location</Label>
                    <Input id="location" name="location" placeholder="e.g., Main Office, Warehouse" required />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                  <CardDescription>Technical details and performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuel_type">Fuel Type</Label>
                      <Select name="fuel_type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="petrol">Petrol</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="electric">Electric</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuel_consumption">Fuel Consumption (km/l or kWh/100km)</Label>
                      <Input
                        id="fuel_consumption"
                        name="fuel_consumption"
                        type="number"
                        step="0.1"
                        placeholder="12.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Current Mileage/Hours</Label>
                      <Input id="mileage" name="mileage" type="number" placeholder="50000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="engine_capacity">Engine Capacity (cc)</Label>
                      <Input id="engine_capacity" name="engine_capacity" type="number" placeholder="2000" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specifications">Additional Specifications</Label>
                    <Textarea
                      id="specifications"
                      name="specifications"
                      placeholder="Any additional technical specifications..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Information</CardTitle>
                  <CardDescription>Purchase and cost information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchase_date">Purchase Date</Label>
                      <Input id="purchase_date" name="purchase_date" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchase_cost">Purchase Cost (KSh)</Label>
                      <Input id="purchase_cost" name="purchase_cost" type="number" step="0.01" placeholder="1500000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depreciation_rate">Depreciation Rate (%/year)</Label>
                      <Input
                        id="depreciation_rate"
                        name="depreciation_rate"
                        type="number"
                        step="0.1"
                        placeholder="15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated_monthly_cost">Estimated Monthly Operating Cost</Label>
                      <Input
                        id="estimated_monthly_cost"
                        name="estimated_monthly_cost"
                        type="number"
                        step="0.01"
                        placeholder="25000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Documentation & Compliance</CardTitle>
                  <CardDescription>Legal documents and compliance dates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                      <Input id="insurance_expiry" name="insurance_expiry" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license_expiry">License/Permit Expiry</Label>
                      <Input id="license_expiry" name="license_expiry" type="date" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inspection_expiry">Inspection Expiry</Label>
                      <Input id="inspection_expiry" name="inspection_expiry" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                      <Input id="warranty_expiry" name="warranty_expiry" type="date" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Any additional notes or special requirements..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

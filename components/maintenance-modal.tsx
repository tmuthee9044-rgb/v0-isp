"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { addMaintenanceLog } from "@/app/actions/vehicle-actions"
import { toast } from "sonner"
import { Wrench, Calendar } from "lucide-react"

interface Vehicle {
  id: number
  name: string
  type: string
  registration: string
  mileage: number
}

interface MaintenanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle
  onSuccess: () => void
}

export function MaintenanceModal({ open, onOpenChange, vehicle, onSuccess }: MaintenanceModalProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      formData.append("vehicle_id", vehicle.id.toString())
      const result = await addMaintenanceLog(formData)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to add maintenance log")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Maintenance Log - {vehicle.name}</span>
          </DialogTitle>
          <DialogDescription>Record maintenance service for {vehicle.registration}</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Details</CardTitle>
              <CardDescription>Enter the maintenance service information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_date">Service Date</Label>
                  <Input
                    id="service_date"
                    name="service_date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_type">Service Type</Label>
                  <Select name="service_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine Maintenance</SelectItem>
                      <SelectItem value="oil_change">Oil Change</SelectItem>
                      <SelectItem value="tire_service">Tire Service</SelectItem>
                      <SelectItem value="brake_service">Brake Service</SelectItem>
                      <SelectItem value="engine_service">Engine Service</SelectItem>
                      <SelectItem value="electrical">Electrical Repair</SelectItem>
                      <SelectItem value="body_work">Body Work</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="emergency">Emergency Repair</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Service Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe the maintenance work performed..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Service Cost (KSh)</Label>
                  <Input id="cost" name="cost" type="number" step="0.01" placeholder="0.00" required />
                </div>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_provider">Service Provider</Label>
                <Input
                  id="service_provider"
                  name="service_provider"
                  placeholder="e.g., ABC Motors, In-house mechanic"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parts_replaced">Parts Replaced/Serviced</Label>
                <Textarea
                  id="parts_replaced"
                  name="parts_replaced"
                  placeholder="List parts that were replaced or serviced..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Next Service</span>
              </CardTitle>
              <CardDescription>Schedule the next maintenance service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="next_service_date">Next Service Date</Label>
                <Input
                  id="next_service_date"
                  name="next_service_date"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Service Recommendations</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Oil change: Every 5,000-10,000 km</li>
                  <li>• Tire rotation: Every 10,000-15,000 km</li>
                  <li>• Brake inspection: Every 20,000 km</li>
                  <li>• Major service: Every 40,000 km</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Maintenance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

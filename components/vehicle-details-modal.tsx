"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { updateVehicle } from "@/app/actions/vehicle-actions"
import { toast } from "sonner"
import { Car, Wrench, Calendar, DollarSign, MapPin, FileText, AlertTriangle } from "lucide-react"

interface Vehicle {
  id: number
  name: string
  type: string
  status: string
  registration: string
  model: string
  year: number
  fuel_type: string
  assigned_to: string
  location: string
  mileage: number
  fuel_consumption: number
  insurance_expiry: string
  license_expiry: string
  last_service: string
  next_service: string
  monthly_cost: number
  created_at: string
}

interface VehicleDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle
  onUpdate: () => void
}

export function VehicleDetailsModal({ open, onOpenChange, vehicle, onUpdate }: VehicleDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      const result = await updateVehicle(vehicle.id, formData)
      if (result.success) {
        toast.success(result.message)
        setIsEditing(false)
        onUpdate()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update vehicle")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "maintenance":
        return "secondary"
      case "repair":
        return "destructive"
      case "inactive":
        return "outline"
      default:
        return "default"
    }
  }

  const isOverdue = (date: string) => {
    return new Date(date) < new Date()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>{vehicle.name}</span>
                <Badge variant={getStatusColor(vehicle.status) as any}>{vehicle.status}</Badge>
              </DialogTitle>
              <DialogDescription>
                {vehicle.model} • {vehicle.registration}
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </DialogHeader>

        <form action={handleSubmit}>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      {isEditing ? (
                        <Input id="name" name="name" defaultValue={vehicle.name} required />
                      ) : (
                        <p className="text-sm font-medium">{vehicle.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      {isEditing ? (
                        <Select name="type" defaultValue={vehicle.type}>
                          <SelectTrigger>
                            <SelectValue />
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
                      ) : (
                        <p className="text-sm font-medium capitalize">{vehicle.type}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registration">Registration</Label>
                      {isEditing ? (
                        <Input id="registration" name="registration" defaultValue={vehicle.registration} required />
                      ) : (
                        <p className="text-sm font-medium">{vehicle.registration}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assigned_to">Assigned To</Label>
                      {isEditing ? (
                        <Input id="assigned_to" name="assigned_to" defaultValue={vehicle.assigned_to} required />
                      ) : (
                        <p className="text-sm font-medium">{vehicle.assigned_to}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      {isEditing ? (
                        <Input id="location" name="location" defaultValue={vehicle.location} required />
                      ) : (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm font-medium">{vehicle.location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status & Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      {isEditing ? (
                        <Select name="status" defaultValue={vehicle.status}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="repair">Repair</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getStatusColor(vehicle.status) as any}>{vehicle.status}</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Current Mileage/Hours</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold">{(vehicle.mileage || 0).toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">
                          {vehicle.type === "generator" ? "hours" : "km"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Monthly Cost</Label>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-lg font-bold">KSh {(vehicle.monthly_cost || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Fuel Efficiency</Label>
                      <p className="text-sm font-medium">{vehicle.fuel_consumption || 0} km/l</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      {isEditing ? (
                        <Input id="model" name="model" defaultValue={vehicle.model} required />
                      ) : (
                        <p className="text-sm font-medium">{vehicle.model}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      {isEditing ? (
                        <Input id="year" name="year" type="number" defaultValue={vehicle.year} required />
                      ) : (
                        <p className="text-sm font-medium">{vehicle.year}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuel_type">Fuel Type</Label>
                      {isEditing ? (
                        <Select name="fuel_type" defaultValue={vehicle.fuel_type}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="petrol">Petrol</SelectItem>
                            <SelectItem value="diesel">Diesel</SelectItem>
                            <SelectItem value="electric">Electric</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-medium capitalize">{vehicle.fuel_type}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fuel_consumption">Fuel Consumption</Label>
                      {isEditing ? (
                        <Input
                          id="fuel_consumption"
                          name="fuel_consumption"
                          type="number"
                          step="0.1"
                          defaultValue={vehicle.fuel_consumption}
                        />
                      ) : (
                        <p className="text-sm font-medium">{vehicle.fuel_consumption || 0} km/l</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage">Current Mileage/Hours</Label>
                    {isEditing ? (
                      <Input id="mileage" name="mileage" type="number" defaultValue={vehicle.mileage} />
                    ) : (
                      <p className="text-sm font-medium">
                        {(vehicle.mileage || 0).toLocaleString()} {vehicle.type === "generator" ? "hours" : "km"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Wrench className="h-4 w-4" />
                      <span>Service History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Last Service</Label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {vehicle.last_service
                            ? new Date(vehicle.last_service).toLocaleDateString()
                            : "No service recorded"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Next Service Due</Label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span
                          className={`text-sm font-medium ${isOverdue(vehicle.next_service) ? "text-red-600" : ""}`}
                        >
                          {vehicle.next_service ? new Date(vehicle.next_service).toLocaleDateString() : "Not scheduled"}
                        </span>
                        {isOverdue(vehicle.next_service) && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Service Status</Label>
                      <Badge variant={isOverdue(vehicle.next_service) ? "destructive" : "default"}>
                        {isOverdue(vehicle.next_service) ? "Overdue" : "Up to date"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance Alerts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isOverdue(vehicle.next_service) && (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">Service overdue</span>
                      </div>
                    )}

                    {isOverdue(vehicle.insurance_expiry) && (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">Insurance expired</span>
                      </div>
                    )}

                    {!isOverdue(vehicle.next_service) && !isOverdue(vehicle.insurance_expiry) && (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-green-800">All maintenance up to date</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Cost Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Monthly Operating Cost</Label>
                      <div className="text-2xl font-bold">KSh {(vehicle.monthly_cost || 0).toLocaleString()}</div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cost per KM</Label>
                      <div className="text-2xl font-bold">
                        KSh{" "}
                        {vehicle.mileage && vehicle.monthly_cost
                          ? Math.round((vehicle.monthly_cost / vehicle.mileage) * 100) / 100
                          : 0}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Fuel Costs (Est.)</span>
                      <span className="font-bold">
                        KSh {Math.round((vehicle.monthly_cost || 0) * 0.6).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Maintenance Costs</span>
                      <span className="font-bold">
                        KSh {Math.round((vehicle.monthly_cost || 0) * 0.3).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Insurance & Other</span>
                      <span className="font-bold">
                        KSh {Math.round((vehicle.monthly_cost || 0) * 0.1).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Documentation & Compliance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                      {isEditing ? (
                        <Input
                          id="insurance_expiry"
                          name="insurance_expiry"
                          type="date"
                          defaultValue={vehicle.insurance_expiry?.split("T")[0]}
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-medium ${isOverdue(vehicle.insurance_expiry) ? "text-red-600" : ""}`}
                          >
                            {vehicle.insurance_expiry
                              ? new Date(vehicle.insurance_expiry).toLocaleDateString()
                              : "Not set"}
                          </span>
                          {isOverdue(vehicle.insurance_expiry) && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="license_expiry">License Expiry</Label>
                      {isEditing ? (
                        <Input
                          id="license_expiry"
                          name="license_expiry"
                          type="date"
                          defaultValue={vehicle.license_expiry?.split("T")[0]}
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-medium ${isOverdue(vehicle.license_expiry) ? "text-red-600" : ""}`}
                          >
                            {vehicle.license_expiry ? new Date(vehicle.license_expiry).toLocaleDateString() : "Not set"}
                          </span>
                          {isOverdue(vehicle.license_expiry) && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Registration Date</Label>
                    <p className="text-sm font-medium">{new Date(vehicle.created_at).toLocaleDateString()}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Compliance Status</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Insurance</span>
                        <Badge variant={isOverdue(vehicle.insurance_expiry) ? "destructive" : "default"}>
                          {isOverdue(vehicle.insurance_expiry) ? "Expired" : "Valid"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">License</span>
                        <Badge variant={isOverdue(vehicle.license_expiry) ? "destructive" : "default"}>
                          {isOverdue(vehicle.license_expiry) ? "Expired" : "Valid"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {isEditing && (
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Vehicle"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

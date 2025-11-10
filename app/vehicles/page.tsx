"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Truck,
  Plus,
  Fuel,
  Wrench,
  Car,
  Bike,
  Zap,
  Bus,
  Search,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  MapPin,
  FileText,
  TrendingUp,
  Activity,
} from "lucide-react"
import { AddVehicleModal } from "@/components/add-vehicle-modal"
import { VehicleDetailsModal } from "@/components/vehicle-details-modal"
import { MaintenanceModal } from "@/components/maintenance-modal"
import { FuelLogModal } from "@/components/fuel-log-modal"
import { BusFareModal } from "@/components/bus-fare-modal"
import { getVehicles, getVehicleStats } from "@/app/actions/vehicle-actions"

interface Vehicle {
  id: number
  name: string
  type: "van" | "truck" | "car" | "motorbike" | "generator" | "bus"
  status: "active" | "maintenance" | "inactive" | "repair"
  mileage: number
  last_service: string
  next_service: string
  fuel_type: "petrol" | "diesel" | "electric" | "hybrid"
  registration: string
  model: string
  year: number
  assigned_to: string
  location: string
  insurance_expiry: string
  license_expiry: string
  monthly_cost: number
  fuel_consumption: number
  last_fuel_date: string
  maintenance_cost: number
  created_at: string
}

interface VehicleStats {
  total_vehicles: number
  active_vehicles: number
  maintenance_vehicles: number
  total_fuel_cost: number
  total_maintenance_cost: number
  monthly_operating_cost: number
  fuel_efficiency: number
  overdue_maintenance: number
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [stats, setStats] = useState<VehicleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showFuelModal, setShowFuelModal] = useState(false)
  const [showBusFareModal, setShowBusFareModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [vehiclesData, statsData] = await Promise.all([getVehicles(), getVehicleStats()])
      setVehicles(vehiclesData)
      setStats(statsData)
    } catch (error) {
      console.error("Error loading vehicle data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.assigned_to.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || vehicle.type === filterType
    const matchesStatus = filterStatus === "all" || vehicle.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "van":
        return <Truck className="h-4 w-4" />
      case "truck":
        return <Truck className="h-4 w-4" />
      case "car":
        return <Car className="h-4 w-4" />
      case "motorbike":
        return <Bike className="h-4 w-4" />
      case "generator":
        return <Zap className="h-4 w-4" />
      case "bus":
        return <Bus className="h-4 w-4" />
      default:
        return <Car className="h-4 w-4" />
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

  if (loading) {
    return <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">Loading...</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Vehicle Management</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowBusFareModal(true)} variant="outline">
            <Bus className="mr-2 h-4 w-4" />
            Bus Fare
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_vehicles || 0}</div>
            <p className="text-xs text-muted-foreground">All vehicles & equipment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_vehicles || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_vehicles ? Math.round((stats.active_vehicles / stats.total_vehicles) * 100) : 0}% active
              rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {(stats?.monthly_operating_cost || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Fuel + Maintenance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overdue_maintenance || 0}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fleet" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fleet">Fleet Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Management</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Management</CardTitle>
              <CardDescription>Monitor and manage all vehicles and equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vehicles, registration, or assigned person..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="van">Vans</SelectItem>
                    <SelectItem value="truck">Trucks</SelectItem>
                    <SelectItem value="car">Cars</SelectItem>
                    <SelectItem value="motorbike">Motorbikes</SelectItem>
                    <SelectItem value="generator">Generators</SelectItem>
                    <SelectItem value="bus">Buses</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Mileage/Hours</TableHead>
                    <TableHead>Next Service</TableHead>
                    <TableHead>Monthly Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getVehicleIcon(vehicle.type)}
                          <div>
                            <div className="font-medium">{vehicle.name}</div>
                            <div className="text-sm text-muted-foreground">{vehicle.registration}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{vehicle.type}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(vehicle.status) as any}>{vehicle.status}</Badge>
                      </TableCell>
                      <TableCell>{vehicle.assigned_to}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm">{vehicle.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicle.type === "generator"
                          ? `${vehicle.mileage || 0} hrs`
                          : `${(vehicle.mileage || 0).toLocaleString()} km`}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(vehicle.next_service).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>KSh {(vehicle.monthly_cost || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVehicle(vehicle)
                              setShowDetailsModal(true)
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVehicle(vehicle)
                              setShowMaintenanceModal(true)
                            }}
                          >
                            <Wrench className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVehicle(vehicle)
                              setShowFuelModal(true)
                            }}
                          >
                            <Fuel className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overdue Maintenance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats?.overdue_maintenance || 0}</div>
                <p className="text-sm text-muted-foreground">Vehicles requiring immediate attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">KSh {(stats?.total_maintenance_cost || 0).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Total maintenance cost</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">5</div>
                <p className="text-sm text-muted-foreground">Upcoming maintenance</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fuel" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Fuel Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">KSh {(stats?.total_fuel_cost || 0).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">All vehicles combined</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fuel Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.fuel_efficiency || 0} km/l</div>
                <p className="text-sm text-muted-foreground">Fleet average</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Petrol Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{vehicles.filter((v) => v.fuel_type === "petrol").length}</div>
                <p className="text-sm text-muted-foreground">Using petrol</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diesel Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{vehicles.filter((v) => v.fuel_type === "diesel").length}</div>
                <p className="text-sm text-muted-foreground">Using diesel</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Monthly operating costs by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Fuel Costs</span>
                  <span className="font-bold">KSh {(stats?.total_fuel_cost || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Maintenance Costs</span>
                  <span className="font-bold">KSh {(stats?.total_maintenance_cost || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Insurance</span>
                  <span className="font-bold">KSh 45,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bus Fare Reimbursements</span>
                  <span className="font-bold">KSh 12,500</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>Total Monthly Cost</span>
                    <span>KSh {(stats?.monthly_operating_cost || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate Reports</CardTitle>
                <CardDescription>Create detailed vehicle reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-transparent" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Vehicle Utilization Report
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Cost Analysis Report
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <Activity className="mr-2 h-4 w-4" />
                  Maintenance Schedule Report
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  <Fuel className="mr-2 h-4 w-4" />
                  Fuel Consumption Report
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Average Vehicle Age</span>
                  <span className="font-bold">3.2 years</span>
                </div>
                <div className="flex justify-between">
                  <span>Fleet Utilization</span>
                  <span className="font-bold">87.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost per KM</span>
                  <span className="font-bold">KSh 45</span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance Compliance</span>
                  <span className="font-bold">92%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddVehicleModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={loadData} />

      {selectedVehicle && (
        <>
          <VehicleDetailsModal
            open={showDetailsModal}
            onOpenChange={setShowDetailsModal}
            vehicle={selectedVehicle}
            onUpdate={loadData}
          />
          <MaintenanceModal
            open={showMaintenanceModal}
            onOpenChange={setShowMaintenanceModal}
            vehicle={selectedVehicle}
            onSuccess={loadData}
          />
          <FuelLogModal
            open={showFuelModal}
            onOpenChange={setShowFuelModal}
            vehicle={selectedVehicle}
            onSuccess={loadData}
          />
        </>
      )}

      <BusFareModal open={showBusFareModal} onOpenChange={setShowBusFareModal} onSuccess={loadData} />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Download, TrendingUp, DollarSign, Users, AlertTriangle, RefreshCw, Award, UserX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReportData {
  financial: {
    valuation: any[]
    turnover: any[]
    supplierCosts: any[]
    abcAnalysis: any[]
    summary: any
  }
  employeeInventory: {
    assignments: any[]
    employeeSummary: any[]
    departmentSummary: any[]
  }
  supplierQuality?: {
    suppliers: any[]
    summary: any
  }
  customerReturns?: {
    customers: any[]
    summary: any
  }
}

export default function InventoryReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState("financial")
  const [dateRange, setDateRange] = useState("30")
  const { toast } = useToast()

  const fetchReports = async () => {
    try {
      setLoading(true)
      const startDate = new Date(Date.now() - Number.parseInt(dateRange) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
      const endDate = new Date().toISOString().split("T")[0]

      const [financialResponse, employeeResponse, supplierQualityResponse, customerReturnsResponse] = await Promise.all(
        [
          fetch(`/api/inventory/reports/financial?startDate=${startDate}`),
          fetch("/api/inventory/reports/employee-inventory"),
          fetch(`/api/inventory/reports/supplier-quality?start_date=${startDate}&end_date=${endDate}`),
          fetch(`/api/inventory/reports/customer-returns?start_date=${startDate}&end_date=${endDate}`),
        ],
      )

      const [financialData, employeeData, supplierQualityData, customerReturnsData] = await Promise.all([
        financialResponse.json(),
        employeeResponse.json(),
        supplierQualityResponse.json(),
        customerReturnsResponse.json(),
      ])

      setReportData({
        financial: financialData.data,
        employeeInventory: employeeData.data,
        supplierQuality: supplierQualityData.success ? supplierQualityData : undefined,
        customerReturns: customerReturnsData.success ? customerReturnsData : undefined,
      })
    } catch (error) {
      console.error("Error fetching reports:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory reports",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [dateRange])

  const handleExport = async (reportType: string, format: string) => {
    try {
      const response = await fetch("/api/inventory/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, format }),
      })

      if (response.ok) {
        if (format === "csv") {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${reportType}-report.csv`
          a.click()
        } else {
          const data = await response.json()
          console.log("Export data:", data)
        }

        toast({
          title: "Success",
          description: `${reportType} report exported successfully`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      })
    }
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading inventory reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventory Reports</h2>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport("stock-levels", "csv")}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {reportData?.financial && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KSh {reportData.financial.summary?.total_inventory_value?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {reportData.financial.summary?.total_categories || 0} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fast Moving Items</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reportData.financial.turnover?.filter((item: any) => item.movement_category === "Fast Moving")
                  .length || 0}
              </div>
              <p className="text-xs text-muted-foreground">High turnover items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slow Moving Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reportData.financial.turnover?.filter((item: any) => item.movement_category === "Slow Moving")
                  .length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.financial.supplierCosts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Supplier relationships</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedReport} onValueChange={setSelectedReport} className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
          <TabsTrigger value="turnover">Turnover Analysis</TabsTrigger>
          <TabsTrigger value="employee">Employee Inventory</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Performance</TabsTrigger>
          <TabsTrigger value="supplier-quality">Supplier Quality</TabsTrigger>
          <TabsTrigger value="customer-returns">Customer Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData?.financial.valuation || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`KSh ${Number(value).toLocaleString()}`, "Value"]} />
                    <Bar dataKey="total_value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ABC Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={
                        reportData?.financial.abcAnalysis?.reduce((acc: any[], item: any) => {
                          const existing = acc.find((a) => a.classification === item.abc_classification)
                          if (existing) {
                            existing.value += item.total_value
                            existing.count += 1
                          } else {
                            acc.push({
                              classification: item.abc_classification,
                              value: item.total_value,
                              count: 1,
                            })
                          }
                          return acc
                        }, []) || []
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ classification, count }) => `${classification} (${count})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData?.financial.abcAnalysis?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`KSh ${Number(value).toLocaleString()}`, "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="turnover" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Turnover Analysis</CardTitle>
              <CardDescription>Items ranked by turnover ratio and movement frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Items Issued</TableHead>
                    <TableHead>Turnover Ratio</TableHead>
                    <TableHead>Movement Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.financial.turnover?.slice(0, 10).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.stock_quantity}</TableCell>
                      <TableCell>{item.items_issued}</TableCell>
                      <TableCell>{item.turnover_ratio}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.movement_category === "Fast Moving"
                              ? "default"
                              : item.movement_category === "Medium Moving"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {item.movement_category}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData?.employeeInventory.departmentSummary || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`KSh ${Number(value).toLocaleString()}`, "Active Value"]} />
                    <Bar dataKey="active_value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Employees by Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Active Items</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData?.employeeInventory.employeeSummary?.slice(0, 5).map((employee: any) => (
                      <TableRow key={employee.employee_id}>
                        <TableCell className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{employee.active_assignments}</TableCell>
                        <TableCell>KSh {Number(employee.active_value).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="supplier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>Supplier inventory value and cost analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items Supplied</TableHead>
                    <TableHead>Inventory Value</TableHead>
                    <TableHead>Avg Item Cost</TableHead>
                    <TableHead>Total Purchases</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.financial.supplierCosts?.map((supplier: any) => (
                    <TableRow key={supplier.supplier_name}>
                      <TableCell className="font-medium">{supplier.supplier_name}</TableCell>
                      <TableCell>{supplier.items_supplied}</TableCell>
                      <TableCell>KSh {Number(supplier.total_inventory_value).toLocaleString()}</TableCell>
                      <TableCell>KSh {Number(supplier.avg_item_cost).toLocaleString()}</TableCell>
                      <TableCell>KSh {Number(supplier.total_purchase_value).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier-quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Excellent Suppliers</CardTitle>
                <Award className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reportData?.supplierQuality?.summary?.excellent_suppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">&gt;=5% fault rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Good Suppliers</CardTitle>
                <Award className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {reportData?.supplierQuality?.summary?.good_suppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">&gt;=15% fault rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fair Suppliers</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {reportData?.supplierQuality?.summary?.fair_suppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">&gt;=30% fault rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Poor Suppliers</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {reportData?.supplierQuality?.summary?.poor_suppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">&gt;30% fault rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supplier Quality Analysis</CardTitle>
              <CardDescription>Equipment return tracking with fault rates and quality recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Total Returns</TableHead>
                    <TableHead>Faulty/Broken</TableHead>
                    <TableHead>Working Returns</TableHead>
                    <TableHead>Fault Rate</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.supplierQuality?.suppliers?.map((supplier: any) => (
                    <TableRow key={supplier.supplier_id}>
                      <TableCell className="font-medium">{supplier.company_name}</TableCell>
                      <TableCell>{supplier.total_returns}</TableCell>
                      <TableCell className="text-red-600">
                        {Number.parseInt(supplier.faulty_returns) + Number.parseInt(supplier.broken_returns)}
                      </TableCell>
                      <TableCell className="text-green-600">{supplier.working_returns}</TableCell>
                      <TableCell>
                        <Badge variant={Number.parseFloat(supplier.fault_rate) > 15 ? "destructive" : "default"}>
                          {supplier.fault_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{supplier.quality_score}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            supplier.rating === "Excellent"
                              ? "default"
                              : supplier.rating === "Good"
                                ? "secondary"
                                : supplier.rating === "Fair"
                                  ? "outline"
                                  : "destructive"
                          }
                        >
                          {supplier.rating}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{supplier.recommendation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer-returns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">No Returns</CardTitle>
                <Award className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reportData?.customerReturns?.summary?.no_returns || 0}
                </div>
                <p className="text-xs text-muted-foreground">Best customers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Return Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {reportData?.customerReturns?.summary?.low_return_rate || 0}
                </div>
                <p className="text-xs text-muted-foreground">&lt;=10% return rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Moderate Returns</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {reportData?.customerReturns?.summary?.moderate_return_rate || 0}
                </div>
                <p className="text-xs text-muted-foreground">10-30% return rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {reportData?.customerReturns?.summary?.high_risk_customers || 0}
                </div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Return Rate Analysis</CardTitle>
              <CardDescription>Customers ranked by return rates - lowest to highest (best to worst)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Equipment</TableHead>
                    <TableHead>Total Returns</TableHead>
                    <TableHead>Working Returns</TableHead>
                    <TableHead>Problem Returns</TableHead>
                    <TableHead>Return Rate</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.customerReturns?.customers?.map((customer: any) => (
                    <TableRow key={customer.customer_id}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>{customer.total_equipment_assigned}</TableCell>
                      <TableCell>{customer.total_returns}</TableCell>
                      <TableCell className="text-green-600">{customer.working_returns}</TableCell>
                      <TableCell className="text-red-600">{customer.problem_returns}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            Number.parseFloat(customer.return_rate) > 30
                              ? "destructive"
                              : Number.parseFloat(customer.return_rate) > 10
                                ? "outline"
                                : "default"
                          }
                        >
                          {customer.return_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            customer.risk_level === "high"
                              ? "destructive"
                              : customer.risk_level === "medium"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {customer.risk_level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

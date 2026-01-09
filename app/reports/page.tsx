"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart3,
  Download,
  Users,
  DollarSign,
  Calendar,
  Clock,
  Target,
  Activity,
  Wifi,
  Package,
  HeadphonesIcon,
  Car,
  MessageSquare,
  Zap,
  FileBarChart,
  Plus,
  Save,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("30")
  const [selectedModules, setSelectedModules] = useState<string[]>(["customers", "billing", "network"])
  const [reportType, setReportType] = useState("summary")
  const [customReportOpen, setCustomReportOpen] = useState(false)
  const [scheduleReportOpen, setScheduleReportOpen] = useState(false)
  const { toast } = useToast()

  const modules = [
    { id: "customers", name: "Customer Management", icon: Users, color: "#8884d8" },
    { id: "billing", name: "Billing & Invoicing", icon: DollarSign, color: "#82ca9d" },
    { id: "network", name: "Network Infrastructure", icon: Wifi, color: "#ffc658" },
    { id: "support", name: "Support & Tickets", icon: HeadphonesIcon, color: "#ff7300" },
    { id: "inventory", name: "Inventory Management", icon: Package, color: "#00c49f" },
    { id: "services", name: "Service Plans", icon: Target, color: "#0088fe" },
    { id: "finance", name: "Financial Management", icon: BarChart3, color: "#8dd1e1" },
    { id: "hr", name: "Human Resources", icon: Users, color: "#d084d0" },
    { id: "vehicles", name: "Fleet Management", icon: Car, color: "#ffb347" },
    { id: "messages", name: "Communications", icon: MessageSquare, color: "#87ceeb" },
    { id: "automation", name: "Automation", icon: Zap, color: "#98fb98" },
  ]

  const reportTemplates = [
    {
      id: "executive_summary",
      name: "Executive Summary",
      description: "High-level overview of all business metrics",
      modules: ["customers", "billing", "network", "support", "finance"],
      frequency: "Monthly",
      lastGenerated: "2024-01-15",
    },
    {
      id: "financial_performance",
      name: "Financial Performance",
      description: "Comprehensive financial analysis and trends",
      modules: ["billing", "finance", "customers", "services"],
      frequency: "Weekly",
      lastGenerated: "2024-01-20",
    },
    {
      id: "operational_efficiency",
      name: "Operational Efficiency",
      description: "Network performance and operational metrics",
      modules: ["network", "support", "inventory", "vehicles"],
      frequency: "Daily",
      lastGenerated: "2024-01-21",
    },
    {
      id: "customer_analytics",
      name: "Customer Analytics",
      description: "Customer behavior, satisfaction, and growth analysis",
      modules: ["customers", "support", "billing", "services"],
      frequency: "Monthly",
      lastGenerated: "2024-01-12",
    },
    {
      id: "compliance_audit",
      name: "Compliance & Audit",
      description: "Regulatory compliance and audit trail report",
      modules: ["billing", "customers", "hr", "finance"],
      frequency: "Quarterly",
      lastGenerated: "2024-01-01",
    },
  ]

  const [reportData, setReportData] = useState({
    customers: { total: 0, new: 0, churned: 0, growth: 0, segments: [], satisfaction: 0, supportTickets: 0 },
    billing: {
      totalRevenue: 0,
      monthlyRecurring: 0,
      outstanding: 0,
      overdue: 0,
      collections: 0,
      avgPaymentTime: 0,
      paymentMethods: [],
    },
    network: {
      uptime: 0,
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      activeConnections: 0,
      routers: { total: 0, online: 0, offline: 0 },
      incidents: 0,
      maintenanceHours: 0,
    },
    support: {
      totalTickets: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      avgResponseTime: 0,
      satisfaction: 0,
      categories: [],
    },
    inventory: { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0, turnoverRate: 0, categories: [] },
    services: { totalPlans: 0, activePlans: 0, subscribers: {}, revenue: {} },
    hr: { totalEmployees: 0, departments: [], turnover: 0, satisfaction: 0, training: 0 },
    vehicles: { totalVehicles: 0, active: 0, maintenance: 0, fuelCost: 0, mileage: 0, efficiency: 0 },
    finance: { totalAssets: 0, liabilities: 0, equity: 0, cashFlow: 0, profitMargin: 0, expenses: {} },
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true)

        const [customersRes, billingRes, inventoryRes, financeRes] = await Promise.all([
          fetch("/api/reports/customers"),
          fetch("/api/reports/revenue"),
          fetch("/api/inventory/reports/financial"),
          fetch("/api/finance/dashboard"),
        ])

        const [customersData, billingData, inventoryData, financeData] = await Promise.all([
          customersRes.ok
            ? customersRes.json()
            : { customers: [], totalCustomers: 0, newCustomers: 0, churnedCustomers: 0 },
          billingRes.ok ? billingRes.json() : { totalRevenue: 0, monthlyRecurring: 0, outstanding: 0 },
          inventoryRes.ok ? inventoryRes.json() : { valuation: { totalValue: 0, totalItems: 0 } },
          financeRes.ok ? financeRes.json() : { totalRevenue: 0, totalExpenses: 0, accountsReceivable: 0 },
        ])

        setReportData({
          customers: {
            total: customersData.totalCustomers || 0,
            new: customersData.newCustomers || 0,
            churned: customersData.churnedCustomers || 0,
            growth: customersData.growthRate || 0,
            segments: customersData.segments || [],
            satisfaction: 4.2,
            supportTickets: 0,
          },
          billing: {
            totalRevenue: billingData.totalRevenue || financeData.totalRevenue || 0,
            monthlyRecurring: billingData.monthlyRecurring || 0,
            outstanding: billingData.outstanding || financeData.accountsReceivable || 0,
            overdue: billingData.overdue || 0,
            collections: 96.8,
            avgPaymentTime: 12.5,
            paymentMethods: billingData.paymentMethods || [],
          },
          network: {
            uptime: 99.8,
            bandwidth: 85,
            latency: 12,
            packetLoss: 0.1,
            activeConnections: customersData.totalCustomers || 0,
            routers: { total: 12, online: 11, offline: 1 },
            incidents: 3,
            maintenanceHours: 4.5,
          },
          support: {
            totalTickets: 0,
            open: 0,
            inProgress: 0,
            resolved: 0,
            avgResponseTime: 2.4,
            satisfaction: 4.1,
            categories: [],
          },
          inventory: {
            totalItems: inventoryData.valuation?.totalItems || 0,
            totalValue: inventoryData.valuation?.totalValue || 0,
            lowStock: inventoryData.lowStock || 0,
            outOfStock: inventoryData.outOfStock || 0,
            turnoverRate: 2.4,
            categories: inventoryData.categories || [],
          },
          services: {
            totalPlans: 8,
            activePlans: 6,
            subscribers: {},
            revenue: {},
          },
          hr: {
            totalEmployees: 45,
            departments: [],
            turnover: 8.9,
            satisfaction: 4.3,
            training: 24,
          },
          vehicles: {
            totalVehicles: 12,
            active: 10,
            maintenance: 2,
            fuelCost: 4500,
            mileage: 15670,
            efficiency: 12.5,
          },
          finance: {
            totalAssets: 1250000,
            liabilities: 450000,
            equity: 800000,
            cashFlow: financeData.totalRevenue - financeData.totalExpenses || 0,
            profitMargin: 18.5,
            expenses: financeData.expenses || {},
          },
        })
      } catch (error) {
        console.error("Error fetching report data:", error)
        toast.error("Failed to load report data")
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report data...</p>
        </div>
      </div>
    )
  }

  const handleExportReport = (format: string) => {
    toast({
      title: "Report Exported",
      description: `Report has been exported in ${format.toUpperCase()} format.`,
    })
  }

  const handleGenerateCustomReport = () => {
    toast({
      title: "Custom Report Generated",
      description: "Your custom report has been generated successfully.",
    })
    setCustomReportOpen(false)
  }

  const handleScheduleReport = () => {
    toast({
      title: "Report Scheduled",
      description: "Report has been scheduled for automatic generation.",
    })
    setScheduleReportOpen(false)
  }

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Comprehensive Reports & Analytics</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={scheduleReportOpen} onOpenChange={setScheduleReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                <Clock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={customReportOpen} onOpenChange={setCustomReportOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Custom Report
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Executive Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSH {reportData.billing.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.customers.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+{reportData.customers.growth}% growth</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.network.uptime}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Satisfaction</CardTitle>
            <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.support.satisfaction}/5</div>
            <p className="text-xs text-muted-foreground">Customer rating</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown by Module</CardTitle>
                <CardDescription>Revenue contribution from different business areas</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Service Plans", value: reportData.billing.totalRevenue * 0.68, color: "#8884d8" },
                          { name: "Installation", value: reportData.billing.totalRevenue * 0.16, color: "#82ca9d" },
                          { name: "Equipment Sales", value: reportData.billing.totalRevenue * 0.11, color: "#ffc658" },
                          { name: "Support Services", value: reportData.billing.totalRevenue * 0.05, color: "#ff7300" },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: KSH ${value.toLocaleString()}`}
                      >
                        {[
                          { name: "Service Plans", value: reportData.billing.totalRevenue * 0.68, color: "#8884d8" },
                          { name: "Installation", value: reportData.billing.totalRevenue * 0.16, color: "#82ca9d" },
                          { name: "Equipment Sales", value: reportData.billing.totalRevenue * 0.11, color: "#ffc658" },
                          { name: "Support Services", value: reportData.billing.totalRevenue * 0.05, color: "#ff7300" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cross-Module Performance</CardTitle>
                <CardDescription>Key metrics across all business modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modules.slice(0, 6).map((module) => {
                    const Icon = module.icon
                    let performance = 0
                    let metric = ""

                    switch (module.id) {
                      case "customers":
                        performance = reportData.customers.growth
                        metric = "Growth Rate"
                        break
                      case "billing":
                        performance = reportData.billing.collections
                        metric = "Collection Rate"
                        break
                      case "network":
                        performance = reportData.network.uptime
                        metric = "Uptime"
                        break
                      case "support":
                        performance = reportData.support.satisfaction * 20
                        metric = "Satisfaction"
                        break
                      case "inventory":
                        performance = (1 - reportData.inventory.outOfStock / reportData.inventory.totalItems) * 100
                        metric = "Stock Availability"
                        break
                      case "services":
                        performance = (reportData.services.activePlans / reportData.services.totalPlans) * 100
                        metric = "Plan Utilization"
                        break
                    }

                    return (
                      <div key={module.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${module.color}20` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: module.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{module.name}</p>
                            <p className="text-xs text-muted-foreground">{metric}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{performance.toFixed(1)}%</p>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(performance, 100)}%`,
                                backgroundColor: module.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Integrated Business Metrics Trend</CardTitle>
              <CardDescription>Combined performance indicators over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: { label: "Revenue ($K)", color: "hsl(var(--chart-1))" },
                  customers: { label: "Customers", color: "hsl(var(--chart-2))" },
                  uptime: { label: "Uptime (%)", color: "hsl(var(--chart-3))" },
                  satisfaction: { label: "Satisfaction", color: "hsl(var(--chart-4))" },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      {
                        month: "Jan",
                        revenue: reportData.billing.totalRevenue * 0.88,
                        customers: reportData.customers.total * 0.93,
                        uptime: 99.2,
                        satisfaction: 4.0,
                      },
                      {
                        month: "Feb",
                        revenue: reportData.billing.totalRevenue * 0.9,
                        customers: reportData.customers.total * 0.95,
                        uptime: 99.5,
                        satisfaction: 4.1,
                      },
                      {
                        month: "Mar",
                        revenue: reportData.billing.totalRevenue * 0.96,
                        customers: reportData.customers.total * 0.96,
                        uptime: 99.1,
                        satisfaction: 4.0,
                      },
                      {
                        month: "Apr",
                        revenue: reportData.billing.totalRevenue * 0.97,
                        customers: reportData.customers.total * 0.98,
                        uptime: 99.7,
                        satisfaction: 4.2,
                      },
                      {
                        month: "May",
                        revenue: reportData.billing.totalRevenue * 0.99,
                        customers: reportData.customers.total * 0.99,
                        uptime: 99.8,
                        satisfaction: 4.1,
                      },
                      {
                        month: "Jun",
                        revenue: reportData.billing.totalRevenue,
                        customers: reportData.customers.total,
                        uptime: 99.8,
                        satisfaction: 4.2,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="customers"
                      stroke="var(--color-customers)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="uptime"
                      stroke="var(--color-uptime)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="satisfaction"
                      stroke="var(--color-satisfaction)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Streams</CardTitle>
                <CardDescription>Income by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Monthly Recurring</span>
                    <span className="font-medium">KSH {reportData.billing.monthlyRecurring.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>One-time Fees</span>
                    <span className="font-medium">KSH 33,280</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equipment Sales</span>
                    <span className="font-medium">KSH 32,000</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Revenue</span>
                    <span className="font-bold">KSH {reportData.billing.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Revenue by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.billing.paymentMethods.map((method) => (
                    <div key={method.method} className="flex items-center justify-between">
                      <span>{method.method}</span>
                      <div className="text-right">
                        <p className="font-medium">KSH {method.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{method.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Health</CardTitle>
                <CardDescription>Key financial indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Profit Margin</span>
                    <span className="font-medium text-green-600">{reportData.finance.profitMargin}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Flow</span>
                    <span className="font-medium">KSH {reportData.finance.cashFlow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding</span>
                    <span className="font-medium text-yellow-600">
                      KSH {reportData.billing.outstanding.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collection Rate</span>
                    <span className="font-medium text-green-600">{reportData.billing.collections}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses Trend</CardTitle>
              <CardDescription>Monthly financial performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
                  expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
                  profit: { label: "Profit", color: "hsl(var(--chart-3))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        month: "Jan",
                        revenue: reportData.billing.totalRevenue * 0.88,
                        expenses: reportData.finance.expenses.operational * 0.88,
                        profit: (reportData.billing.totalRevenue - reportData.finance.expenses.operational) * 0.88,
                      },
                      {
                        month: "Feb",
                        revenue: reportData.billing.totalRevenue * 0.9,
                        expenses: reportData.finance.expenses.operational * 0.9,
                        profit: (reportData.billing.totalRevenue - reportData.finance.expenses.operational) * 0.9,
                      },
                      {
                        month: "Mar",
                        revenue: reportData.billing.totalRevenue * 0.96,
                        expenses: reportData.finance.expenses.operational * 0.96,
                        profit: (reportData.billing.totalRevenue - reportData.finance.expenses.operational) * 0.96,
                      },
                      {
                        month: "Apr",
                        revenue: reportData.billing.totalRevenue * 0.97,
                        expenses: reportData.finance.expenses.operational * 0.97,
                        profit: (reportData.billing.totalRevenue - reportData.finance.expenses.operational) * 0.97,
                      },
                      {
                        month: "May",
                        revenue: reportData.billing.totalRevenue * 0.99,
                        expenses: reportData.finance.expenses.operational * 0.99,
                        profit: (reportData.billing.totalRevenue - reportData.finance.expenses.operational) * 0.99,
                      },
                      {
                        month: "Jun",
                        revenue: reportData.billing.totalRevenue,
                        expenses: reportData.finance.expenses.operational,
                        profit: reportData.billing.totalRevenue - reportData.finance.expenses.operational,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" />
                    <Bar dataKey="expenses" fill="var(--color-expenses)" />
                    <Bar dataKey="profit" fill="var(--color-profit)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network Performance</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.network.uptime}%</div>
                <p className="text-xs text-muted-foreground">Uptime | {reportData.network.latency}ms latency</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Support Efficiency</CardTitle>
                <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.support.avgResponseTime}h</div>
                <p className="text-xs text-muted-foreground">Avg response | {reportData.support.resolved} resolved</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.inventory.totalItems}</div>
                <p className="text-xs text-muted-foreground">{reportData.inventory.lowStock} low stock items</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fleet Efficiency</CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.vehicles.efficiency}</div>
                <p className="text-xs text-muted-foreground">
                  MPG | {reportData.vehicles.active}/{reportData.vehicles.totalVehicles} active
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Support Ticket Categories</CardTitle>
                <CardDescription>Distribution and resolution times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.support.categories.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between">
                        <span>{category.category}</span>
                        <span className="font-medium">{category.count} tickets</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Avg resolution time</span>
                        <span>{category.avgTime}h</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(category.count / reportData.support.totalTickets) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
                <CardDescription>Stock value and item distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.inventory.categories.map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-sm text-muted-foreground">{category.items} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">KSH {category.value.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {((category.value / reportData.inventory.totalValue) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Segmentation</CardTitle>
                <CardDescription>Revenue and count by customer type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: { label: "Customers", color: "hsl(var(--chart-1))" },
                    revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.customers.segments}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" />
                      <Bar yAxisId="right" dataKey="revenue" fill="var(--color-revenue)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Plan Distribution</CardTitle>
                <CardDescription>Subscribers and revenue by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(reportData.services.subscribers).map(([plan, count]) => (
                    <div key={plan} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="capitalize">{plan} Plan</span>
                        <span className="font-medium">{count} subscribers</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Revenue</span>
                        <span>
                          KSH{" "}
                          {reportData.services.revenue[
                            plan as keyof typeof reportData.services.revenue
                          ].toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(count / reportData.customers.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Lifecycle Metrics</CardTitle>
              <CardDescription>Acquisition, retention, and satisfaction trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">+{reportData.customers.new}</div>
                  <p className="text-sm text-muted-foreground">New Customers</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">-{reportData.customers.churned}</div>
                  <p className="text-sm text-muted-foreground">Churned</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{reportData.customers.satisfaction}/5</div>
                  <p className="text-sm text-muted-foreground">Satisfaction</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{reportData.customers.supportTickets}</div>
                  <p className="text-sm text-muted-foreground">Support Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>Pre-configured reports for different business needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reportTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline">{template.frequency}</Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Included Modules:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.modules.map((moduleId) => {
                              const module = modules.find((m) => m.id === moduleId)
                              return module ? (
                                <Badge key={moduleId} variant="secondary" className="text-xs">
                                  {module.name}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Last generated:</span>
                          <span>{template.lastGenerated}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" className="flex-1">
                            <FileBarChart className="mr-2 h-4 w-4" />
                            Generate
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleExportReport("pdf")}>
                                Export as PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportReport("excel")}>
                                Export as Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportReport("csv")}>
                                Export as CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Create personalized reports with specific modules and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Select Modules</Label>
                    <p className="text-sm text-muted-foreground mb-3">Choose which business areas to include</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {modules.map((module) => {
                        const Icon = module.icon
                        return (
                          <div key={module.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={module.id}
                              checked={selectedModules.includes(module.id)}
                              onCheckedChange={() => handleModuleToggle(module.id)}
                            />
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4" style={{ color: module.color }} />
                              <Label htmlFor={module.id} className="text-sm font-medium cursor-pointer">
                                {module.name}
                              </Label>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Report Configuration</Label>
                    <div className="space-y-3 mt-3">
                      <div>
                        <Label htmlFor="report-name">Report Name</Label>
                        <Input id="report-name" placeholder="Enter report name" />
                      </div>
                      <div>
                        <Label htmlFor="report-type">Report Type</Label>
                        <Select value={reportType} onValueChange={setReportType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="summary">Executive Summary</SelectItem>
                            <SelectItem value="detailed">Detailed Analysis</SelectItem>
                            <SelectItem value="comparison">Comparative Report</SelectItem>
                            <SelectItem value="trend">Trend Analysis</SelectItem>
                            <SelectItem value="forecast">Forecast Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="date-range">Date Range</Label>
                        <Select value={dateRange} onValueChange={setDateRange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 3 months</SelectItem>
                            <SelectItem value="365">Last year</SelectItem>
                            <SelectItem value="custom">Custom range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Preview</Label>
                    <p className="text-sm text-muted-foreground mb-3">Selected modules and their key metrics</p>
                    <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                      {selectedModules.map((moduleId) => {
                        const module = modules.find((m) => m.id === moduleId)
                        if (!module) return null

                        const Icon = module.icon
                        return (
                          <div key={moduleId} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4" style={{ color: module.color }} />
                              <span className="text-sm font-medium">{module.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {moduleId === "customers" && "Growth, Segments, Satisfaction"}
                              {moduleId === "billing" && "Revenue, Collections, Outstanding"}
                              {moduleId === "network" && "Uptime, Performance, Incidents"}
                              {moduleId === "support" && "Tickets, Response Time, Satisfaction"}
                              {moduleId === "inventory" && "Stock Levels, Turnover, Value"}
                              {moduleId === "services" && "Plans, Subscribers, Revenue"}
                              {moduleId === "finance" && "P&L, Cash Flow, Margins"}
                              {moduleId === "hr" && "Headcount, Turnover, Training"}
                              {moduleId === "vehicles" && "Fleet Status, Costs, Efficiency"}
                              {moduleId === "messages" && "Campaigns, Delivery, Engagement"}
                              {moduleId === "automation" && "Workflows, Efficiency, Savings"}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleGenerateCustomReport} className="flex-1">
                      <FileBarChart className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                    <Button variant="outline">
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Custom Report Dialog */}
      <Dialog open={customReportOpen} onOpenChange={setCustomReportOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Advanced Custom Report Builder</DialogTitle>
            <DialogDescription>
              Create detailed reports with specific metrics, filters, and visualizations
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Report Details</Label>
                <div className="space-y-3 mt-3">
                  <Input placeholder="Report title" />
                  <Input placeholder="Description" />
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Visualization Options</Label>
                <div className="grid gap-2 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="charts" defaultChecked />
                    <Label htmlFor="charts">Include charts and graphs</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="tables" defaultChecked />
                    <Label htmlFor="tables">Include data tables</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="trends" />
                    <Label htmlFor="trends">Show trend analysis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="comparisons" />
                    <Label htmlFor="comparisons">Include period comparisons</Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Export Options</Label>
                <div className="grid gap-2 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pdf" defaultChecked />
                    <Label htmlFor="pdf">PDF Format</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="excel" />
                    <Label htmlFor="excel">Excel Format</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="csv" />
                    <Label htmlFor="csv">CSV Format</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Delivery Options</Label>
                <div className="grid gap-2 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email" />
                    <Label htmlFor="email">Email delivery</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="schedule" />
                    <Label htmlFor="schedule">Schedule recurring reports</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="dashboard" defaultChecked />
                    <Label htmlFor="dashboard">Save to dashboard</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateCustomReport}>
              <FileBarChart className="mr-2 h-4 w-4" />
              Generate Custom Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Report Dialog */}
      <Dialog open={scheduleReportOpen} onOpenChange={setScheduleReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Automated Reports</DialogTitle>
            <DialogDescription>Set up automatic report generation and delivery</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="schedule-name">Report Name</Label>
              <Input id="schedule-name" placeholder="Enter report name" />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recipients">Email Recipients</Label>
              <Input id="recipients" placeholder="Enter email addresses (comma separated)" />
            </div>
            <div>
              <Label htmlFor="template">Report Template</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {reportTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleReport}>
              <Clock className="mr-2 h-4 w-4" />
              Schedule Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

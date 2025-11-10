"use client"

import React, { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useLocalization } from "@/lib/localization-context"
import { formatCurrency } from "@/lib/localization-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  DollarSign,
  Wifi,
  AlertTriangle,
  TrendingUp,
  Server,
  Activity,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Headphones,
  Zap,
  Globe,
  CreditCard,
  UserCheck,
} from "lucide-react"

const RealTimeDashboard = dynamic(() => import("@/lib/real-time-dashboard").then((mod) => ({ default: mod.default })), {
  loading: () => <div className="text-center p-4">Loading real-time data...</div>,
  ssr: false,
})

interface DashboardData {
  metrics: {
    users: { value: number; change: string; trend: string }
    revenue: { value: number; change: string; trend: string }
    bandwidth: { value: number; change: string; trend: string }
    alerts: { value: number; change: string; trend: string }
  }
  networkStatus: { online: number; offline: number; total: number }
  invoiceStats: { count: number; amount: number }
  recentActivity: Array<{
    id: number
    status: string
    message: string
    details: string
    time: string
    category: string
  }>
}

interface RevenueData {
  month: string
  value: number
  height: string
  growth: string
}

interface RealTimeKPIs {
  totalCustomers: number
  activeCustomers: number
  customerGrowthRate: number
  monthlyRecurringRevenue: number
  averageRevenuePerUser: number
  paymentSuccessRate: number
  networkUptime: number
  networkDevicesOnline: number
  networkDevicesTotal: number
  bandwidthUtilization: number
  openTickets: number
  averageResponseTime: number
  ticketResolutionRate: number
  newCustomersToday: number
  activeServices: number
  suspendedServices: number
  overdueAmount: number
  outstandingInvoices: number
  systemHealth: number
  databaseConnections: number
  customerSatisfactionScore: number
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[v0] Dashboard error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                <p className="text-lg font-semibold">Something went wrong</p>
                <p className="text-sm text-muted-foreground">Please refresh the page to try again</p>
                <Button onClick={() => window.location.reload()} className="mt-4">
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [realTimeKPIs, setRealTimeKPIs] = useState<RealTimeKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { settings: localizationSettings } = useLocalization()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null)

        const responses = await Promise.allSettled([
          fetch("/api/dashboard/metrics"),
          fetch("/api/dashboard/revenue"),
          fetch("/api/dashboard/real-time-kpis"),
        ])

        const [metricsResponse, revenueResponse, kpisResponse] = responses

        if (metricsResponse.status === "fulfilled" && metricsResponse.value.ok) {
          const metricsData = await metricsResponse.value.json()
          setDashboardData(metricsData.data)
        }

        if (revenueResponse.status === "fulfilled" && revenueResponse.value.ok) {
          const revenueData = await revenueResponse.value.json()
          setRevenueData(Array.isArray(revenueData.data) ? revenueData.data : [])
        }

        if (kpisResponse.status === "fulfilled" && kpisResponse.value.ok) {
          const kpisData = await kpisResponse.value.json()
          setRealTimeKPIs(kpisData.data)
          setLastUpdated(new Date())
        }
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard data:", error)
        setError("Failed to load dashboard data. Please try refreshing the page.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    const realTimeInterval = setInterval(async () => {
      try {
        const kpisResponse = await fetch("/api/dashboard/real-time-kpis")
        if (kpisResponse.ok) {
          const kpisData = await kpisResponse.json()
          setRealTimeKPIs(kpisData.data)
          setLastUpdated(new Date())
        }
      } catch (error) {
        console.error("[v0] Failed to fetch real-time KPIs:", error)
      }
    }, 30000)

    return () => clearInterval(realTimeInterval)
  }, [])

  const enhancedMetrics = realTimeKPIs
    ? [
        {
          title: "Total Customers",
          value: realTimeKPIs.totalCustomers.toLocaleString(),
          subtitle: `${realTimeKPIs.activeCustomers} active`,
          percentage: realTimeKPIs.customerGrowthRate,
          trend: realTimeKPIs.customerGrowthRate >= 0 ? "up" : "down",
          change: `${realTimeKPIs.customerGrowthRate >= 0 ? "+" : ""}${realTimeKPIs.customerGrowthRate}%`,
          icon: Users,
          color: "from-blue-500 to-blue-400",
          bgColor: "bg-blue-500",
          iconColor: "text-white",
        },
        {
          title: "Monthly Revenue",
          value: formatCurrency(realTimeKPIs.monthlyRecurringRevenue, localizationSettings),
          subtitle: `ARPU: ${formatCurrency(realTimeKPIs.averageRevenuePerUser, localizationSettings)}`,
          percentage: realTimeKPIs.paymentSuccessRate,
          trend: "up",
          change: `${realTimeKPIs.paymentSuccessRate}% success rate`,
          icon: DollarSign,
          color: "from-green-500 to-green-400",
          bgColor: "bg-green-500",
          iconColor: "text-white",
        },
        {
          title: "Network Uptime",
          value: `${realTimeKPIs.networkUptime}%`,
          subtitle: `${realTimeKPIs.networkDevicesOnline}/${realTimeKPIs.networkDevicesTotal} devices`,
          percentage: realTimeKPIs.networkUptime,
          trend: realTimeKPIs.networkUptime >= 99 ? "up" : "down",
          change: `${realTimeKPIs.bandwidthUtilization}% bandwidth`,
          icon: Wifi,
          color: "from-purple-500 to-purple-400",
          bgColor: "bg-purple-500",
          iconColor: "text-white",
        },
        {
          title: "Support Tickets",
          value: realTimeKPIs.openTickets.toString(),
          subtitle: `${realTimeKPIs.averageResponseTime}h avg response`,
          percentage: realTimeKPIs.ticketResolutionRate,
          trend: realTimeKPIs.openTickets <= 10 ? "up" : "down",
          change: `${realTimeKPIs.ticketResolutionRate}% resolved`,
          icon: Headphones,
          color: "from-orange-500 to-orange-400",
          bgColor: "bg-orange-500",
          iconColor: "text-white",
        },
      ]
    : []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-semibold">Dashboard Error</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading real-time dashboard data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="flex-1 space-y-3 sm:space-y-4 p-2 sm:p-4 md:p-6 lg:p-8 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Real-time ISP Dashboard
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-muted-foreground space-y-1 sm:space-y-0">
              <p className="text-sm sm:text-base">Live monitoring and analytics for your ISP operations</p>
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-mono text-xs sm:text-sm">
                  {currentTime.toLocaleTimeString("en-KE", {
                    timeZone: "Africa/Nairobi",
                    hour12: false,
                  })}{" "}
                  EAT
                </span>
                {lastUpdated && (
                  <Badge variant="outline" className="text-xs">
                    Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              className="bg-transparent text-xs sm:text-sm"
              onClick={() => {}}
              disabled={isCheckingHealth}
            >
              <Activity className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {isCheckingHealth ? "Checking..." : "System Health"}
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xs sm:text-sm"
              onClick={() => {}}
              disabled={isExporting}
            >
              <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {isExporting ? "Exporting..." : "Export Report"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {enhancedMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <Card
                key={index}
                className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-5 group-hover:opacity-10 transition-opacity`}
                />
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 opacity-10">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-current" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                  <div
                    className={`p-1.5 sm:p-2 rounded-full ${metric.bgColor} group-hover:scale-110 transition-transform`}
                  >
                    <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${metric.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{metric.value}</div>
                  <div className="text-xs text-muted-foreground mb-2">{metric.subtitle}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center">
                      <TrendingUp
                        className={`h-2 w-2 sm:h-3 sm:w-3 mr-1 ${metric.trend === "up" ? "text-green-500" : "text-red-500"} ${metric.trend === "down" ? "rotate-180" : ""}`}
                      />
                      <span className="hidden sm:inline">{metric.change}</span>
                    </p>
                    <div className="text-xs font-medium">{Math.abs(metric.percentage)}%</div>
                  </div>
                  <Progress value={Math.min(Math.abs(metric.percentage), 100)} className="mt-2 h-1" />
                </CardContent>
              </Card>
            )
          })}
        </div>

        {realTimeKPIs && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">New Customers</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+{realTimeKPIs.newCustomersToday}</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Active Services</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{realTimeKPIs.activeServices}</div>
                <p className="text-xs text-muted-foreground">{realTimeKPIs.suspendedServices} suspended</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Overdue Amount</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(realTimeKPIs?.overdueAmount || 0, localizationSettings)}
                </div>
                <p className="text-xs text-muted-foreground">{realTimeKPIs?.outstandingInvoices || 0} invoices</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Bandwidth Usage</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{realTimeKPIs.bandwidthUtilization}%</div>
                <Progress value={realTimeKPIs.bandwidthUtilization} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{realTimeKPIs.systemHealth}%</div>
                <p className="text-xs text-muted-foreground">{realTimeKPIs.databaseConnections} DB connections</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Satisfaction</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{realTimeKPIs.customerSatisfactionScore}/5</div>
                <p className="text-xs text-muted-foreground">{realTimeKPIs.ticketResolutionRate}% resolved</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Revenue Chart */}
          <Card className="lg:col-span-4 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Revenue Overview
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Monthly revenue trends with month-over-month growth comparison
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {Array.isArray(revenueData) && revenueData.length > 0 ? (
                <div className="h-[200px] sm:h-[300px] flex items-end justify-between gap-1 sm:gap-2 px-2 sm:px-4">
                  {revenueData.map((data, index) => {
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md hover:from-blue-600 hover:to-blue-500 transition-all duration-300 cursor-pointer relative group min-h-[20px]"
                          style={{ height: data.height }}
                        >
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            <div className="font-medium">KSh {(data.value / 1000).toLocaleString()}K</div>
                            <div className={`${data.growth.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                              {data.growth} vs prev month
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 sm:mt-2">{data.month}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-[200px] sm:h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm">
                      {!Array.isArray(revenueData) ? "Loading revenue data..." : "No revenue data available"}
                    </p>
                    {Array.isArray(revenueData) && revenueData.length === 0 && (
                      <p className="text-xs mt-1">Add some completed payments to see revenue trends</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Recent Activity */}
          <Card className="lg:col-span-3 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Latest system activities and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3 max-h-[300px] overflow-y-auto">
                {dashboardData?.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-muted"
                  >
                    <div className="mt-0.5 flex-shrink-0">{getStatusIcon(activity.status)}</div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs sm:text-sm font-medium leading-none truncate">{activity.message}</p>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {activity.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{activity.details}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Network Infrastructure</CardTitle>
              <Server className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {dashboardData?.networkStatus.online || 0} / {dashboardData?.networkStatus.total || 0}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 space-y-1 sm:space-y-0">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    Online: {dashboardData?.networkStatus.online || 0}
                  </Badge>
                  <Badge variant="destructive" className="text-xs">
                    Offline: {dashboardData?.networkStatus.offline || 0}
                  </Badge>
                </div>
              </div>
              <Progress
                value={
                  dashboardData?.networkStatus.total
                    ? (dashboardData.networkStatus.online / dashboardData.networkStatus.total) * 100
                    : 0
                }
                className="mt-2 h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardData?.networkStatus.total
                  ? Math.round((dashboardData.networkStatus.online / dashboardData.networkStatus.total) * 100)
                  : 0}
                % operational
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Outstanding Invoices</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{dashboardData?.invoiceStats.count || 0}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Total: {formatCurrency(dashboardData?.invoiceStats.amount || 0, localizationSettings)}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-red-600">Overdue: {dashboardData?.invoiceStats.count || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Bandwidth Utilization</CardTitle>
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">78%</div>
              <Progress value={78} className="mt-2 h-2" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 space-y-1 sm:space-y-0">
                <p className="text-xs text-muted-foreground">Peak: 89% at 8 PM</p>
                <p className="text-xs text-muted-foreground">Avg: 65%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Customer Growth</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600">+12.5%</div>
              <p className="text-xs sm:text-sm text-muted-foreground">This month: +342 customers</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-green-600">New: 398</span>
                <span className="text-xs text-red-600">Churned: 56</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
}

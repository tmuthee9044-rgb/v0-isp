"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react"

interface ServicePlanAnalyticsProps {
  plans: any[]
}

export function ServicePlanAnalytics({ plans }: ServicePlanAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("30d")
  const [metric, setMetric] = useState("revenue")

  // Mock analytics data
  const revenueData = [
    { month: "Jan", basic: 37500, standard: 105000, premium: 71200, business: 67500, enterprise: 37500 },
    { month: "Feb", basic: 38250, standard: 107100, premium: 72736, business: 69750, enterprise: 38250 },
    { month: "Mar", basic: 39000, standard: 109200, premium: 74272, business: 72000, enterprise: 39000 },
    { month: "Apr", basic: 39750, standard: 111300, premium: 75808, business: 74250, enterprise: 39750 },
    { month: "May", basic: 40500, standard: 113400, premium: 77344, business: 76500, enterprise: 40500 },
    { month: "Jun", basic: 41250, standard: 115500, premium: 78880, business: 78750, enterprise: 41250 },
  ]

  const customerGrowthData = [
    { month: "Jan", new: 45, churned: 12, net: 33 },
    { month: "Feb", new: 52, churned: 8, net: 44 },
    { month: "Mar", new: 38, churned: 15, net: 23 },
    { month: "Apr", new: 61, churned: 9, net: 52 },
    { month: "May", new: 47, churned: 11, net: 36 },
    { month: "Jun", new: 55, churned: 7, net: 48 },
  ]

  const planDistribution = [
    { name: "Basic Home", value: 1250, color: "#8884d8" },
    { name: "Standard Home", value: 2100, color: "#82ca9d" },
    { name: "Premium Home", value: 890, color: "#ffc658" },
    { name: "Business Starter", value: 450, color: "#ff7300" },
    { name: "Enterprise Pro", value: 125, color: "#00ff88" },
  ]

  const performanceMetrics = [
    { plan: "Basic Home", satisfaction: 85, churn: 2.1, support_tickets: 45, avg_speed: 23.5 },
    { plan: "Standard Home", satisfaction: 92, churn: 1.8, support_tickets: 32, avg_speed: 48.2 },
    { plan: "Premium Home", satisfaction: 96, churn: 1.2, support_tickets: 18, avg_speed: 97.8 },
    { plan: "Business Starter", satisfaction: 98, churn: 0.8, support_tickets: 12, avg_speed: 98.5 },
    { plan: "Enterprise Pro", satisfaction: 99, churn: 0.3, support_tickets: 3, avg_speed: 495.2 },
  ]

  const usagePatterns = [
    { hour: "00", basic: 15, standard: 25, premium: 35, business: 45, enterprise: 65 },
    { hour: "06", basic: 45, standard: 55, premium: 65, business: 75, enterprise: 85 },
    { hour: "12", basic: 65, standard: 75, premium: 85, business: 90, enterprise: 95 },
    { hour: "18", basic: 85, standard: 90, premium: 95, business: 85, enterprise: 90 },
    { hour: "22", basic: 75, standard: 80, premium: 85, business: 70, enterprise: 75 },
  ]

  const totalRevenue = revenueData[revenueData.length - 1]
  const monthlyRevenue = Object.values(totalRevenue)
    .slice(1)
    .reduce((a: number, b: number) => a + b, 0)
  const totalCustomers = planDistribution.reduce((sum, plan) => sum + plan.value, 0)
  const avgSatisfaction =
    performanceMetrics.reduce((sum, plan) => sum + plan.satisfaction, 0) / performanceMetrics.length
  const avgChurn = performanceMetrics.reduce((sum, plan) => sum + plan.churn, 0) / performanceMetrics.length

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(monthlyRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalCustomers || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +8.2% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSatisfaction.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +2.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgChurn.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              -0.3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>Monthly revenue breakdown by service plan</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, ""]} />
                    <Legend />
                    <Area type="monotone" dataKey="basic" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="standard" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="premium" stackId="1" stroke="#ffc658" fill="#ffc658" />
                    <Area type="monotone" dataKey="business" stackId="1" stroke="#ff7300" fill="#ff7300" />
                    <Area type="monotone" dataKey="enterprise" stackId="1" stroke="#00ff88" fill="#00ff88" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Current month revenue by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planDistribution.map((plan) => ({
                        ...plan,
                        value: plan.value * (plans.find((p) => p.name.includes(plan.name.split(" ")[0]))?.price || 50),
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>New customers vs churn over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={customerGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="new" fill="#82ca9d" name="New Customers" />
                    <Bar dataKey="churned" fill="#ff7300" name="Churned" />
                    <Bar dataKey="net" fill="#8884d8" name="Net Growth" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Customer count by service plan</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan Performance Metrics</CardTitle>
              <CardDescription>Satisfaction, churn, and support metrics by plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Plan</th>
                      <th className="text-center p-2">Satisfaction</th>
                      <th className="text-center p-2">Churn Rate</th>
                      <th className="text-center p-2">Support Tickets</th>
                      <th className="text-center p-2">Avg Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceMetrics.map((plan, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{plan.plan}</td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            <span>{plan.satisfaction}%</span>
                            {plan.satisfaction >= 95 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : plan.satisfaction >= 90 ? (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant={plan.churn <= 1 ? "default" : plan.churn <= 2 ? "secondary" : "destructive"}>
                            {plan.churn}%
                          </Badge>
                        </td>
                        <td className="text-center p-2">{plan.support_tickets}/month</td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="h-4 w-4" />
                            {plan.avg_speed} Mbps
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns</CardTitle>
              <CardDescription>Average bandwidth utilization by time of day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usagePatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, "Usage"]} />
                  <Legend />
                  <Line type="monotone" dataKey="basic" stroke="#8884d8" name="Basic" />
                  <Line type="monotone" dataKey="standard" stroke="#82ca9d" name="Standard" />
                  <Line type="monotone" dataKey="premium" stroke="#ffc658" name="Premium" />
                  <Line type="monotone" dataKey="business" stroke="#ff7300" name="Business" />
                  <Line type="monotone" dataKey="enterprise" stroke="#00ff88" name="Enterprise" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

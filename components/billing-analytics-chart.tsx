"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, AlertCircle } from "lucide-react"

interface BillingAnalyticsChartProps {
  data?: {
    monthlyRevenue: Array<{ month: string; revenue: number; target: number }>
    paymentMethods: Array<{ method: string; percentage: number; amount: number }>
    customerSegments: Array<{ segment: string; count: number; revenue: number }>
    collectionMetrics: {
      onTime: number
      late: number
      overdue: number
      averagePaymentTime: number
    }
  }
}

export function BillingAnalyticsChart({ data }: BillingAnalyticsChartProps) {
  // Mock data if none provided
  const mockData = {
    monthlyRevenue: [
      { month: "Jan", revenue: 125000, target: 120000 },
      { month: "Feb", revenue: 132000, target: 125000 },
      { month: "Mar", revenue: 128000, target: 130000 },
      { month: "Apr", revenue: 145000, target: 135000 },
      { month: "May", revenue: 152000, target: 140000 },
      { month: "Jun", revenue: 148000, target: 145000 },
    ],
    paymentMethods: [
      { method: "M-Pesa", percentage: 65, amount: 325000 },
      { method: "Bank Transfer", percentage: 20, amount: 100000 },
      { method: "Credit Card", percentage: 10, amount: 50000 },
      { method: "Cash", percentage: 5, amount: 25000 },
    ],
    customerSegments: [
      { segment: "Individual", count: 450, revenue: 225000 },
      { segment: "Business", count: 85, revenue: 170000 },
      { segment: "Education", count: 25, revenue: 75000 },
      { segment: "Government", count: 10, revenue: 30000 },
    ],
    collectionMetrics: {
      onTime: 85,
      late: 12,
      overdue: 3,
      averagePaymentTime: 18,
    },
  }

  const analyticsData = data || mockData
  const currentMonth = analyticsData.monthlyRevenue[analyticsData.monthlyRevenue.length - 1]
  const previousMonth = analyticsData.monthlyRevenue[analyticsData.monthlyRevenue.length - 2]
  const revenueGrowth = previousMonth
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
    : 0

  const totalRevenue = analyticsData.paymentMethods.reduce((sum, method) => sum + method.amount, 0)
  const targetAchievement = (currentMonth.revenue / currentMonth.target) * 100

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {(currentMonth?.revenue || 0).toLocaleString()}</div>
            <div className="flex items-center space-x-2 mt-1">
              {revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs ${revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {revenueGrowth >= 0 ? "+" : ""}
                {revenueGrowth.toFixed(1)}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Achievement</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{targetAchievement.toFixed(1)}%</div>
            <Progress value={targetAchievement} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              KES {(currentMonth?.target || 0).toLocaleString()} target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.collectionMetrics.onTime}%</div>
            <p className="text-xs text-green-600 mt-1">On-time payments</p>
            <div className="flex space-x-1 mt-2">
              <Badge variant="outline" className="text-xs">
                {analyticsData.collectionMetrics.late}% late
              </Badge>
              <Badge variant="destructive" className="text-xs">
                {analyticsData.collectionMetrics.overdue}% overdue
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Payment Time</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.collectionMetrics.averagePaymentTime}</div>
            <p className="text-xs text-muted-foreground mt-1">days average</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods Performance</CardTitle>
          <CardDescription>Revenue breakdown by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.paymentMethods.map((method) => (
              <div key={method.method} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium">{method.method}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold">KES {(method.amount || 0).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{method.percentage}% of total</div>
                  </div>
                  <div className="w-24">
                    <Progress value={method.percentage} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription>Revenue and customer count by segment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {analyticsData.customerSegments.map((segment) => (
              <div key={segment.segment} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-semibold">{segment.segment}</div>
                  <div className="text-sm text-muted-foreground">{segment.count} customers</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">KES {(segment.revenue || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    KES {Math.round((segment.revenue || 0) / (segment.count || 1)).toLocaleString()} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue vs targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.monthlyRevenue.map((month) => {
              const achievement = ((month.revenue || 0) / (month.target || 1)) * 100
              return (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium w-8">{month.month}</span>
                    <div className="w-32">
                      <Progress value={achievement} className="h-2" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="font-semibold">KES {(month.revenue || 0).toLocaleString()}</span>
                    <span className="text-muted-foreground">/ KES {(month.target || 0).toLocaleString()}</span>
                    <Badge
                      variant={achievement >= 100 ? "default" : achievement >= 90 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {achievement.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DollarSign, TrendingUp, Users, Target, Download, Calendar } from "lucide-react"

export default function RevenueReportPage() {
  const [period, setPeriod] = useState("6months")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/revenue?period=${period}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching revenue report data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">Loading...</div>
  }

  if (!data) {
    return <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">Error loading data</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Revenue Report</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSH {data.totals?.totalRevenue?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.5% from last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+8.9%</div>
            <p className="text-xs text-muted-foreground">Monthly average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals?.payingCustomers?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Revenue generating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSH {data.totals?.arpu?.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average revenue per user</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue vs targets</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
                target: { label: "Target", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                  <Line type="monotone" dataKey="target" stroke="var(--color-target)" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Monthly revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.planRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Revenue Customers</CardTitle>
            <CardDescription>Highest revenue generating customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topCustomers?.map((customer: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.plan} Plan</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">KSH {customer.revenue.toLocaleString()}</p>
                    <p className={`text-sm ${customer.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {customer.growth >= 0 ? "+" : ""}
                      {customer.growth.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Performance</CardTitle>
            <CardDescription>Detailed revenue breakdown by service plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>ARPU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.planRevenue?.map((plan: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{plan.plan}</TableCell>
                      <TableCell>KSH {plan.revenue.toLocaleString()}</TableCell>
                      <TableCell>{plan.customers}</TableCell>
                      <TableCell>KSH {plan.arpu.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

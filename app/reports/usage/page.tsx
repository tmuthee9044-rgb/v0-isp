"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Activity, Users, HardDrive, Download, Calendar, Wifi } from "lucide-react"

export default function UsageReportPage() {
  const [period, setPeriod] = useState("today")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/usage?period=${period}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching usage report data:", error)
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

  const getUsageStatusColor = (status: string) => {
    switch (status) {
      case "low":
        return "secondary"
      case "normal":
        return "default"
      case "high":
        return "secondary"
      case "critical":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Usage Report</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
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
            <CardTitle className="text-sm font-medium">Peak Bandwidth</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.peakBandwidth}%</div>
            <p className="text-xs text-muted-foreground">At 6:00 PM today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Usage</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.avgUsage}%</div>
            <p className="text-xs text-muted-foreground">Network utilization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.peakUsers}</div>
            <p className="text-xs text-muted-foreground">Concurrent connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Transferred</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats?.dataTransferred} TB</div>
            <p className="text-xs text-muted-foreground">Today's total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bandwidth Usage Trend</CardTitle>
            <CardDescription>Hourly bandwidth utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                bandwidth: { label: "Bandwidth %", color: "hsl(var(--chart-1))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.hourlyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="bandwidth"
                    stroke="var(--color-bandwidth)"
                    fill="var(--color-bandwidth)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Concurrent Users</CardTitle>
            <CardDescription>Active connections throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: { label: "Users", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.hourlyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Usage Customers</CardTitle>
            <CardDescription>Customers with highest bandwidth consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topUsageCustomers?.map((customer: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{customer.name}</p>
                      <Badge variant={getUsageStatusColor(customer.status)}>{customer.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{customer.plan} Plan</p>
                    <Progress value={Number.parseFloat(customer.usage) * 10} className="mt-2" />
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-medium">{customer.usage} TB</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage by Plan</CardTitle>
            <CardDescription>Data consumption breakdown by service plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Total Data</TableHead>
                    <TableHead>Avg Usage</TableHead>
                    <TableHead>Customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.planUsage?.map((plan: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{plan.plan}</TableCell>
                      <TableCell>{plan.totalData} GB</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={plan.avgUsage} className="flex-1" />
                          <span className="text-sm">{plan.avgUsage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{plan.customers}</TableCell>
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

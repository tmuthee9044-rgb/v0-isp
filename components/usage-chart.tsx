"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { BarChart3, TrendingUp, Download, RefreshCw } from "lucide-react"

interface UsageChartProps {
  customerId: number
}

export function UsageChart({ customerId }: UsageChartProps) {
  const [timeRange, setTimeRange] = useState("7d")
  const [isLoading, setIsLoading] = useState(false)

  // Mock data - in production, this would come from your analytics API
  const usageData = {
    "7d": {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      data: [12.5, 15.2, 18.7, 22.1, 19.8, 25.3, 21.4],
      peak: 25.3,
      average: 19.3,
      total: 135.0,
    },
    "30d": {
      labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
      data: Array.from({ length: 30 }, () => Math.random() * 30 + 10),
      peak: 35.7,
      average: 22.1,
      total: 663.0,
    },
    "90d": {
      labels: Array.from({ length: 90 }, (_, i) => `Day ${i + 1}`),
      data: Array.from({ length: 90 }, () => Math.random() * 40 + 15),
      peak: 42.3,
      average: 27.8,
      total: 2502.0,
    },
  }

  const currentData = usageData[timeRange as keyof typeof usageData]

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">Real-time</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{currentData.total} GB</div>
            <div className="text-sm text-muted-foreground">Total Usage</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{currentData.average} GB</div>
            <div className="text-sm text-muted-foreground">Daily Average</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{currentData.peak} GB</div>
            <div className="text-sm text-muted-foreground">Peak Day</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Data Usage Chart
          </CardTitle>
          <CardDescription>Daily data consumption over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-1 p-4 bg-muted/20 rounded-lg">
            {currentData.data.slice(0, timeRange === "7d" ? 7 : 30).map((value, index) => (
              <div key={index} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="bg-primary rounded-t-sm min-w-[8px] transition-all hover:bg-primary/80"
                  style={{
                    height: `${(value / Math.max(...currentData.data)) * 200}px`,
                  }}
                  title={`${currentData.labels[index]}: ${value} GB`}
                />
                {timeRange === "7d" && (
                  <span className="text-xs text-muted-foreground rotate-45 origin-left">
                    {currentData.labels[index]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Data Usage (GB)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Compared to last period</span>
                <Badge className="bg-green-100 text-green-800">+12.5%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Peak usage time</span>
                <span className="font-medium">8:00 PM - 11:00 PM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Lowest usage time</span>
                <span className="font-medium">3:00 AM - 6:00 AM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Usage pattern</span>
                <Badge variant="outline">Consistent</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Speed Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Download</span>
                <span className="font-medium">95.2 Mbps</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Upload</span>
                <span className="font-medium">23.8 Mbps</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Latency</span>
                <span className="font-medium">12ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Connection Quality</span>
                <Badge className="bg-green-100 text-green-800">Excellent</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

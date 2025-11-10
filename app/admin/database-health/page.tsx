"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle, Clock, Database, RefreshCw, Wrench } from "lucide-react"
import { toast } from "sonner"

interface HealthReport {
  connectivity: {
    status: string
    message: string
    timestamp: string
  }
  tables: {
    status: string
    details: Array<{ name: string; status: string }>
    missing: string[]
    extra: string[]
  }
  relationships: {
    status: string
    details: Array<{
      table: string
      column: string
      references: string
      constraint: string
    }>
    issues: Array<{
      table: string
      column: string
      issue: string
      severity: string
    }>
  }
  dataIntegrity: {
    status: string
    details: any[]
    issues: Array<{
      table: string
      issue: string
      severity: string
    }>
  }
  performance: {
    status: string
    details: Array<{
      metric: string
      value: string
      status: string
    }>
  }
  overall: {
    status: string
    score: number
  }
}

export default function DatabaseHealthPage() {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)

  const fetchHealthReport = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/database-health-check")
      const data = await response.json()
      setHealthReport(data)
    } catch (error) {
      toast.error("Failed to fetch database health report")
      console.error("Health check error:", error)
    } finally {
      setLoading(false)
    }
  }

  const runAutoFix = async () => {
    setFixing(true)
    try {
      const response = await fetch("/api/database-health-check", {
        method: "POST",
      })
      const result = await response.json()

      if (result.success) {
        toast.success(`Applied ${result.fixes.length} database fixes`)
        // Refresh health report
        await fetchHealthReport()
      } else {
        toast.error("Auto-fix failed: " + result.error)
      }
    } catch (error) {
      toast.error("Auto-fix failed")
      console.error("Auto-fix error:", error)
    } finally {
      setFixing(false)
    }
  }

  useEffect(() => {
    fetchHealthReport()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Running database health check...</span>
        </div>
      </div>
    )
  }

  if (!healthReport) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Health Check Failed</h3>
              <p className="text-muted-foreground mb-4">Unable to retrieve database health report</p>
              <Button onClick={fetchHealthReport}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Health Check</h1>
          <p className="text-muted-foreground">Monitor and maintain database integrity</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHealthReport} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runAutoFix} disabled={fixing}>
            <Wrench className="h-4 w-4 mr-2" />
            {fixing ? "Fixing..." : "Auto Fix"}
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Overall Database Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Health Score</span>
                <span className="text-2xl font-bold">{healthReport.overall.score}%</span>
              </div>
              <Progress value={healthReport.overall.score} className="h-3" />
            </div>
            <Badge variant={healthReport.overall.status === "healthy" ? "default" : "destructive"}>
              {healthReport.overall.status.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="connectivity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="connectivity">Connectivity</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="integrity">Data Integrity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="connectivity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthReport.connectivity.status)}
                Database Connectivity
              </CardTitle>
              <CardDescription>Connection status and database information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Connection Status</h4>
                    <p className="text-sm text-muted-foreground">{healthReport.connectivity.message}</p>
                  </div>
                  <Badge variant={healthReport.connectivity.status === "healthy" ? "default" : "destructive"}>
                    {healthReport.connectivity.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last checked: {new Date(healthReport.connectivity.timestamp).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthReport.tables.status)}
                Database Tables
              </CardTitle>
              <CardDescription>Table structure and schema validation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthReport.tables.missing.length > 0 && (
                  <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                    <h4 className="font-medium text-yellow-800 mb-2">Missing Tables</h4>
                    <div className="flex flex-wrap gap-2">
                      {healthReport.tables.missing.map((table) => (
                        <Badge key={table} variant="outline" className="text-yellow-700">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {healthReport.tables.details.map((table) => (
                    <div key={table.name} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{table.name}</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthReport.relationships.status)}
                Foreign Key Relationships
              </CardTitle>
              <CardDescription>Database relationships and referential integrity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthReport.relationships.issues.length > 0 && (
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h4 className="font-medium text-red-800 mb-2">Relationship Issues</h4>
                    <div className="space-y-2">
                      {healthReport.relationships.issues.map((issue, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">
                            {issue.table}.{issue.column}:
                          </span>{" "}
                          {issue.issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {healthReport.relationships.details.map((rel, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">
                          {rel.table}.{rel.column}
                        </span>
                        <span className="text-muted-foreground"> → {rel.references}</span>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthReport.dataIntegrity.status)}
                Data Integrity
              </CardTitle>
              <CardDescription>Data quality and consistency checks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthReport.dataIntegrity.issues.length > 0 ? (
                  <div className="space-y-2">
                    {healthReport.dataIntegrity.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          issue.severity === "error" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{issue.table}</span>
                            <p className="text-sm text-muted-foreground">{issue.issue}</p>
                          </div>
                          <Badge variant={issue.severity === "error" ? "destructive" : "secondary"}>
                            {issue.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Data Integrity Looks Good</h3>
                    <p className="text-muted-foreground">No data integrity issues detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(healthReport.performance.status)}
                Performance Metrics
              </CardTitle>
              <CardDescription>Database performance and optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthReport.performance.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{detail.metric}</span>
                      <p className="text-sm text-muted-foreground">{detail.value}</p>
                    </div>
                    <Badge variant={detail.status === "warning" ? "secondary" : "default"}>{detail.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

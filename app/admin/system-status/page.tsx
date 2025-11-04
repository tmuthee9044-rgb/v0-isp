"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Settings,
  Activity,
  Server,
  DollarSign,
  Headphones,
  Package,
  Shield,
} from "lucide-react"

interface ModuleStatus {
  status: "working" | "partial" | "failed" | "unknown"
  tests: Record<string, any>
  score: number
  passedTests: number
  totalTests: number
}

interface VerificationResults {
  timestamp: string
  overallStatus: string
  overallScore: number
  modules: Record<string, ModuleStatus>
  summary: {
    totalModules: number
    workingModules: number
    failedModules: number
    warnings: number
  }
}

const moduleIcons: Record<string, any> = {
  "Customer Management": Users,
  "Service Management": Settings,
  "Billing & Payments": DollarSign,
  "Network Management": Server,
  "HR Management": Users,
  "Support System": Headphones,
  "Inventory Management": Package,
  "Financial Management": DollarSign,
  "System Administration": Shield,
}

export default function SystemStatusPage() {
  const [verificationResults, setVerificationResults] = useState<VerificationResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const runVerification = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/verify-modules")
      const data = await response.json()

      if (data.success) {
        setVerificationResults(data)
        setLastUpdated(new Date().toLocaleString())
      } else {
        console.error("Verification failed:", data.error)
      }
    } catch (error) {
      console.error("Error running verification:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runVerification()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working":
      case "excellent":
        return "text-green-600 bg-green-100"
      case "partial":
      case "good":
        return "text-yellow-600 bg-yellow-100"
      case "failed":
      case "poor":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "working":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "partial":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (!verificationResults) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">System Status</h2>
          <Button onClick={runVerification} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Checking..." : "Run Check"}
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-pulse mx-auto mb-4" />
            <p>Loading system status...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Status</h2>
          <p className="text-muted-foreground">Comprehensive health check of all ISP management modules</p>
        </div>
        <Button onClick={runVerification} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Checking..." : "Refresh"}
        </Button>
      </div>

      {/* Overall Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verificationResults.overallScore}%</div>
            <Badge className={getStatusColor(verificationResults.overallStatus)}>
              {verificationResults.overallStatus.toUpperCase()}
            </Badge>
            <Progress value={verificationResults.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Modules</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verificationResults.summary.workingModules}</div>
            <p className="text-xs text-muted-foreground">of {verificationResults.summary.totalModules} modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{verificationResults.summary.warnings}</div>
            <p className="text-xs text-muted-foreground">modules with issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Modules</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{verificationResults.summary.failedModules}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(verificationResults.modules).map(([moduleName, moduleData]) => {
              const Icon = moduleIcons[moduleName] || Activity
              return (
                <Card key={moduleName}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{moduleName}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-2xl font-bold">{moduleData.score}%</div>
                      {getStatusIcon(moduleData.status)}
                    </div>
                    <Progress value={moduleData.score} className="mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {moduleData.passedTests}/{moduleData.totalTests} tests passed
                    </p>
                    <Badge className={getStatusColor(moduleData.status)} variant="secondary">
                      {moduleData.status.toUpperCase()}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {Object.entries(verificationResults.modules).map(([moduleName, moduleData]) => (
            <Card key={moduleName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {React.createElement(moduleIcons[moduleName] || Activity, {
                    className: "h-5 w-5",
                  })}
                  {moduleName}
                  <Badge className={getStatusColor(moduleData.status)}>{moduleData.status.toUpperCase()}</Badge>
                </CardTitle>
                <CardDescription>
                  {moduleData.passedTests}/{moduleData.totalTests} tests passed ({moduleData.score}%)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(moduleData.tests).map(([testName, testResult]: [string, any]) => (
                    <div key={testName} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testResult.status)}
                        <span className="text-sm font-medium">{testName}</span>
                      </div>
                      {testResult.data && (
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(testResult.data)
                            .slice(0, 2)
                            .map(([key, value]: [string, any]) => `${key}: ${value}`)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {lastUpdated && <div className="text-center text-sm text-muted-foreground">Last updated: {lastUpdated}</div>}
    </div>
  )
}

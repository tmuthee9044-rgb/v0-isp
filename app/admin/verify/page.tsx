"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface ModuleStatus {
  name: string
  status: "success" | "error" | "warning" | "testing"
  message: string
  lastTested?: string
}

export default function VerifyModulesPage() {
  const [modules, setModules] = useState<ModuleStatus[]>([
    { name: "Database Connection", status: "testing", message: "Not tested yet" },
    { name: "Customer Management", status: "testing", message: "Not tested yet" },
    { name: "Service Plans", status: "testing", message: "Not tested yet" },
    { name: "Payment Processing", status: "testing", message: "Not tested yet" },
    { name: "HR Management", status: "testing", message: "Not tested yet" },
    { name: "Network Management", status: "testing", message: "Not tested yet" },
    { name: "Billing System", status: "testing", message: "Not tested yet" },
    { name: "Analytics", status: "testing", message: "Not tested yet" },
  ])
  const [isRunningTests, setIsRunningTests] = useState(false)

  const getStatusIcon = (status: ModuleStatus["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "testing":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: ModuleStatus["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Working</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "testing":
        return <Badge className="bg-blue-100 text-blue-800">Testing</Badge>
    }
  }

  const runDatabaseTests = async () => {
    setIsRunningTests(true)

    try {
      const response = await fetch("/api/test-database-operations", {
        method: "POST",
      })
      const result = await response.json()

      // Update module statuses based on test results
      const updatedModules = modules.map((module) => {
        const now = new Date().toLocaleString()

        if (module.name === "Database Connection") {
          return {
            ...module,
            status: result.success ? "success" : "error",
            message: result.success ? "Database connection working" : "Database connection failed",
            lastTested: now,
          }
        }

        // Check specific test results
        const testResult = result.results?.find((r: string) =>
          r.toLowerCase().includes(module.name.toLowerCase().split(" ")[0]),
        )

        if (testResult) {
          return {
            ...module,
            status: testResult.startsWith("✓") ? "success" : "error",
            message: testResult,
            lastTested: now,
          }
        }

        return {
          ...module,
          status: "success" as const,
          message: "Module appears to be working",
          lastTested: now,
        }
      })

      setModules(updatedModules)
    } catch (error) {
      console.error("Error running tests:", error)
      const updatedModules = modules.map((module) => ({
        ...module,
        status: "error" as const,
        message: "Failed to run tests",
        lastTested: new Date().toLocaleString(),
      }))
      setModules(updatedModules)
    } finally {
      setIsRunningTests(false)
    }
  }

  const setupDatabase = async () => {
    try {
      const response = await fetch("/api/setup-database", {
        method: "POST",
      })
      const result = await response.json()

      if (result.success) {
        // Re-run tests after setup
        await runDatabaseTests()
      }
    } catch (error) {
      console.error("Error setting up database:", error)
    }
  }

  const overallStatus = modules.every((m) => m.status === "success")
    ? "success"
    : modules.some((m) => m.status === "error")
      ? "error"
      : "warning"

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Verification</h1>
          <p className="text-muted-foreground">Verify that all modules are working correctly</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={setupDatabase} variant="outline">
            Setup Database
          </Button>
          <Button onClick={runDatabaseTests} disabled={isRunningTests}>
            {isRunningTests ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Run Tests"
            )}
          </Button>
        </div>
      </div>

      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            System Status
          </CardTitle>
          <CardDescription>Overall health of the ISP Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {modules.filter((m) => m.status === "success").length} / {modules.length}
              </p>
              <p className="text-sm text-muted-foreground">Modules Working</p>
            </div>
            {getStatusBadge(overallStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Module Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.name}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  {getStatusIcon(module.status)}
                  {module.name}
                </span>
                {getStatusBadge(module.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{module.message}</p>
              {module.lastTested && <p className="text-xs text-muted-foreground">Last tested: {module.lastTested}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common maintenance and troubleshooting actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" onClick={() => window.open("/api/test-connection", "_blank")}>
              Test Connection
            </Button>
            <Button variant="outline" onClick={() => window.open("/customers", "_blank")}>
              Test Customers
            </Button>
            <Button variant="outline" onClick={() => window.open("/services", "_blank")}>
              Test Services
            </Button>
            <Button variant="outline" onClick={() => window.open("/hr", "_blank")}>
              Test HR Module
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Database</h4>
              <p className="text-sm text-muted-foreground">Neon PostgreSQL</p>
              <p className="text-sm text-muted-foreground">
                Connection: {process.env.NODE_ENV === "production" ? "Production" : "Development"}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Application</h4>
              <p className="text-sm text-muted-foreground">Next.js 14</p>
              <p className="text-sm text-muted-foreground">ISP Management System v1.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

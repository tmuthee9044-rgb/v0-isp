"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, XCircle, Loader2, Play } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface TroubleshooterProps {
  routerId: string
  routerIp: string
  vendor: string
}

interface CheckResult {
  step: string
  status: "pending" | "success" | "error" | "warning"
  message: string
  details?: string
  fix?: string
}

export function ConnectionTroubleshooter({ routerId, routerIp, vendor }: TroubleshooterProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<CheckResult[]>([])

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    const checks: CheckResult[] = [
      { step: "Network Reachability", status: "pending", message: "Checking if router is reachable..." },
      { step: "Port Connectivity", status: "pending", message: "Testing management port..." },
      { step: "Authentication", status: "pending", message: "Verifying credentials..." },
      { step: "RADIUS Configuration", status: "pending", message: "Checking RADIUS setup..." },
      { step: "Database Connection", status: "pending", message: "Verifying NAS entry in database..." },
      { step: "FreeRADIUS Status", status: "pending", message: "Checking RADIUS server health..." },
    ]

    setResults([...checks])

    try {
      // Step 1: Network Reachability
      await simulateCheck(0, async () => {
        const response = await fetch(`/api/network/routers/${routerId}/health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: "ping" }),
        })
        const data = await response.json()

        if (data.reachable) {
          return {
            status: "success" as const,
            message: `Router is reachable at ${routerIp}`,
            details: `Latency: ${data.latency || "N/A"}ms`,
          }
        }
        return {
          status: "error" as const,
          message: `Cannot reach router at ${routerIp}`,
          details: data.error || "Network timeout or incorrect IP",
          fix: "Check: 1) IP address is correct, 2) Router is powered on, 3) Network connectivity, 4) Firewall rules",
        }
      })

      // Step 2: Port Connectivity
      await simulateCheck(1, async () => {
        const response = await fetch(`/api/network/routers/${routerId}/health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: "port" }),
        })
        const data = await response.json()

        if (data.portOpen) {
          return {
            status: "success" as const,
            message: `Management port is accessible`,
            details: `${vendor === "mikrotik" ? "API" : vendor === "juniper" ? "NETCONF" : "SSH"} port responding`,
          }
        }
        return {
          status: "error" as const,
          message: "Management port is closed or filtered",
          details: data.error,
          fix: `Enable ${vendor === "mikrotik" ? "API service (port 8728)" : vendor === "juniper" ? "NETCONF (port 830)" : "SSH (port 22)"} on router`,
        }
      })

      // Step 3: Authentication
      await simulateCheck(2, async () => {
        const response = await fetch(`/api/network/routers/${routerId}/health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: "auth" }),
        })
        const data = await response.json()

        if (data.authenticated) {
          return {
            status: "success" as const,
            message: "Authentication successful",
            details: `Logged in as ${data.username}`,
          }
        }
        return {
          status: "error" as const,
          message: "Authentication failed",
          details: data.error || "Invalid credentials",
          fix: "Verify username and password in router settings. Check if API/NETCONF/SSH is enabled.",
        }
      })

      // Step 4: RADIUS Configuration
      await simulateCheck(3, async () => {
        const response = await fetch(`/api/network/routers/${routerId}/health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: "radius_config" }),
        })
        const data = await response.json()

        if (data.radiusConfigured) {
          return {
            status: "success" as const,
            message: "RADIUS is configured on router",
            details: `Server: ${data.radiusServer}, Profile: ${data.profile}`,
          }
        }
        if (data.radiusConfigured === false) {
          return {
            status: "warning" as const,
            message: "RADIUS not configured on router",
            details: "Router is set up but RADIUS authentication is not enabled",
            fix: "Apply the RADIUS configuration from the config generator above",
          }
        }
        return {
          status: "error" as const,
          message: "Cannot verify RADIUS configuration",
          details: data.error,
        }
      })

      // Step 5: Database NAS Entry
      await simulateCheck(4, async () => {
        const response = await fetch(`/api/network/routers/${routerId}/health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: "nas_entry" }),
        })
        const data = await response.json()

        if (data.nasExists) {
          return {
            status: "success" as const,
            message: "Router is registered in RADIUS NAS table",
            details: `NAS Name: ${data.nasName}, Secret configured`,
          }
        }
        return {
          status: "error" as const,
          message: "Router not found in RADIUS NAS table",
          details: "FreeRADIUS will reject auth requests from this router",
          fix: `Add NAS entry: INSERT INTO nas (nasname, shortname, secret) VALUES ('${routerIp}', '${vendor}-router', 'YOUR_SECRET')`,
        }
      })

      // Step 6: FreeRADIUS Health
      await simulateCheck(5, async () => {
        const response = await fetch(`/api/network/routers/${routerId}/health`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: "radius_health" }),
        })
        const data = await response.json()

        if (data.radiusHealthy) {
          return {
            status: "success" as const,
            message: "FreeRADIUS server is healthy",
            details: `Uptime: ${data.uptime}, Recent auths: ${data.recentAuths}`,
          }
        }
        return {
          status: "warning" as const,
          message: "FreeRADIUS status check failed",
          details: data.error || "RADIUS server may be down or unreachable",
          fix: "Check RADIUS server: systemctl status freeradius, check logs: /var/log/freeradius/radius.log",
        }
      })

      toast({ title: "Diagnostics Complete", description: "All checks finished" })
    } catch (error) {
      toast({
        title: "Diagnostic Error",
        description: "Failed to complete all checks",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const simulateCheck = async (index: number, checkFn: () => Promise<Partial<CheckResult>>) => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    try {
      const result = await checkFn()
      setResults((prev) =>
        prev.map((check, i) => (i === index ? { ...check, ...result, status: result.status || check.status } : check)),
      )
    } catch (error) {
      setResults((prev) =>
        prev.map((check, i) =>
          i === index
            ? {
                ...check,
                status: "error" as const,
                message: "Check failed",
                details: error instanceof Error ? error.message : "Unknown error",
              }
            : check,
        ),
      )
    }
  }

  const getStatusIcon = (status: CheckResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "pending":
        return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
    }
  }

  const getStatusBadge = (status: CheckResult["status"]) => {
    const variants = {
      success: "default" as const,
      error: "destructive" as const,
      warning: "secondary" as const,
      pending: "outline" as const,
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Troubleshooter</CardTitle>
        <CardDescription>
          Run comprehensive diagnostics to verify router connectivity, authentication, and RADIUS setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Full Diagnostic
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="p-4 border rounded-lg bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium text-sm">{result.step}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>

                {result.details && (
                  <div className="pl-8 text-sm text-muted-foreground">
                    <p>{result.details}</p>
                  </div>
                )}

                {result.fix && (
                  <div className="pl-8 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <p className="font-medium text-yellow-900 mb-1">Solution:</p>
                    <p className="text-yellow-700">{result.fix}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

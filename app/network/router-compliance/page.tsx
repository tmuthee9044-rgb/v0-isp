"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function RouterCompliancePage() {
  const [routers, setRouters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enforcing, setEnforcing] = useState(false)

  const loadRouters = async () => {
    try {
      const response = await fetch("/api/network/routers/compliance/check-all")
      const data = await response.json()
      setRouters(data.routers || [])
    } catch (error) {
      console.error("Failed to load routers:", error)
    } finally {
      setLoading(false)
    }
  }

  const runEnforcement = async () => {
    setEnforcing(true)
    try {
      const response = await fetch("/api/network/routers/compliance/check-all", {
        method: "POST",
      })
      const data = await response.json()
      alert(`Enforcement complete: ${data.compliant} compliant, ${data.repaired || 0} repaired, ${data.failed || 0} failed`)
      loadRouters()
    } catch (error) {
      console.error("Enforcement failed:", error)
      alert("Enforcement failed")
    } finally {
      setEnforcing(false)
    }
  }

  useEffect(() => {
    loadRouters()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "non_compliant":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Router Compliance</h1>
          <p className="text-muted-foreground">
            Ensure all routers meet ISP carrier-grade standards
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadRouters} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={runEnforcement} disabled={enforcing} variant="default">
            {enforcing ? "Enforcing..." : "Run Enforcement"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routers.map((router) => (
          <Card key={router.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{router.name}</CardTitle>
                  <CardDescription>{router.ip_address}</CardDescription>
                </div>
                {getStatusIcon(router.compliance_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>RADIUS Auth:</span>
                  <Badge variant={router.radius_auth ? "default" : "destructive"}>
                    {router.radius_auth ? "OK" : "FAIL"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>RADIUS Acct:</span>
                  <Badge variant={router.radius_acct ? "default" : "destructive"}>
                    {router.radius_acct ? "OK" : "FAIL"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>CoA (Disconnect):</span>
                  <Badge variant={router.radius_coa ? "default" : "destructive"}>
                    {router.radius_coa ? "OK" : "FAIL"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>DNS:</span>
                  <Badge variant={router.dns_ok ? "default" : "destructive"}>
                    {router.dns_ok ? "OK" : "FAIL"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>FastTrack Safe:</span>
                  <Badge variant={router.fasttrack_safe ? "default" : "destructive"}>
                    {router.fasttrack_safe ? "OK" : "FAIL"}
                  </Badge>
                </div>
                {router.compliance_notes && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {router.compliance_notes}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

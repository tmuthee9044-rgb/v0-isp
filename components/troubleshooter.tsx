"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TroubleshooterProps {
  defaultHost?: string
  defaultPort?: number
  defaultUsername?: string
  defaultPassword?: string
  defaultVendor?: string
}

interface TestResult {
  success: boolean
  message: string
  details?: any
}

export function Troubleshooter({
  defaultHost = "",
  defaultPort = 8728,
  defaultUsername = "",
  defaultPassword = "",
  defaultVendor = "mikrotik",
}: TroubleshooterProps) {
  const [host, setHost] = useState(defaultHost)
  const [port, setPort] = useState(defaultPort)
  const [username, setUsername] = useState(defaultUsername)
  const [password, setPassword] = useState(defaultPassword)
  const [vendor, setVendor] = useState(defaultVendor)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setResult(null)

    try {
      const response = await fetch("/api/network/routers/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: host,
          port,
          username,
          password,
          type: vendor,
          connection_method: vendor === "mikrotik" ? "api" : "ssh",
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        message: `Connection test failed: ${error.message}`,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Troubleshooting</CardTitle>
        <CardDescription>Test router connectivity and diagnose connection issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="troubleshoot-host">Router IP Address</Label>
            <Input
              id="troubleshoot-host"
              placeholder="192.168.88.1"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="troubleshoot-port">Port</Label>
            <Input
              id="troubleshoot-port"
              type="number"
              placeholder="8728"
              value={port}
              onChange={(e) => setPort(Number.parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="troubleshoot-username">Username</Label>
            <Input
              id="troubleshoot-username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="troubleshoot-password">Password</Label>
            <Input
              id="troubleshoot-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="troubleshoot-vendor">Vendor</Label>
          <Select value={vendor} onValueChange={setVendor}>
            <SelectTrigger id="troubleshoot-vendor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mikrotik">MikroTik</SelectItem>
              <SelectItem value="ubiquiti">Ubiquiti</SelectItem>
              <SelectItem value="juniper">Juniper</SelectItem>
              <SelectItem value="cisco">Cisco</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleTest} disabled={testing || !host || !username} className="w-full">
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertDescription>
              <div className="font-medium">{result.message}</div>
              {result.details && (
                <div className="mt-2 text-sm opacity-90">
                  {result.details.ping && <div>Latency: {result.details.ping.latency}ms</div>}
                  {result.details.router_os_version && <div>RouterOS Version: {result.details.router_os_version}</div>}
                  {result.details.services_detected && (
                    <div>Services: {result.details.services_detected.join(", ")}</div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {result && !result.success && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Troubleshooting Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Verify the router IP address is correct and reachable</li>
                <li>Check that the API service is enabled (MikroTik) or SSH is running</li>
                <li>Confirm username and password are correct</li>
                <li>Ensure firewall allows connections on port {port}</li>
                <li>For MikroTik: Enable REST API in System → Services</li>
                <li>Check that the router is powered on and network cable is connected</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}

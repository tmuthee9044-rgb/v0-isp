"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { generateRouterSetupGuide } from "@/lib/radius-client-config"

interface RADIUSConfigGeneratorProps {
  vendor: "mikrotik" | "ubiquiti" | "juniper"
  routerName: string
  nasIpAddress: string
  radiusSecret: string
  radiusServerIP?: string
}

export function RADIUSConfigGenerator({
  vendor,
  routerName,
  nasIpAddress,
  radiusSecret,
  radiusServerIP = process.env.NEXT_PUBLIC_RADIUS_SERVER_IP || "10.0.0.1",
}: RADIUSConfigGeneratorProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const shortname = routerName.toLowerCase().replace(/\s+/g, "-")

  const { freeradiusConfig, routerConfig, testCommands } = generateRouterSetupGuide({
    vendor,
    routerName,
    radiusServerIP,
    radiusSecret,
    nasIpAddress,
    shortname,
  })

  const handleCopy = (text: string, tabName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTab(tabName)
    setTimeout(() => setCopiedTab(null), 2000)
    toast({
      title: "Copied to clipboard",
      description: `${tabName} configuration copied successfully`,
    })
  }

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: "Downloaded",
      description: `${filename} downloaded successfully`,
    })
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>RADIUS Configuration Guide</CardTitle>
        <CardDescription>
          Copy-paste these configurations to connect your {vendor.toUpperCase()} router to FreeRADIUS
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="freeradius" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="freeradius">FreeRADIUS Server</TabsTrigger>
            <TabsTrigger value="router">{vendor.toUpperCase()} Router</TabsTrigger>
            <TabsTrigger value="test">Test Commands</TabsTrigger>
          </TabsList>

          <TabsContent value="freeradius" className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Add to /etc/freeradius/3.0/clients.conf</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleCopy(freeradiusConfig, "FreeRADIUS")}>
                    {copiedTab === "FreeRADIUS" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(freeradiusConfig, `${shortname}-freeradius.conf`)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="overflow-x-auto text-xs">
                <code>{freeradiusConfig}</code>
              </pre>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> After adding the client, restart FreeRADIUS:{" "}
              <code>systemctl restart freeradius</code>
            </div>
          </TabsContent>

          <TabsContent value="router" className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Run in {vendor.toUpperCase()} CLI</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleCopy(routerConfig, "Router")}>
                    {copiedTab === "Router" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(routerConfig, `${shortname}-${vendor}.conf`)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="overflow-x-auto text-xs">
                <code>{routerConfig}</code>
              </pre>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <strong>Security:</strong> Store RADIUS secrets securely. Never commit them to version control.
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Verify RADIUS connectivity</p>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(testCommands, "Test Commands")}>
                  {copiedTab === "Test Commands" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="overflow-x-auto text-xs">
                <code>{testCommands}</code>
              </pre>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
                <strong>Expected:</strong> RADIUS server should respond with Access-Accept for valid credentials
              </div>
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                <strong>Troubleshoot:</strong> Check firewall rules (UDP 1812/1813), RADIUS secret match, and NAS IP
                address
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

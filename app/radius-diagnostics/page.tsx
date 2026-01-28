"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Terminal,
  Search,
  Upload,
  Copy,
  ExternalLink,
  Zap,
  Info,
} from "lucide-react"

interface DiagnosticResult {
  severity: "error" | "warning" | "info" | "success"
  category: string
  title: string
  description: string
  solutions: string[]
  commands?: string[]
}

interface LogAnalysis {
  hasConfigError: boolean
  hasPermissionError: boolean
  hasPortConflict: boolean
  hasModuleError: boolean
  hasCertificateError: boolean
  exitCode: string | null
  configCheckPassed: boolean
  errors: string[]
  warnings: string[]
}

export default function RadiusDiagnosticsPage() {
  const [logContent, setLogContent] = useState("")
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzeLogs = () => {
    setIsAnalyzing(true)

    // Simulate analysis delay
    setTimeout(() => {
      const logText = logContent.toLowerCase()

      const analysis: LogAnalysis = {
        hasConfigError: logText.includes("configuration error") || logText.includes("failed to parse"),
        hasPermissionError: logText.includes("permission denied") || logText.includes("eacces"),
        hasPortConflict: logText.includes("address already in use") || logText.includes("bind failed"),
        hasModuleError: logText.includes("module") && logText.includes("error"),
        hasCertificateError: logText.includes("certificate") || logText.includes("tls") || logText.includes("ssl"),
        exitCode: logContent.match(/exit.*code.*=.*'?(\d+)'?/i)?.[1] || null,
        configCheckPassed: logText.includes("configuration appears to be ok"),
        errors: [],
        warnings: [],
      }

      // Extract specific errors
      const errorPatterns = [
        /error[:\s]+(.+)/gi,
        /failed[:\s]+(.+)/gi,
        /unable to[:\s]+(.+)/gi,
      ]

      errorPatterns.forEach((pattern) => {
        const matches = logContent.matchAll(pattern)
        for (const match of matches) {
          if (match[1] && match[1].length < 200) {
            analysis.errors.push(match[1].trim())
          }
        }
      })

      setAnalysis(analysis)
      generateDiagnostics(analysis, logText)
      setIsAnalyzing(false)
    }, 800)
  }

  const generateDiagnostics = (analysis: LogAnalysis, logText: string) => {
    const results: DiagnosticResult[] = []

    // Configuration check passed but service failed
    if (analysis.configCheckPassed && analysis.exitCode === "1") {
      results.push({
        severity: "error",
        category: "Service Startup",
        title: "Configuration Test Passes but Service Fails to Start",
        description:
          "FreeRADIUS configuration syntax is valid, but the service exits with code 1. This typically indicates permission issues, port conflicts, or missing runtime dependencies.",
        solutions: [
          "Check if another FreeRADIUS instance is already running",
          "Verify file and directory permissions for /etc/freeradius/ and /var/log/freeradius/",
          "Ensure the radiusd user and group exist with proper permissions",
          "Check if authentication ports (1812, 1813) are already in use",
          "Review systemd service file for any startup restrictions",
        ],
        commands: [
          "sudo systemctl status freeradius.service",
          "sudo ps aux | grep radiusd",
          "sudo netstat -tulpn | grep -E '1812|1813'",
          "sudo ls -la /etc/freeradius/3.0/",
          "sudo journalctl -xeu freeradius.service --no-pager",
          "sudo freeradius -X",
        ],
      })
    }

    // Permission issues
    if (analysis.hasPermissionError || logText.includes("permission")) {
      results.push({
        severity: "error",
        category: "Permissions",
        title: "File or Directory Permission Error",
        description:
          "FreeRADIUS cannot access required files or directories. This is often due to incorrect ownership or permissions.",
        solutions: [
          "Set correct ownership: chown -R freerad:freerad /etc/freeradius/",
          "Fix directory permissions: chmod 750 /etc/freeradius/",
          "Fix config file permissions: chmod 640 /etc/freeradius/3.0/*.conf",
          "Verify log directory: chmod 755 /var/log/freeradius/",
        ],
        commands: [
          "sudo chown -R freerad:freerad /etc/freeradius/",
          "sudo chmod 750 /etc/freeradius/3.0/",
          "sudo chmod 640 /etc/freeradius/3.0/*.conf",
          "sudo mkdir -p /var/log/freeradius/",
          "sudo chown freerad:freerad /var/log/freeradius/",
        ],
      })
    }

    // Port conflict
    if (analysis.hasPortConflict) {
      results.push({
        severity: "error",
        category: "Network",
        title: "Port Conflict Detected",
        description: "Another service is using the RADIUS ports (1812/UDP for auth, 1813/UDP for accounting).",
        solutions: [
          "Stop any other RADIUS services running on the system",
          "Kill any orphaned radiusd processes",
          "Change FreeRADIUS ports in /etc/freeradius/3.0/radiusd.conf if needed",
          "Check for Docker containers using these ports",
        ],
        commands: [
          "sudo netstat -tulpn | grep -E '1812|1813'",
          "sudo lsof -i :1812",
          "sudo lsof -i :1813",
          "sudo pkill -9 radiusd",
          "sudo systemctl stop freeradius.service",
        ],
      })
    }

    // Module issues
    if (analysis.hasModuleError || logText.includes("ignoring")) {
      results.push({
        severity: "warning",
        category: "Modules",
        title: "Module Configuration Issues",
        description:
          "SQL or LDAP modules are being ignored. This is normal if you're not using them, but verify your authentication backend is properly configured.",
        solutions: [
          "If using SQL: Uncomment and configure /etc/freeradius/3.0/mods-available/sql",
          "If using LDAP: Uncomment and configure /etc/freeradius/3.0/mods-available/ldap",
          "Enable required modules: ln -s ../mods-available/sql /etc/freeradius/3.0/mods-enabled/",
          "Verify database connectivity if using SQL backend",
        ],
        commands: [
          "sudo ls -la /etc/freeradius/3.0/mods-enabled/",
          "sudo ln -s ../mods-available/sql /etc/freeradius/3.0/mods-enabled/",
          "sudo nano /etc/freeradius/3.0/mods-available/sql",
          "mysql -u radius -p radius",
        ],
      })
    }

    // Certificate/TLS issues
    if (analysis.hasCertificateError) {
      results.push({
        severity: "warning",
        category: "TLS/Certificates",
        title: "TLS Certificate Configuration",
        description:
          "TLS/SSL certificates are configured. Ensure certificates are valid and accessible if you're using EAP-TLS or TTLS.",
        solutions: [
          "Generate new certificates: cd /etc/freeradius/3.0/certs && make",
          "Check certificate permissions: chmod 640 /etc/freeradius/3.0/certs/*.pem",
          "Verify certificate validity dates",
          "Ensure CA certificate matches server certificate",
        ],
        commands: [
          "cd /etc/freeradius/3.0/certs && sudo make",
          "sudo ls -la /etc/freeradius/3.0/certs/",
          "sudo openssl x509 -in /etc/freeradius/3.0/certs/server.pem -noout -dates",
        ],
      })
    }

    // Generic troubleshooting if no specific issues found
    if (results.length === 0 && analysis.exitCode === "1") {
      results.push({
        severity: "info",
        category: "General",
        title: "Service Failed - General Troubleshooting",
        description: "The service failed to start. Follow these general troubleshooting steps.",
        solutions: [
          "Run FreeRADIUS in debug mode to see detailed output",
          "Check system logs for additional error messages",
          "Verify all dependencies are installed",
          "Ensure no firewall is blocking the service",
          "Check for SELinux/AppArmor restrictions",
        ],
        commands: [
          "sudo freeradius -X",
          "sudo journalctl -xeu freeradius.service --no-pager",
          "sudo systemctl status freeradius.service",
          "dpkg -l | grep freeradius",
          "sudo aa-status",
        ],
      })
    }

    // Add success message if everything looks good
    if (analysis.configCheckPassed && !analysis.exitCode) {
      results.push({
        severity: "success",
        category: "Status",
        title: "Configuration Valid",
        description: "FreeRADIUS configuration appears to be correct. The service should start successfully.",
        solutions: ["Try starting the service: systemctl start freeradius.service"],
        commands: ["sudo systemctl start freeradius.service", "sudo systemctl status freeradius.service"],
      })
    }

    setDiagnostics(results)
  }

  const copyCom = (command: string) => {
    navigator.clipboard.writeText(command)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "success":
        return "border-green-200 bg-green-50"
      default:
        return "border-blue-200 bg-blue-50"
    }
  }

  const loadSampleLogs = () => {
    const sampleLogs = `Jan 25 17:18:28 isp-virtual-machine freeradius[76615]: Debug state unknown (cap_sys_ptrace capability not set)
Jan 25 17:18:28 isp-virtual-machine freeradius[76615]: Creating attribute Unix-Group
Jan 25 17:18:28 isp-virtual-machine freeradius[76615]: rlm_cache (cache_eap): Driver rlm_cache_rbtree (module rlm_cache_rbtree) loaded and linked
Jan 25 17:18:28 isp-virtual-machine freeradius[76615]: rlm_mschap (mschap): using internal authentication
Jan 25 17:18:28 isp-virtual-machine freeradius[76615]: Ignoring "sql" (see raddb/mods-available/README.rst)
Jan 25 17:18:28 isp-virtual-machine freeradius[76615]: Ignoring "ldap" (see raddb/mods-available/README.rst)
Jan 25 17:18:28 isp-virtual-machine freeradius[76615]: Configuration appears to be OK
Jan 25 17:18:28 isp-virtual-machine systemd[1]: freeradius.service: Main process exited, code=exited, status=1/FAILURE
Jan 25 17:18:28 isp-virtual-machine systemd[1]: freeradius.service: Failed with result 'exit-code'.
Jan 25 17:18:28 isp-virtual-machine systemd[1]: Failed to start freeradius.service - FreeRADIUS multi-protocol policy server.`

    setLogContent(sampleLogs)
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          FreeRADIUS Diagnostics Tool
        </h2>
        <p className="text-muted-foreground">
          Analyze FreeRADIUS logs to identify and resolve service startup issues
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Log Input
            </CardTitle>
            <CardDescription>Paste your FreeRADIUS system logs or journalctl output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your FreeRADIUS logs here..."
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={analyzeLogs} disabled={!logContent || isAnalyzing} className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                {isAnalyzing ? "Analyzing..." : "Analyze Logs"}
              </Button>
              <Button onClick={loadSampleLogs} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Load Sample
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Analysis Summary
            </CardTitle>
            <CardDescription>Quick overview of detected issues</CardDescription>
          </CardHeader>
          <CardContent>
            {!analysis ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analysis yet. Paste logs and click Analyze.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    {analysis.configCheckPassed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Config Syntax</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.exitCode === "1" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">Service Start</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.hasPermissionError ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">Permissions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis.hasPortConflict ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">Port Conflicts</span>
                  </div>
                </div>

                {analysis.exitCode && (
                  <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertDescription>Exit Code: {analysis.exitCode}</AlertDescription>
                  </Alert>
                )}

                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">Issues Found:</h4>
                  <div className="flex flex-wrap gap-2">
                    {diagnostics.length === 0 && <Badge variant="outline">No critical issues detected</Badge>}
                    {diagnostics.map((diag, idx) => (
                      <Badge
                        key={idx}
                        variant={diag.severity === "error" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {diag.category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic Results */}
      {diagnostics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Diagnostic Results & Solutions
            </CardTitle>
            <CardDescription>Detailed analysis with actionable solutions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({diagnostics.length})</TabsTrigger>
                <TabsTrigger value="error">
                  Errors ({diagnostics.filter((d) => d.severity === "error").length})
                </TabsTrigger>
                <TabsTrigger value="warning">
                  Warnings ({diagnostics.filter((d) => d.severity === "warning").length})
                </TabsTrigger>
                <TabsTrigger value="info">
                  Info ({diagnostics.filter((d) => d.severity === "info" || d.severity === "success").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                {diagnostics.map((diag, idx) => (
                  <Card key={idx} className={getSeverityColor(diag.severity)}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(diag.severity)}
                        <div className="flex-1">
                          <CardTitle className="text-lg">{diag.title}</CardTitle>
                          <Badge variant="outline" className="mt-2">
                            {diag.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{diag.description}</p>

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Solutions:</h4>
                        <ul className="space-y-1">
                          {diag.solutions.map((solution, sidx) => (
                            <li key={sidx} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{solution}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {diag.commands && diag.commands.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Terminal className="h-4 w-4" />
                            Commands:
                          </h4>
                          <div className="space-y-2">
                            {diag.commands.map((cmd, cidx) => (
                              <div
                                key={cidx}
                                className="flex items-center gap-2 bg-black text-green-400 p-2 rounded font-mono text-xs"
                              >
                                <code className="flex-1">{cmd}</code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyCom(cmd)}
                                  className="h-6 w-6 p-0 hover:bg-gray-800"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="error" className="space-y-4 mt-4">
                {diagnostics
                  .filter((d) => d.severity === "error")
                  .map((diag, idx) => (
                    <Card key={idx} className={getSeverityColor(diag.severity)}>
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(diag.severity)}
                          <div className="flex-1">
                            <CardTitle className="text-lg">{diag.title}</CardTitle>
                            <Badge variant="outline" className="mt-2">
                              {diag.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{diag.description}</p>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Solutions:</h4>
                          <ul className="space-y-1">
                            {diag.solutions.map((solution, sidx) => (
                              <li key={sidx} className="text-sm flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{solution}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {diag.commands && diag.commands.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Terminal className="h-4 w-4" />
                              Commands:
                            </h4>
                            <div className="space-y-2">
                              {diag.commands.map((cmd, cidx) => (
                                <div
                                  key={cidx}
                                  className="flex items-center gap-2 bg-black text-green-400 p-2 rounded font-mono text-xs"
                                >
                                  <code className="flex-1">{cmd}</code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyCom(cmd)}
                                    className="h-6 w-6 p-0 hover:bg-gray-800"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </TabsContent>

              <TabsContent value="warning" className="space-y-4 mt-4">
                {diagnostics
                  .filter((d) => d.severity === "warning")
                  .map((diag, idx) => (
                    <Card key={idx} className={getSeverityColor(diag.severity)}>
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(diag.severity)}
                          <div className="flex-1">
                            <CardTitle className="text-lg">{diag.title}</CardTitle>
                            <Badge variant="outline" className="mt-2">
                              {diag.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{diag.description}</p>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Solutions:</h4>
                          <ul className="space-y-1">
                            {diag.solutions.map((solution, sidx) => (
                              <li key={sidx} className="text-sm flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{solution}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {diag.commands && diag.commands.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Terminal className="h-4 w-4" />
                              Commands:
                            </h4>
                            <div className="space-y-2">
                              {diag.commands.map((cmd, cidx) => (
                                <div
                                  key={cidx}
                                  className="flex items-center gap-2 bg-black text-green-400 p-2 rounded font-mono text-xs"
                                >
                                  <code className="flex-1">{cmd}</code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyCom(cmd)}
                                    className="h-6 w-6 p-0 hover:bg-gray-800"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </TabsContent>

              <TabsContent value="info" className="space-y-4 mt-4">
                {diagnostics
                  .filter((d) => d.severity === "info" || d.severity === "success")
                  .map((diag, idx) => (
                    <Card key={idx} className={getSeverityColor(diag.severity)}>
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(diag.severity)}
                          <div className="flex-1">
                            <CardTitle className="text-lg">{diag.title}</CardTitle>
                            <Badge variant="outline" className="mt-2">
                              {diag.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{diag.description}</p>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Solutions:</h4>
                          <ul className="space-y-1">
                            {diag.solutions.map((solution, sidx) => (
                              <li key={sidx} className="text-sm flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{solution}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {diag.commands && diag.commands.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Terminal className="h-4 w-4" />
                              Commands:
                            </h4>
                            <div className="space-y-2">
                              {diag.commands.map((cmd, cidx) => (
                                <div
                                  key={cidx}
                                  className="flex items-center gap-2 bg-black text-green-400 p-2 rounded font-mono text-xs"
                                >
                                  <code className="flex-1">{cmd}</code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyCom(cmd)}
                                    className="h-6 w-6 p-0 hover:bg-gray-800"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Additional Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Common FreeRADIUS Commands</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded">sudo freeradius -X</code> - Debug mode
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded">sudo systemctl restart freeradius</code> - Restart service
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded">radtest username password localhost 0 testing123</code> -
                  Test auth
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Important File Locations</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/etc/freeradius/3.0/</code> - Main config
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/var/log/freeradius/</code> - Log directory
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/etc/freeradius/3.0/clients.conf</code> - NAS
                  clients
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

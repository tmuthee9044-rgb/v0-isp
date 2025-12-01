"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function InitSchemaPage() {
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string>("")

  const runSync = async () => {
    setStatus("syncing")
    setProgress(0)
    setLogs([])
    setError("")

    try {
      setLogs((prev) => [...prev, "Starting schema synchronization..."])
      setProgress(10)

      const response = await fetch("/api/admin/sync-all-146-tables", {
        method: "POST",
      })

      setProgress(50)

      if (!response.ok) {
        throw new Error(`Failed to sync: ${response.statusText}`)
      }

      const result = await response.json()
      setProgress(90)

      if (result.success) {
        setLogs((prev) => [...prev, `✓ Successfully synced ${result.tablesSynced || 0} tables`])
        setLogs((prev) => [...prev, `✓ Created ${result.tablesCreated || 0} missing tables`])
        setLogs((prev) => [...prev, `✓ Added ${result.columnsAdded || 0} missing columns`])
        if (result.details) {
          result.details.forEach((detail: string) => {
            setLogs((prev) => [...prev, detail])
          })
        }
        setProgress(100)
        setStatus("success")
      } else {
        throw new Error(result.error || "Unknown error occurred")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync schema")
      setStatus("error")
      setLogs((prev) => [...prev, `✗ Error: ${err instanceof Error ? err.message : "Unknown error"}`])
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Database Schema Initialization</h1>
          <p className="text-muted-foreground mt-2">
            Synchronize all 146 tables from Neon to your local PostgreSQL database
          </p>
        </div>

        <Alert>
          <AlertDescription>
            This tool will create all missing tables and add missing columns to ensure your local PostgreSQL database
            matches the Neon serverless database schema exactly (Rule 4 compliance).
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Schema Synchronization</CardTitle>
            <CardDescription>Click the button below to sync all 146 tables and their columns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runSync} disabled={status === "syncing"} className="w-full" size="lg">
              {status === "syncing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sync Complete
                </>
              ) : status === "error" ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Sync Failed - Try Again
                </>
              ) : (
                "Start Schema Sync"
              )}
            </Button>

            {status === "syncing" && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </div>
            )}

            {status === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Schema synchronization completed successfully! Your local database now has all 146 tables with
                  matching columns.
                </AlertDescription>
              </Alert>
            )}

            {status === "error" && error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {status === "success" && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              You can now safely navigate to other pages. All schema errors should be resolved.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

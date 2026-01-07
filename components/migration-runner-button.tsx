"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Database, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

export function MigrationRunnerButton() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const runMigrations = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-migrations", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setResult({ success: true, message: "Migrations completed successfully" })
        toast.success("Database migrations completed!")
      } else {
        setResult({ success: false, message: data.error || "Migration failed" })
        toast.error(`Migration failed: ${data.error}`)
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message })
      toast.error(`Error running migrations: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={runMigrations} disabled={isRunning} variant="outline" size="sm">
        {isRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running Migrations...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Run Database Migrations
          </>
        )}
      </Button>

      {result && (
        <div className="flex items-center gap-2">
          {result.success ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">{result.message}</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600">{result.message}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Play, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SyncJob {
  id: number
  router_id: number
  router_name: string
  job_type: string
  status: string
  error_message?: string
  retry_count: number
  max_retries: number
  started_at?: string
  completed_at?: string
  created_at: string
}

interface SyncStats {
  total_jobs: number
  pending_jobs: number
  running_jobs: number
  completed_jobs: number
  failed_jobs: number
  success_rate: number
}

function SyncStatus() {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([])
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSyncData()
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchSyncData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSyncData = async () => {
    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        fetch("/api/network/sync/jobs"),
        fetch("/api/network/sync/stats"),
      ])

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setSyncJobs(jobsData)
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setSyncStats(statsData)
      }
    } catch (error) {
      console.error("Failed to fetch sync data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch sync data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSyncData()
  }

  const retryJob = async (jobId: number) => {
    try {
      const response = await fetch(`/api/network/sync/retry/${jobId}`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sync job queued for retry",
        })
        fetchSyncData()
      } else {
        throw new Error("Failed to retry job")
      }
    } catch (error) {
      console.error("Failed to retry job:", error)
      toast({
        title: "Error",
        description: "Failed to retry sync job",
        variant: "destructive",
      })
    }
  }

  const runFullSync = async () => {
    try {
      const response = await fetch("/api/network/sync/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_type: "full_sync" }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Full sync initiated for all routers",
        })
        fetchSyncData()
      } else {
        throw new Error("Failed to initiate full sync")
      }
    } catch (error) {
      console.error("Failed to run full sync:", error)
      toast({
        title: "Error",
        description: "Failed to initiate full sync",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        )
      case "running":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case "retrying":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            Retrying
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getJobTypeBadge = (jobType: string) => {
    switch (jobType) {
      case "full_sync":
        return <Badge variant="outline">Full Sync</Badge>
      case "ip_assignment":
        return <Badge variant="default">IP Assignment</Badge>
      case "service_provision":
        return <Badge variant="secondary">Service Provision</Badge>
      case "service_termination":
        return <Badge>Service Termination</Badge>
      default:
        return <Badge variant="secondary">{jobType}</Badge>
    }
  }

  if (loading) {
    return <div>Loading sync status...</div>
  }

  return (
    <div className="space-y-4">
      {/* Sync Statistics */}
      {syncStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncStats.total_jobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{syncStats.pending_jobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{syncStats.running_jobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{syncStats.failed_jobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{syncStats.success_rate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sync Jobs</CardTitle>
              <CardDescription>Monitor router synchronization jobs and their status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={runFullSync}>
                <Play className="mr-2 h-4 w-4" />
                Run Full Sync
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Router</TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retry Count</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.router_name}</TableCell>
                  <TableCell>{getJobTypeBadge(job.job_type)}</TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    {job.retry_count}/{job.max_retries}
                  </TableCell>
                  <TableCell>{job.started_at ? new Date(job.started_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>{job.completed_at ? new Date(job.completed_at).toLocaleString() : "-"}</TableCell>
                  <TableCell className="max-w-xs truncate" title={job.error_message}>
                    {job.error_message || "-"}
                  </TableCell>
                  <TableCell>
                    {job.status === "failed" && job.retry_count < job.max_retries && (
                      <Button variant="outline" size="sm" onClick={() => retryJob(job.id)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export { SyncStatus }
export default SyncStatus

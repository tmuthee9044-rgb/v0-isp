"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, RefreshCw, Search, FileText, CreditCard, Globe, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Activity {
  id: string
  timestamp: string
  type: string
  description: string
  amount: string
  status: string
  admin: string
  ip: string
  icon: string
}

export function CustomerAuditLogTab({ customerId }: { customerId: number }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activityType, setActivityType] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchActivities()
  }, [customerId, activityType, searchQuery])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activityType !== "all") params.append("type", activityType)
      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`/api/customers/${customerId}/audit-logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching activities:", error)
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Type", "Description", "Amount", "Status", "Admin/IP"],
      ...activities.map((a) => [
        new Date(a.timestamp).toLocaleString(),
        a.type,
        a.description,
        a.amount,
        a.status,
        a.admin || a.ip,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `customer-${customerId}-activity-log.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Activity log exported successfully",
    })
  }

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case "payment":
        return <CreditCard className="h-4 w-4" />
      case "credit_note":
        return <FileText className="h-4 w-4" />
      case "admin":
        return <Settings className="h-4 w-4" />
      case "service":
        return <Globe className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-500 hover:bg-green-600"
      case "APPROVED":
        return "bg-blue-500 hover:bg-blue-600"
      case "INFO":
        return "bg-gray-500 hover:bg-gray-600"
      case "PENDING":
        return "bg-yellow-500 hover:bg-yellow-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Activity Logs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete activity history including payments, invoices, M-Pesa transactions, service changes, admin actions,
            and portal activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="default" size="sm" onClick={fetchActivities}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Search Activities</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-64">
          <label className="text-sm font-medium mb-2 block">Activity Type</label>
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger>
              <SelectValue placeholder="All Activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="credit">Credit Notes</SelectItem>
              <SelectItem value="service">Service Changes</SelectItem>
              <SelectItem value="admin">Admin Actions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px]">Admin/IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading activities...
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No activities found
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-mono text-sm">{formatTimestamp(activity.timestamp)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-muted">{getActivityIcon(activity.icon)}</div>
                      <span className="text-xs font-medium">{activity.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{activity.description}</TableCell>
                  <TableCell className="font-mono text-sm">{activity.amount !== "-" ? activity.amount : "-"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {activity.admin !== "-" ? activity.admin : activity.ip}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

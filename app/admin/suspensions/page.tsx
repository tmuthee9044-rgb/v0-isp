"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Zap,
  DollarSign,
  Activity,
  UserX,
  UserCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

interface SuspensionStats {
  totalSuspended: number
  suspendedToday: number
  reactivatedToday: number
  overduePayments: number
  manualSuspensions: number
  automatedSuspensions: number
  averageSuspensionDuration: number
  suspensionTrend: number
}

interface SuspendedCustomer {
  id: number
  name: string
  email: string
  phone: string
  suspensionReason: string
  suspendedAt: string
  suspendedBy: string
  daysSuspended: number
  overdueAmount: number
  serviceType: string
  status: "suspended" | "pending_reactivation"
}

interface SuspensionActivity {
  id: number
  customerName: string
  action: "suspended" | "reactivated"
  reason: string
  timestamp: string
  performedBy: string
  serviceType: string
}

export default function SuspensionManagement() {
  const [stats, setStats] = useState<SuspensionStats | null>(null)
  const [suspendedCustomers, setSuspendedCustomers] = useState<SuspendedCustomer[]>([])
  const [recentActivity, setRecentActivity] = useState<SuspensionActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterReason, setFilterReason] = useState("all")
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])

  useEffect(() => {
    fetchSuspensionData()
  }, [])

  const fetchSuspensionData = async () => {
    try {
      setLoading(true)
      const [statsRes, customersRes, activityRes] = await Promise.all([
        fetch("/api/admin/suspension-stats"),
        fetch("/api/admin/suspended-customers"),
        fetch("/api/admin/suspension-activity"),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data)
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setSuspendedCustomers(customersData.data)
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setRecentActivity(activityData.data)
      }
    } catch (error) {
      console.error("Failed to fetch suspension data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkReactivation = async () => {
    if (selectedCustomers.length === 0) return

    try {
      const response = await fetch("/api/admin/bulk-reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds: selectedCustomers }),
      })

      if (response.ok) {
        await fetchSuspensionData()
        setSelectedCustomers([])
      }
    } catch (error) {
      console.error("Failed to reactivate customers:", error)
    }
  }

  const filteredCustomers = suspendedCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterReason === "all" || customer.suspensionReason === filterReason
    return matchesSearch && matchesFilter
  })

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "overdue_payment":
        return (
          <Badge variant="destructive" className="text-xs">
            Overdue Payment
          </Badge>
        )
      case "manual_suspension":
        return (
          <Badge variant="secondary" className="text-xs">
            Manual
          </Badge>
        )
      case "policy_violation":
        return (
          <Badge variant="outline" className="text-xs">
            Policy Violation
          </Badge>
        )
      case "technical_issue":
        return (
          <Badge variant="default" className="text-xs">
            Technical
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {reason}
          </Badge>
        )
    }
  }

  const getActionIcon = (action: string) => {
    return action === "suspended" ? (
      <UserX className="h-4 w-4 text-red-500" />
    ) : (
      <UserCheck className="h-4 w-4 text-green-500" />
    )
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading suspension management data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suspension Management</h2>
          <p className="text-muted-foreground">Monitor and manage customer service suspensions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchSuspensionData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suspended</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.totalSuspended}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>Today: +{stats.suspendedToday}</span>
                {stats.suspensionTrend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                )}
                <span>{Math.abs(stats.suspensionTrend)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reactivated Today</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.reactivatedToday}</div>
              <p className="text-xs text-muted-foreground">Avg duration: {stats.averageSuspensionDuration} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.overduePayments}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.overduePayments / stats.totalSuspended) * 100)}% of suspensions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((stats.automatedSuspensions / stats.totalSuspended) * 100)}%
              </div>
              <Progress value={(stats.automatedSuspensions / stats.totalSuspended) * 100} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.automatedSuspensions} automated, {stats.manualSuspensions} manual
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Suspended Customers</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Suspended Customers</CardTitle>
                  <CardDescription>Manage and monitor suspended customer accounts</CardDescription>
                </div>
                {selectedCustomers.length > 0 && (
                  <Button onClick={handleBulkReactivation} className="bg-green-600 hover:bg-green-700">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Reactivate Selected ({selectedCustomers.length})
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterReason} onValueChange={setFilterReason}>
                  <SelectTrigger className="w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reasons</SelectItem>
                    <SelectItem value="overdue_payment">Overdue Payment</SelectItem>
                    <SelectItem value="manual_suspension">Manual Suspension</SelectItem>
                    <SelectItem value="policy_violation">Policy Violation</SelectItem>
                    <SelectItem value="technical_issue">Technical Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.length === filteredCustomers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomers(filteredCustomers.map((c) => c.id))
                          } else {
                            setSelectedCustomers([])
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Overdue Amount</TableHead>
                    <TableHead>Suspended By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomers([...selectedCustomers, customer.id])
                            } else {
                              setSelectedCustomers(selectedCustomers.filter((id) => id !== customer.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.serviceType}</Badge>
                      </TableCell>
                      <TableCell>{getReasonBadge(customer.suspensionReason)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{customer.daysSuspended} days</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.overdueAmount > 0 ? (
                          <span className="text-red-600 font-medium">
                            KSh {customer.overdueAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{customer.suspendedBy}</div>
                          <div className="text-muted-foreground">
                            {new Date(customer.suspendedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <UserCheck className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Suspension Activity</CardTitle>
              <CardDescription>Latest suspension and reactivation events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="mt-0.5">{getActionIcon(activity.action)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {activity.customerName} - {activity.action === "suspended" ? "Suspended" : "Reactivated"}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {activity.serviceType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.reason}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>By {activity.performedBy}</span>
                        <span>{new Date(activity.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Suspension Trends</CardTitle>
                <CardDescription>Monthly suspension and reactivation patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chart placeholder - Suspension trends over time
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suspension Reasons</CardTitle>
                <CardDescription>Breakdown of suspension causes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overdue Payments</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={65} className="w-20 h-2" />
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Manual Suspension</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={20} className="w-20 h-2" />
                      <span className="text-sm font-medium">20%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Policy Violations</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={10} className="w-20 h-2" />
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Technical Issues</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={5} className="w-20 h-2" />
                      <span className="text-sm font-medium">5%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

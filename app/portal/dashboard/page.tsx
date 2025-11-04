"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Wifi,
  Download,
  CreditCard,
  Bell,
  Settings,
  HelpCircle,
  Activity,
  CheckCircle,
  Phone,
  Mail,
  FileText,
  User,
  Zap,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function PortalDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")

  // Sample data
  const usageData = [
    { time: "00:00", download: 45, upload: 12 },
    { time: "04:00", download: 23, upload: 8 },
    { time: "08:00", download: 78, upload: 25 },
    { time: "12:00", download: 95, upload: 35 },
    { time: "16:00", download: 120, upload: 45 },
    { time: "20:00", download: 85, upload: 28 },
    { time: "24:00", download: 55, upload: 18 },
  ]

  const customerInfo = {
    name: "John Doe",
    accountNumber: "ACC-123456",
    email: "john.doe@email.com",
    phone: "+254712345678",
    address: "123 Main Street, Nairobi",
    plan: "Premium Fiber 100Mbps",
    status: "Active",
    joinDate: "2023-06-15",
  }

  const currentUsage = {
    download: 450, // GB
    upload: 125, // GB
    limit: 1000, // GB (unlimited = -1)
    speed: 98.5, // Mbps current
    maxSpeed: 100, // Mbps plan
  }

  const billing = {
    currentBalance: 0,
    nextBillDate: "2024-02-15",
    nextBillAmount: 2500,
    lastPayment: {
      amount: 2500,
      date: "2024-01-15",
      method: "M-Pesa",
    },
  }

  const tickets = [
    {
      id: "TKT-001",
      subject: "Slow internet speeds",
      status: "In Progress",
      created: "2024-01-10",
      priority: "Medium",
    },
    {
      id: "TKT-002",
      subject: "Billing inquiry",
      status: "Resolved",
      created: "2024-01-05",
      priority: "Low",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Welcome back, {customerInfo.name}</h1>
                <p className="text-sm text-gray-600">Account: {customerInfo.accountNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Service Status Alert */}
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your internet service is running normally. Current speed: {currentUsage.speed} Mbps
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Speed</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentUsage.speed} Mbps</div>
                  <p className="text-xs text-muted-foreground">of {currentUsage.maxSpeed} Mbps plan</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Used</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentUsage.download} GB</div>
                  <Progress value={(currentUsage.download / currentUsage.limit) * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KES {Math.round(billing.currentBalance)}</div>{" "}
                  {/* Rounded balance to whole number */}
                  <p className="text-xs text-muted-foreground">Next bill: {billing.nextBillDate}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Service Status</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <p className="text-xs text-muted-foreground">Since {customerInfo.joinDate}</p>
                </CardContent>
              </Card>
            </div>

            {/* Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Usage</CardTitle>
                <CardDescription>Download and upload activity over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="download" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="upload" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button className="h-20 flex-col">
                    <CreditCard className="h-6 w-6 mb-2" />
                    Pay Bill
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-transparent">
                    <HelpCircle className="h-6 w-6 mb-2" />
                    Get Support
                  </Button>
                  <Button variant="outline" className="h-20 flex-col bg-transparent">
                    <Zap className="h-6 w-6 mb-2" />
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Current Month Usage</CardTitle>
                  <CardDescription>January 2024</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Download</span>
                      <span>{currentUsage.download} GB</span>
                    </div>
                    <Progress value={(currentUsage.download / currentUsage.limit) * 100} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Upload</span>
                      <span>{currentUsage.upload} GB</span>
                    </div>
                    <Progress value={(currentUsage.upload / 200) * 100} />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{currentUsage.download + currentUsage.upload} GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Speed Test</CardTitle>
                  <CardDescription>Test your current connection speed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold">{currentUsage.speed} Mbps</div>
                    <p className="text-sm text-muted-foreground">Last tested 2 hours ago</p>
                  </div>
                  <Button className="w-full">
                    <Activity className="mr-2 h-4 w-4" />
                    Run Speed Test
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Usage History</CardTitle>
                <CardDescription>Your internet usage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="download" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="upload" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Current Bill</CardTitle>
                  <CardDescription>Next billing cycle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Plan</span>
                      <span>{customerInfo.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span>KES {billing.nextBillAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due Date</span>
                      <span>{billing.nextBillDate}</span>
                    </div>
                  </div>
                  <Button className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>Recent payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">KES {billing.lastPayment.amount}</p>
                        <p className="text-sm text-muted-foreground">{billing.lastPayment.date}</p>
                      </div>
                      <Badge variant="outline">{billing.lastPayment.method}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    <FileText className="mr-2 h-4 w-4" />
                    View All Invoices
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                  <CardDescription>Get help with your service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start">
                    <Phone className="mr-2 h-4 w-4" />
                    Call Support: +254-700-123456
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Mail className="mr-2 h-4 w-4" />
                    Email: support@trustwaves.com
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Create Support Ticket
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Tickets</CardTitle>
                  <CardDescription>Your support requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="p-3 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">#{ticket.id}</p>
                          </div>
                          <Badge variant={ticket.status === "Resolved" ? "default" : "secondary"}>
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <p className="text-sm text-muted-foreground">{customerInfo.name}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Number</label>
                    <p className="text-sm text-muted-foreground">{customerInfo.accountNumber}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{customerInfo.email}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-muted-foreground">{customerInfo.phone}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Service Address</label>
                    <p className="text-sm text-muted-foreground">{customerInfo.address}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline">
                    <User className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

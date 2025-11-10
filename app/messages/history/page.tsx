"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Download,
  Filter,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function MessageHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const messages = [
    {
      id: 1,
      type: "email",
      recipient: "john.doe@email.com",
      subject: "Service Activation Confirmation",
      content: "Your internet service has been successfully activated...",
      status: "delivered",
      sentAt: "2024-01-15 10:30:00",
      deliveredAt: "2024-01-15 10:30:15",
      openedAt: "2024-01-15 11:45:22",
      campaign: "Service Activation",
    },
    {
      id: 2,
      type: "sms",
      recipient: "+254712345678",
      subject: "Payment Reminder",
      content: "Your monthly bill of KES 2,500 is due tomorrow. Pay now to avoid service interruption.",
      status: "delivered",
      sentAt: "2024-01-14 09:15:00",
      deliveredAt: "2024-01-14 09:15:03",
      campaign: "Payment Reminders",
    },
    {
      id: 3,
      type: "email",
      recipient: "jane.smith@email.com",
      subject: "Network Maintenance Notice",
      content: "We will be performing scheduled maintenance on your area network...",
      status: "failed",
      sentAt: "2024-01-13 16:20:00",
      errorMessage: "Invalid email address",
      campaign: "Maintenance Notices",
    },
    {
      id: 4,
      type: "push",
      recipient: "Customer App User #1234",
      subject: "Speed Upgrade Available",
      content: "Upgrade to our new 200Mbps plan for just KES 500 more per month!",
      status: "pending",
      sentAt: "2024-01-15 14:00:00",
      campaign: "Promotional",
    },
    {
      id: 5,
      type: "email",
      recipient: "support@customer.com",
      subject: "Support Ticket Response",
      content: "Thank you for contacting our support team. Your issue has been resolved...",
      status: "delivered",
      sentAt: "2024-01-12 13:45:00",
      deliveredAt: "2024-01-12 13:45:08",
      openedAt: "2024-01-12 14:20:15",
      campaign: "Support Communications",
    },
  ]

  const stats = [
    { label: "Total Messages", value: "1,234", change: "+12%", icon: MessageSquare },
    { label: "Delivery Rate", value: "98.5%", change: "+0.3%", icon: CheckCircle },
    { label: "Open Rate", value: "65.2%", change: "+2.1%", icon: Eye },
    { label: "Failed Messages", value: "18", change: "-5%", icon: XCircle },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <Phone className="h-4 w-4" />
      case "push":
        return <Send className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.recipient.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || message.status === statusFilter
    const matchesType = typeFilter === "all" || message.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Message History</h2>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.startsWith("+") ? "text-green-600" : "text-red-600"}>{stat.change}</span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Messages</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="push">Push Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <Card>
            <CardHeader>
              <CardTitle>Messages ({filteredMessages.length})</CardTitle>
              <CardDescription>Complete history of all sent messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMessages.map((message) => (
                  <div key={message.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(message.type)}
                        <h3 className="font-medium">{message.subject}</h3>
                        <Badge variant="outline" className="capitalize">
                          {message.type}
                        </Badge>
                        {getStatusIcon(message.status)}
                        <Badge
                          variant={
                            message.status === "delivered"
                              ? "default"
                              : message.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {message.status}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>
                          <strong>To:</strong> {message.recipient}
                        </p>
                        <p>
                          <strong>Campaign:</strong> {message.campaign}
                        </p>
                        <p className="mt-1">{message.content}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Sent: {message.sentAt}</span>
                        {message.deliveredAt && <span>Delivered: {message.deliveredAt}</span>}
                        {message.openedAt && <span>Opened: {message.openedAt}</span>}
                        {message.errorMessage && <span className="text-red-500">Error: {message.errorMessage}</span>}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Resend Message</DropdownMenuItem>
                        <DropdownMenuItem>Copy Content</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Type-specific tabs would show filtered content */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Messages</CardTitle>
              <CardDescription>Email communication history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMessages
                  .filter((m) => m.type === "email")
                  .map((message) => (
                    <div key={message.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <h3 className="font-medium">{message.subject}</h3>
                          {getStatusIcon(message.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            <strong>To:</strong> {message.recipient}
                          </p>
                          <p className="mt-1">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Messages</CardTitle>
              <CardDescription>SMS communication history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMessages
                  .filter((m) => m.type === "sms")
                  .map((message) => (
                    <div key={message.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <h3 className="font-medium">{message.subject}</h3>
                          {getStatusIcon(message.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            <strong>To:</strong> {message.recipient}
                          </p>
                          <p className="mt-1">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="push" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Push notification history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMessages
                  .filter((m) => m.type === "push")
                  .map((message) => (
                    <div key={message.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <h3 className="font-medium">{message.subject}</h3>
                          {getStatusIcon(message.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            <strong>To:</strong> {message.recipient}
                          </p>
                          <p className="mt-1">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

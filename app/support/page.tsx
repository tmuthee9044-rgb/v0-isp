"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { HeadphonesIcon, Plus, MessageSquare, Clock, CheckCircle, Search, Filter, Eye, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AddKnowledgeBaseModal } from "@/components/add-knowledge-base-modal"
import { smsService } from "@/lib/sms-service"

export default function SupportPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [addArticleOpen, setAddArticleOpen] = useState(false)
  const [tickets, setTickets] = useState([])
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [knowledgeBase, setKnowledgeBase] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTicket, setNewTicket] = useState({
    customer_id: "",
    subject: "",
    description: "",
    priority: "medium",
    assigned_to: "",
  })
  const { toast } = useToast()

  const handleCreateTicket = async () => {
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicket),
      })

      if (response.ok) {
        toast({
          title: "Ticket Created",
          description: "New ticket has been created successfully.",
        })
        setNewTicketOpen(false)
        fetchData() // Refresh data
      } else {
        throw new Error("Failed to create ticket")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchData()
    smsService.loadConfig()
  }, [])

  const fetchData = async () => {
    try {
      const [ticketsRes, customersRes, employeesRes, kbRes] = await Promise.all([
        fetch("/api/support/tickets"),
        fetch("/api/support/customers"),
        fetch("/api/support/employees"),
        fetch("/api/support/knowledge-base"),
      ])

      const responses = [
        { name: "tickets", response: ticketsRes },
        { name: "customers", response: customersRes },
        { name: "employees", response: employeesRes },
        { name: "knowledge-base", response: kbRes },
      ]

      // Check if all responses are OK and have JSON content
      for (const { name, response } of responses) {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${name}: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text()
          console.error(`Non-JSON response from ${name}:`, text)
          throw new Error(`${name} API returned non-JSON response`)
        }
      }

      // Parse JSON responses safely
      const ticketsData = await ticketsRes.json()
      const customersData = await customersRes.json()
      const employeesData = await employeesRes.json()
      const kbData = await kbRes.json()

      setTickets(ticketsData.tickets || [])
      setCustomers(customersData.customers || [])
      setEmployees(employeesData.employees || [])
      setKnowledgeBase(kbData.articles || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load support data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "destructive"
      case "in_progress":
        return "default"
      case "resolved":
        return "secondary"
      default:
        return "outline"
    }
  }

  const handleTicketAction = async (ticketId: string, action: string) => {
    try {
      let endpoint = ""
      const method = "PUT"
      let body = {}

      switch (action.toLowerCase()) {
        case "viewed":
          // Just show toast for view action
          toast({
            title: "Ticket Viewed",
            description: `Ticket ${ticketId} has been viewed.`,
          })
          return
        case "updated":
        case "assign":
          endpoint = `/api/support/tickets/${ticketId}/assign`
          body = { status: "in_progress" }
          break
        case "resolved":
          endpoint = `/api/support/tickets/${ticketId}/resolve`
          body = { status: "resolved", resolved_at: new Date().toISOString() }
          break
        default:
          toast({
            title: `Ticket ${action}`,
            description: `Ticket ${ticketId} has been ${action.toLowerCase()}.`,
          })
          return
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast({
          title: `Ticket ${action}`,
          description: `Ticket ${ticketId} has been ${action.toLowerCase()} successfully.`,
        })
        fetchData() // Refresh data
      } else {
        throw new Error(`Failed to ${action.toLowerCase()} ticket`)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action.toLowerCase()} ticket`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Support Center</h2>
        <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>Create a new support ticket for a customer</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select
                  value={newTicket.customer_id}
                  onValueChange={(value) => setNewTicket({ ...newTicket, customer_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of the issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignee">Assign To</Label>
                <Select
                  value={newTicket.assigned_to}
                  onValueChange={(value) => setNewTicket({ ...newTicket, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.name} - {employee.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the issue"
                  rows={3}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewTicketOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>Create Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">+3 from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4h</div>
            <p className="text-xs text-muted-foreground">-0.5h from last week</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets">All Tickets</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Manage customer support requests</CardDescription>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-32">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden sm:table-cell">Subject</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Assignee</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.ticket_number || ticket.id}</TableCell>
                        <TableCell>{ticket.customer_name || "Unknown Customer"}</TableCell>
                        <TableCell className="hidden sm:table-cell max-w-xs truncate">{ticket.subject}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(ticket.status)}>{ticket.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{ticket.assignee_name || "Unassigned"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleTicketAction(ticket.id, "Viewed")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleTicketAction(ticket.id, "Updated")}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="open" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Tickets</CardTitle>
              <CardDescription>Tickets requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets
                      .filter((ticket) => ticket.status === "open")
                      .map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.ticket_number || ticket.id}</TableCell>
                          <TableCell>{ticket.customer_name || "Unknown Customer"}</TableCell>
                          <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleTicketAction(ticket.id, "Assign")}>
                              Assign
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                  <CardTitle>Resolved Tickets</CardTitle>
                  <CardDescription>Recently resolved support tickets</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Resolved Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets
                      .filter((ticket) => ticket.status === "resolved")
                      .map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.ticket_number || ticket.id}</TableCell>
                          <TableCell>{ticket.customer_name || "Unknown Customer"}</TableCell>
                          <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                          <TableCell>
                            {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleTicketAction(ticket.id, "Viewed")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kb" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardDescription>Common solutions and documentation</CardDescription>
                </div>
                <Button className="w-full sm:w-auto" onClick={() => setAddArticleOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Article
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="hidden sm:table-cell">Views</TableHead>
                      <TableHead className="hidden sm:table-cell">Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knowledgeBase.map((article: any) => (
                      <TableRow key={article.id}>
                        <TableCell className="font-medium max-w-xs truncate">{article.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{article.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{article.views}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {new Date(article.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddKnowledgeBaseModal
        open={addArticleOpen}
        onOpenChange={setAddArticleOpen}
        onArticleAdded={fetchData}
        employees={employees}
      />
    </div>
  )
}

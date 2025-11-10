"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Ticket, Plus, Search, Calendar, AlertTriangle, CheckCircle, Clock, X, MessageSquare } from "lucide-react"
import type { text } from "react"

interface SupportTicket {
  id: number
  ticket_number: string
  title: string
  subject: string
  description: text
  status: "open" | "pending" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  customer_id: number
  assigned_to: number | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface CustomerSupportTabProps {
  customerId: number
}

export function CustomerSupportTab({ customerId }: CustomerSupportTabProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creatingTicket, setCreatingTicket] = useState(false)

  // New ticket form state
  const [newTicket, setNewTicket] = useState({
    title: "",
    subject: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  })

  useEffect(() => {
    loadTickets()
  }, [customerId])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}/tickets`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error("Error loading tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const createTicket = async () => {
    try {
      setCreatingTicket(true)
      const response = await fetch(`/api/customers/${customerId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicket),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setNewTicket({ title: "", subject: "", description: "", priority: "medium" })
        loadTickets()
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
    } finally {
      setCreatingTicket(false)
    }
  }

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        loadTickets()
      }
    } catch (error) {
      console.error("Error updating ticket:", error)
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus
    const matchesPriority = filterPriority === "all" || ticket.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: "secondary",
      medium: "default",
      high: "warning",
      urgent: "destructive",
    } as const

    return (
      <Badge variant={variants[priority as keyof typeof variants]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: "default",
      pending: "secondary",
      resolved: "success",
      closed: "outline",
    } as const

    const icons = {
      open: <AlertTriangle className="h-3 w-3" />,
      pending: <Clock className="h-3 w-3" />,
      resolved: <CheckCircle className="h-3 w-3" />,
      closed: <X className="h-3 w-3" />,
    }

    return (
      <Badge variant={variants[status as keyof typeof variants]} className="flex items-center gap-1">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold">Support Tickets</h3>
          <p className="text-sm text-muted-foreground">Manage customer support requests</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Support Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    placeholder="Brief title for the issue"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="Subject of the support request"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(value: any) => setNewTicket({ ...newTicket, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Detailed description of the issue"
                    rows={6}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTicket} disabled={creatingTicket}>
                    {creatingTicket ? "Creating..." : "Create Ticket"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No support tickets found</div>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    <CardTitle className="text-base">#{ticket.ticket_number}</CardTitle>
                    <span className="text-sm font-normal text-muted-foreground">- {ticket.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(ticket.priority)}
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{ticket.subject}</p>
                <p className="text-sm text-muted-foreground mb-4">{ticket.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created: {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                    {ticket.resolved_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Resolved: {new Date(ticket.resolved_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {ticket.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => updateTicketStatus(ticket.id, "pending")}>
                        Set Pending
                      </Button>
                    )}
                    {(ticket.status === "open" || ticket.status === "pending") && (
                      <Button size="sm" variant="outline" onClick={() => updateTicketStatus(ticket.id, "resolved")}>
                        Resolve
                      </Button>
                    )}
                    {ticket.status === "resolved" && (
                      <Button size="sm" variant="outline" onClick={() => updateTicketStatus(ticket.id, "closed")}>
                        Close
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      View Communications
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

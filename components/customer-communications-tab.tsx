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
import { MessageSquare, Mail, Smartphone, Bell, Search, Send, Clock, CheckCircle, XCircle } from "lucide-react"

interface Message {
  id: number
  subject: string
  content: string
  message_type: "email" | "sms" | "in_app" | "notification"
  status: "sent" | "delivered" | "failed" | "pending"
  sender_id: number
  recipient_id: number
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  metadata: any
}

interface CustomerCommunicationsTabProps {
  customerId: number
}

export function CustomerCommunicationsTab({ customerId }: CustomerCommunicationsTabProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // New message form state
  const [newMessage, setNewMessage] = useState({
    type: "email" as "email" | "sms" | "in_app" | "notification",
    subject: "",
    content: "",
    template_id: null as number | null,
  })

  useEffect(() => {
    loadMessages()
  }, [customerId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    try {
      setSendingMessage(true)
      const response = await fetch(`/api/customers/${customerId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      })

      if (response.ok) {
        setShowSendDialog(false)
        setNewMessage({ type: "email", subject: "", content: "", template_id: null })
        loadMessages()
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSendingMessage(false)
    }
  }

  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || message.message_type === filterType
    const matchesStatus = filterStatus === "all" || message.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <Smartphone className="h-4 w-4" />
      case "notification":
        return <Bell className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: "default",
      delivered: "success",
      failed: "destructive",
      pending: "secondary",
    } as const

    const icons = {
      sent: <Send className="h-3 w-3" />,
      delivered: <CheckCircle className="h-3 w-3" />,
      failed: <XCircle className="h-3 w-3" />,
      pending: <Clock className="h-3 w-3" />,
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
          <h3 className="text-lg font-semibold">Communications</h3>
          <p className="text-sm text-muted-foreground">All customer communication history</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="message-type">Message Type</Label>
                  <Select
                    value={newMessage.type}
                    onValueChange={(value: any) => setNewMessage({ ...newMessage, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="in_app">In-App Message</SelectItem>
                      <SelectItem value="notification">Push Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newMessage.type !== "sms" && (
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                      placeholder="Enter message subject"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    placeholder="Enter your message"
                    rows={6}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={sendMessage} disabled={sendingMessage}>
                    {sendingMessage ? "Sending..." : "Send Message"}
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
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Message Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="in_app">In-App</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading messages...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No messages found</div>
        ) : (
          filteredMessages.map((message) => (
            <Card key={message.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getMessageIcon(message.message_type)}
                    <CardTitle className="text-base">{message.subject || "No Subject"}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(message.status)}
                    <span className="text-sm text-muted-foreground">
                      {new Date(message.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{message.content}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Type: {message.message_type.toUpperCase()}</span>
                  {message.sent_at && <span>Sent: {new Date(message.sent_at).toLocaleString()}</span>}
                  {message.delivered_at && <span>Delivered: {new Date(message.delivered_at).toLocaleString()}</span>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

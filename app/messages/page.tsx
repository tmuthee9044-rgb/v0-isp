"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import {
  Mail,
  MessageSquare,
  Send,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react"
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  sendMessage,
  getMessageHistory,
  getMessageStats,
  type MessageTemplate,
  type Message,
} from "@/app/actions/message-actions"

// Recipient interface
interface Recipient {
  id: number
  name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: string
  recipient_type: "customer" | "employee"
  plan?: string
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState("compose")
  const [messageType, setMessageType] = useState<"email" | "sms">("email")
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [messageHistory, setMessageHistory] = useState<Message[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [recipientTypeFilter, setRecipientTypeFilter] = useState("all")
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
  const [commSettings, setCommSettings] = useState<any>(null)
  const [stats, setStats] = useState({
    total_messages: 0,
    sent_today: 0,
    sent_yesterday: 0,
    delivery_rate: 0,
    unread_count: 0,
  })

  // Form states
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "email" as "email" | "sms",
    category: "",
    subject: "",
    content: "",
  })

  // Template preview and variable replacement functionality
  const [templatePreview, setTemplatePreview] = useState("")
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)

  const availableTemplateVariables = [
    {
      category: "Customer Information",
      variables: [
        { name: "customer_name", description: "Full customer name", example: "John Doe" },
        { name: "first_name", description: "Customer first name", example: "John" },
        { name: "last_name", description: "Customer last name", example: "Doe" },
        { name: "email", description: "Customer email address", example: "john@example.com" },
        { name: "phone", description: "Customer phone number", example: "+1234567890" },
        { name: "account_number", description: "Customer account number", example: "ACC-20250922-1234" },
        { name: "customer_id", description: "Customer ID number", example: "1002" },
        { name: "address", description: "Customer address", example: "123 Main St" },
        { name: "city", description: "Customer city", example: "Nairobi" },
      ],
    },
    {
      category: "Service Information",
      variables: [
        { name: "plan_name", description: "Current service plan", example: "Premium Fiber 100Mbps" },
        { name: "plan_speed", description: "Internet speed", example: "100Mbps" },
        { name: "plan_price", description: "Monthly plan price", example: "KES 5,000" },
        { name: "service_status", description: "Service status", example: "Active" },
        { name: "installation_date", description: "Service installation date", example: "2024-01-15" },
        { name: "next_billing_date", description: "Next billing date", example: "2024-02-01" },
        { name: "data_usage", description: "Current data usage", example: "45.2 GB" },
        { name: "data_limit", description: "Monthly data limit", example: "Unlimited" },
      ],
    },
    {
      category: "Billing Information",
      variables: [
        { name: "current_balance", description: "Account balance", example: "KES -2,500" },
        { name: "last_payment_amount", description: "Last payment amount", example: "KES 5,000" },
        { name: "last_payment_date", description: "Last payment date", example: "2024-01-15" },
        { name: "due_amount", description: "Amount due", example: "KES 5,000" },
        { name: "due_date", description: "Payment due date", example: "2024-02-01" },
        { name: "overdue_amount", description: "Overdue amount", example: "KES 2,500" },
        { name: "days_overdue", description: "Days overdue", example: "15" },
      ],
    },
    {
      category: "Company Information",
      variables: [
        { name: "company_name", description: "ISP company name", example: "Your ISP Company" },
        { name: "support_email", description: "Support email address", example: "support@yourisp.com" },
        { name: "support_phone", description: "Support phone number", example: "+1-800-SUPPORT" },
        { name: "website_url", description: "Company website", example: "https://yourisp.com" },
        { name: "office_address", description: "Office address", example: "123 Business St, Nairobi" },
        { name: "business_hours", description: "Business hours", example: "Mon-Fri 8AM-6PM" },
      ],
    },
    {
      category: "Date & Time",
      variables: [
        { name: "current_date", description: "Current date", example: "September 22, 2024" },
        { name: "current_time", description: "Current time", example: "2:30 PM" },
        { name: "current_month", description: "Current month", example: "September" },
        { name: "current_year", description: "Current year", example: "2024" },
      ],
    },
    {
      category: "Technical Information",
      variables: [
        { name: "ip_address", description: "Assigned IP address", example: "192.168.1.100" },
        { name: "pppoe_username", description: "PPPoE username", example: "customer_1002_ppp" },
        { name: "router_model", description: "Router model", example: "TP-Link AC1200" },
        { name: "connection_type", description: "Connection type", example: "Fiber Optic" },
        { name: "signal_strength", description: "Signal strength", example: "-45 dBm" },
      ],
    },
  ]

  useEffect(() => {
    loadTemplates()
    loadMessageHistory()
    loadStats()
    loadRecipients()
    loadCommunicationSettings()
  }, [])

  useEffect(() => {
    loadRecipients()
  }, [searchTerm, statusFilter, recipientTypeFilter])

  const loadCommunicationSettings = async () => {
    try {
      const response = await fetch("/api/communication-settings")
      const data = await response.json()
      setCommSettings(data)
    } catch (error) {
      console.error("Error loading communication settings:", error)
    }
  }

  const loadTemplates = async () => {
    const result = await getMessageTemplates()
    if (result.success) {
      setTemplates(result.templates)
    }
  }

  const loadMessageHistory = async () => {
    const result = await getMessageHistory()
    if (result.success) {
      setMessageHistory(result.messages)
    }
  }

  const loadStats = async () => {
    const result = await getMessageStats()
    if (result.success) {
      setStats(result.stats)
    }
  }

  const loadRecipients = async () => {
    setIsLoadingRecipients(true)
    try {
      const params = new URLSearchParams({
        type: recipientTypeFilter,
        search: searchTerm,
        status: statusFilter,
      })

      const response = await fetch(`/api/messages/recipients?${params}`)
      const data = await response.json()

      if (data.success) {
        setRecipients(data.recipients)
      } else {
        toast({
          title: "Error loading recipients",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error loading recipients",
        description: "Failed to fetch recipients",
        variant: "destructive",
      })
    } finally {
      setIsLoadingRecipients(false)
    }
  }

  const filteredRecipients = recipients

  const handleTemplateSelect = async (template: MessageTemplate) => {
    setSelectedTemplate(template)
    setMessageType(template.type)
    setSubject(template.subject || "")

    // Extract variables from template content
    const variables = template.variables || []
    const variableValues: Record<string, string> = {}

    variables.forEach((variable) => {
      switch (variable) {
        case "customer_name":
        case "first_name":
          variableValues[variable] = "{{customer_name}}"
          break
        case "company_name":
          variableValues[variable] = commSettings?.email?.fromName || "Your ISP Company"
          break
        case "current_date":
          variableValues[variable] = new Date().toLocaleDateString()
          break
        case "support_email":
          variableValues[variable] = commSettings?.email?.replyTo || "support@yourisp.com"
          break
        case "support_phone":
          variableValues[variable] = "+1-800-SUPPORT"
          break
        default:
          variableValues[variable] = `{{${variable}}}`
      }
    })

    setTemplateVariables(variableValues)

    // Replace variables in content for preview
    let processedContent = template.content
    Object.entries(variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
      processedContent = processedContent.replace(regex, value)
    })

    setContent(processedContent)
    setTemplatePreview(processedContent)

    toast({
      title: "Template loaded",
      description: `${template.name} template has been applied with ${variables.length} variables`,
    })
  }

  const handlePreviewTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template)
    setTemplatePreview(template.content)
    setShowTemplatePreview(true)
  }

  const handleSendMessage = async () => {
    if (commSettings && !commSettings[messageType]?.enabled) {
      toast({
        title: `${messageType.toUpperCase()} messaging disabled`,
        description: `${messageType.toUpperCase()} messaging is disabled in communication settings. Please enable it first.`,
        variant: "destructive",
      })
      return
    }

    if (selectedRecipients.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one recipient to send the message to.",
        variant: "destructive",
      })
      return
    }

    const batchSize = commSettings?.[messageType]?.batchSize || (messageType === "email" ? 50 : 100)
    if (selectedRecipients.length > batchSize) {
      toast({
        title: "Batch size limit exceeded",
        description: `Maximum ${batchSize} recipients allowed per ${messageType} batch. Please reduce your selection.`,
        variant: "destructive",
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: "Message content required",
        description: "Please enter a message to send.",
        variant: "destructive",
      })
      return
    }

    if (messageType === "email" && !subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject for the email.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      const formData = new FormData()
      formData.append("type", messageType)
      formData.append("recipients", JSON.stringify(selectedRecipients))
      formData.append("subject", subject)
      formData.append("content", content)
      if (selectedTemplate) {
        formData.append("template_id", selectedTemplate.id.toString())
      }

      const result = await sendMessage(formData)

      if (result.success) {
        toast({
          title: "Messages sent successfully",
          description: result.message,
        })

        // Reset form
        setSelectedRecipients([])
        setSubject("")
        setContent("")
        setSelectedTemplate(null)

        // Reload data
        loadMessageHistory()
        loadStats()
      } else {
        toast({
          title: "Failed to send messages",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error sending messages",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    const result = await deleteMessageTemplate(templateId)
    if (result.success) {
      toast({
        title: "Template deleted successfully",
        description: result.message,
      })
      loadTemplates()
    } else {
      toast({
        title: "Failed to delete template",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleCreateTemplate = async () => {
    if (editingTemplate) {
      const result = await updateMessageTemplate(editingTemplate.id, templateForm)
      if (result.success) {
        toast({
          title: "Template updated successfully",
          description: result.message,
        })
        loadTemplates()
        setIsTemplateModalOpen(false)
      } else {
        toast({
          title: "Failed to update template",
          description: result.error,
          variant: "destructive",
        })
      }
    } else {
      const result = await createMessageTemplate(templateForm)
      if (result.success) {
        toast({
          title: "Template created successfully",
          description: result.message,
        })
        loadTemplates()
        setIsTemplateModalOpen(false)
      } else {
        toast({
          title: "Failed to create template",
          description: result.error,
          variant: "destructive",
        })
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      suspended: "secondary",
      overdue: "destructive",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status}</Badge>
  }

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "opened":
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
        <div className="flex items-center space-x-2">
          {commSettings && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge variant={commSettings.email?.enabled ? "default" : "secondary"}>
                Email {commSettings.email?.enabled ? "ON" : "OFF"}
              </Badge>
              <Badge variant={commSettings.sms?.enabled ? "default" : "secondary"}>
                SMS {commSettings.sms?.enabled ? "ON" : "OFF"}
              </Badge>
            </div>
          )}
          <Button onClick={() => setIsTemplateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_messages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent_today}</div>
            <p className="text-xs text-muted-foreground">+{stats.sent_today - stats.sent_yesterday} from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivery_rate}%</div>
            <p className="text-xs text-muted-foreground">Successful deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread_count}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Message Composition */}
            <Card>
              <CardHeader>
                <CardTitle>Send Message</CardTitle>
                <CardDescription>Send SMS or email messages to customers and employees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    variant={messageType === "email" ? "default" : "outline"}
                    onClick={() => setMessageType("email")}
                    className="flex-1"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    variant={messageType === "sms" ? "default" : "outline"}
                    onClick={() => setMessageType("sms")}
                    className="flex-1"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    SMS
                  </Button>
                </div>

                <div>
                  <Label htmlFor="template-select">Use Template (Optional)</Label>
                  <Select
                    onValueChange={(value) => {
                      const template = templates.find((t) => t.id.toString() === value)
                      if (template) handleTemplateSelect(template)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((t) => t.type === messageType)
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {messageType === "email" && (
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter email subject"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={messageType === "email" ? "Enter email content..." : "Enter SMS content..."}
                    rows={6}
                  />
                  {messageType === "sms" && (
                    <p className="text-xs text-muted-foreground mt-1">{content.length}/160 characters</p>
                  )}
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || selectedRecipients.length === 0}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send to {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Recipient Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Recipients</CardTitle>
                <CardDescription>Choose customers and employees to send the message to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recipients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={recipientTypeFilter} onValueChange={setRecipientTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="employees">Employees</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-96">
                  {isLoadingRecipients ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-sm text-muted-foreground">Loading recipients...</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredRecipients.map((recipient) => (
                        <div
                          key={`${recipient.recipient_type}-${recipient.id}`}
                          className="flex items-center space-x-2 p-2 border rounded"
                        >
                          <Checkbox
                            checked={selectedRecipients.includes(recipient.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRecipients([...selectedRecipients, recipient.id])
                              } else {
                                setSelectedRecipients(selectedRecipients.filter((id) => id !== recipient.id))
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium truncate">{recipient.name}</p>
                              <Badge variant={recipient.recipient_type === "customer" ? "default" : "secondary"}>
                                {recipient.recipient_type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {messageType === "email" ? recipient.email : recipient.phone}
                            </p>
                            <p className="text-xs text-muted-foreground">{recipient.plan}</p>
                          </div>
                          {getStatusBadge(recipient.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{selectedRecipients.length} selected</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = filteredRecipients.map((r) => r.id)
                      setSelectedRecipients(selectedRecipients.length === allIds.length ? [] : allIds)
                    }}
                  >
                    {selectedRecipients.length === filteredRecipients.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
              <CardDescription>View all sent messages and their delivery status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject/Content</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messageHistory.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Badge variant={message.type === "email" ? "default" : "secondary"}>
                          {message.type === "email" ? (
                            <Mail className="mr-1 h-3 w-3" />
                          ) : (
                            <MessageSquare className="mr-1 h-3 w-3" />
                          )}
                          {message.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{message.recipient}</TableCell>
                      <TableCell className="max-w-xs truncate">{message.subject || message.content}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getMessageStatusIcon(message.status)}
                          <span className="capitalize">{message.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{message.sent_at ? new Date(message.sent_at).toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>Manage reusable message templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant={template.type === "email" ? "default" : "secondary"}>
                          {template.type.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription>{template.category}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                        {template.subject && `${template.subject} - `}
                        {template.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span>Used {template.usage_count} times</span>
                        <span>{template.variables.length} variables</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewTemplate(template)}
                          title="Preview template"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect(template)}
                          title="Use template"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template)
                            setTemplateForm({
                              name: template.name,
                              type: template.type,
                              category: template.category,
                              subject: template.subject || "",
                              content: template.content,
                            })
                            setIsTemplateModalOpen(true)
                          }}
                          title="Edit template"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          title="Delete template"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
            <DialogDescription>
              Create reusable message templates with variables. Click on any variable below to insert it into your
              template.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Welcome Message"
                  />
                </div>
                <div>
                  <Label htmlFor="template-type">Type</Label>
                  <Select
                    value={templateForm.type}
                    onValueChange={(value: "email" | "sms") => setTemplateForm({ ...templateForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-category">Category</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="reminder">Payment Reminder</SelectItem>
                    <SelectItem value="suspension">Service Suspension</SelectItem>
                    <SelectItem value="activation">Service Activation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {templateForm.type === "email" && (
                <div>
                  <Label htmlFor="template-subject">Subject</Label>
                  <Input
                    id="template-subject"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    placeholder="Email subject line"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="template-content">Content</Label>
                <Textarea
                  id="template-content"
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  placeholder="Message content with variables like {{customer_name}}"
                  rows={12}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use variables from the panel on the right. Click any variable to insert it.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Available Template Variables</Label>
                <p className="text-xs text-muted-foreground">
                  Click on any variable to insert it into your template content
                </p>
              </div>

              <ScrollArea className="h-96 border rounded-md p-4">
                <div className="space-y-4">
                  {availableTemplateVariables.map((category) => (
                    <div key={category.category}>
                      <h4 className="font-medium text-sm mb-2 text-primary">{category.category}</h4>
                      <div className="grid gap-2">
                        {category.variables.map((variable) => (
                          <div
                            key={variable.name}
                            className="p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              const variableText = `{{${variable.name}}}`
                              const textarea = document.getElementById("template-content") as HTMLTextAreaElement
                              if (textarea) {
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                const currentContent = templateForm.content
                                const newContent =
                                  currentContent.substring(0, start) + variableText + currentContent.substring(end)
                                setTemplateForm({ ...templateForm, content: newContent })

                                // Set cursor position after the inserted variable
                                setTimeout(() => {
                                  textarea.focus()
                                  textarea.setSelectionRange(start + variableText.length, start + variableText.length)
                                }, 0)
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                                {`{{${variable.name}}}`}
                              </code>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                            <p className="text-xs text-muted-foreground italic">Example: {variable.example}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div>
                <Label>Quick Insert</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {["customer_name", "first_name", "plan_name", "due_amount", "due_date", "support_phone"].map(
                    (variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const variableText = `{{${variable}}}`
                          const textarea = document.getElementById("template-content") as HTMLTextAreaElement
                          if (textarea) {
                            const start = textarea.selectionStart
                            const end = textarea.selectionEnd
                            const currentContent = templateForm.content
                            const newContent =
                              currentContent.substring(0, start) + variableText + currentContent.substring(end)
                            setTemplateForm({ ...templateForm, content: newContent })

                            setTimeout(() => {
                              textarea.focus()
                              textarea.setSelectionRange(start + variableText.length, start + variableText.length)
                            }, 0)
                          }
                        }}
                        className="text-xs"
                      >
                        {variable}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>{editingTemplate ? "Update Template" : "Create Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <Dialog open={showTemplatePreview} onOpenChange={setShowTemplatePreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Preview how the template will look when sent</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <p className="text-sm font-medium">{selectedTemplate.name}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge variant={selectedTemplate.type === "email" ? "default" : "secondary"}>
                    {selectedTemplate.type.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <p className="text-sm text-muted-foreground">{selectedTemplate.category}</p>
              </div>

              {selectedTemplate.type === "email" && selectedTemplate.subject && (
                <div>
                  <Label>Subject</Label>
                  <p className="text-sm font-medium">{selectedTemplate.subject}</p>
                </div>
              )}

              <div>
                <Label>Content</Label>
                <div className="border rounded-md p-3 bg-muted/50">
                  <pre className="text-sm whitespace-pre-wrap">{templatePreview}</pre>
                </div>
              </div>

              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div>
                  <Label>Variables ({selectedTemplate.variables.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <p>Used {selectedTemplate.usage_count} times</p>
                <p>Created: {new Date(selectedTemplate.created_at).toLocaleDateString()}</p>
                <p>Last updated: {new Date(selectedTemplate.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatePreview(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate) {
                  handleTemplateSelect(selectedTemplate)
                  setShowTemplatePreview(false)
                  setActiveTab("compose")
                }
              }}
            >
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AtSign, Smartphone, Send, Clock } from "lucide-react"

interface SendMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  customerName: string
  customerEmail: string
  customerPhone: string
}

export function SendMessageModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
}: SendMessageModalProps) {
  const [messageType, setMessageType] = useState<"email" | "sms">("email")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [template, setTemplate] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const emailTemplates = [
    {
      id: "welcome",
      name: "Welcome Message",
      subject: "Welcome to TrustWaves Network!",
      content: `Dear ${customerName},

Welcome to TrustWaves Network! We're excited to have you as our customer.

Your internet service has been successfully activated. You can now enjoy high-speed internet connectivity.

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
TrustWaves Network Team`,
    },
    {
      id: "payment_reminder",
      name: "Payment Reminder",
      subject: "Payment Reminder - TrustWaves Network",
      content: `Dear ${customerName},

This is a friendly reminder that your monthly payment is due soon.

Please ensure your payment is made by the due date to avoid any service interruption.

You can make payments through:
- M-Pesa: Paybill 123456
- Bank Transfer
- Visit our office

Thank you for choosing TrustWaves Network.

Best regards,
TrustWaves Network Team`,
    },
    {
      id: "service_update",
      name: "Service Update",
      subject: "Service Update Notification",
      content: `Dear ${customerName},

We wanted to inform you about an important update to your internet service.

[Please customize this message with specific update details]

If you have any questions, please contact our support team.

Best regards,
TrustWaves Network Team`,
    },
  ]

  const smsTemplates = [
    {
      id: "payment_reminder",
      name: "Payment Reminder",
      content: `Hi ${customerName}, your TrustWaves payment is due soon. Pay via M-Pesa 123456 or visit our office. Thanks!`,
    },
    {
      id: "service_activation",
      name: "Service Activation",
      content: `Hi ${customerName}, your TrustWaves internet service is now active! Enjoy high-speed connectivity. Support: 0700123456`,
    },
    {
      id: "maintenance_notice",
      name: "Maintenance Notice",
      content: `Hi ${customerName}, scheduled maintenance on [DATE] from [TIME]. Expect brief service interruption. TrustWaves Team`,
    },
  ]

  const handleTemplateSelect = (templateId: string) => {
    if (messageType === "email") {
      const template = emailTemplates.find((t) => t.id === templateId)
      if (template) {
        setSubject(template.subject)
        setMessage(template.content)
      }
    } else {
      const template = smsTemplates.find((t) => t.id === templateId)
      if (template) {
        setMessage(template.content)
      }
    }
  }

  const handleSend = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      console.log("Sending message:", {
        type: messageType,
        to: messageType === "email" ? customerEmail : customerPhone,
        subject: messageType === "email" ? subject : undefined,
        message,
        customerId,
      })

      onOpenChange(false)
      setSubject("")
      setMessage("")
      setTemplate("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Message to {customerName}</DialogTitle>
          <DialogDescription>Send email or SMS communication to your customer</DialogDescription>
        </DialogHeader>

        <Tabs value={messageType} onValueChange={(value) => setMessageType(value as "email" | "sms")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compose Email</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="email-to">To</Label>
                      <Input id="email-to" value={customerEmail} disabled />
                    </div>
                    <div>
                      <Label htmlFor="email-subject">Subject</Label>
                      <Input
                        id="email-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter email subject"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-message">Message</Label>
                      <Textarea
                        id="email-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter your message"
                        rows={12}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{message.length} characters</span>
                      <Button onClick={handleSend} disabled={!subject || !message || isLoading}>
                        {isLoading ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Email
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Email Templates</CardTitle>
                    <CardDescription>Choose from pre-made templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {emailTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{template.subject}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compose SMS</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="sms-to">To</Label>
                      <Input id="sms-to" value={customerPhone} disabled />
                    </div>
                    <div>
                      <Label htmlFor="sms-message">Message</Label>
                      <Textarea
                        id="sms-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter your SMS message"
                        rows={6}
                        maxLength={160}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{message.length}/160 characters</span>
                      <Button onClick={handleSend} disabled={!message || isLoading}>
                        {isLoading ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send SMS
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">SMS Templates</CardTitle>
                    <CardDescription>Quick SMS templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {smsTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {template.content.substring(0, 60)}...
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

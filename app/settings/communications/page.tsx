"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Mail, MessageSquare, Save, RefreshCw, TestTube, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CommunicationsSettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [emailStatus, setEmailStatus] = useState<"connected" | "disconnected" | "testing">("disconnected")
  const [smsStatus, setSmsStatus] = useState<"connected" | "disconnected" | "testing">("disconnected")
  const [commConfig, setCommConfig] = useState(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    fetchCommConfig()
  }, [])

  const fetchCommConfig = async () => {
    try {
      const response = await fetch("/api/communication-settings")
      const data = await response.json()
      setCommConfig(data)

      setEmailStatus(data.email?.enabled && data.email?.smtpHost ? "connected" : "disconnected")
      setSmsStatus(data.sms?.enabled && data.sms?.apiKey ? "connected" : "disconnected")
    } catch (error) {
      console.error("Error fetching communication config:", error)
      toast({
        title: "Error",
        description: "Failed to load communication settings",
        variant: "destructive",
      })
    } finally {
      setIsInitialLoading(false)
    }
  }

  const handleSave = async (type: string, settings: any) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/communication-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, settings }),
      })

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: `${type.toUpperCase()} settings have been updated and will control message behavior.`,
        })
        await fetchCommConfig()
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save communication settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async (type: string, config: any) => {
    if (type === "email") {
      setEmailStatus("testing")
    } else {
      setSmsStatus("testing")
    }

    try {
      const response = await fetch("/api/communication-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config }),
      })

      const result = await response.json()

      if (result.success) {
        if (type === "email") {
          setEmailStatus("connected")
        } else {
          setSmsStatus("connected")
        }
        toast({
          title: "Test successful",
          description: result.message,
        })
      } else {
        if (type === "email") {
          setEmailStatus("disconnected")
        } else {
          setSmsStatus("disconnected")
        }
        toast({
          title: "Test failed",
          description: result.message || "Connection test failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      if (type === "email") {
        setEmailStatus("disconnected")
      } else {
        setSmsStatus("disconnected")
      }
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        )
      case "testing":
        return (
          <Badge variant="secondary">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Testing...
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (isInitialLoading) {
    return <div className="flex-1 p-8">Loading communication settings...</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Communications</h2>
          <p className="text-muted-foreground">Configure email and SMS services for customer communications</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchCommConfig}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => handleSave("all", commConfig)} disabled={isLoading}>
            {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email Settings</TabsTrigger>
          <TabsTrigger value="sms">SMS Gateway</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle>Email Configuration</CardTitle>
                </div>
                {getStatusBadge(emailStatus)}
              </div>
              <CardDescription>Configure SMTP settings for sending emails to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host *</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com"
                    value={commConfig?.email?.smtpHost || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        email: { ...prev.email, smtpHost: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Select
                    value={commConfig?.email?.smtpPort || "587"}
                    onValueChange={(value) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        email: { ...prev.email, smtpPort: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 (Non-encrypted)</SelectItem>
                      <SelectItem value="587">587 (STARTTLS)</SelectItem>
                      <SelectItem value="465">465 (SSL/TLS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Username *</Label>
                  <Input
                    id="smtp-username"
                    placeholder="your-email@gmail.com"
                    value={commConfig?.email?.smtpUsername || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        email: { ...prev.email, smtpUsername: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Password *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="smtp-password"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Enter password"
                      value={commConfig?.email?.smtpPassword || ""}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, smtpPassword: e.target.value },
                        }))
                      }
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowPasswords(!showPasswords)}>
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    placeholder="Your Company Name"
                    value={commConfig?.email?.fromName || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        email: { ...prev.email, fromName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder="noreply@yourcompany.com"
                    value={commConfig?.email?.fromEmail || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        email: { ...prev.email, fromEmail: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply-to">Reply To Email</Label>
                  <Input
                    id="reply-to"
                    type="email"
                    placeholder="support@yourcompany.com"
                    value={commConfig?.email?.replyTo || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        email: { ...prev.email, replyTo: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select
                    value={commConfig?.email?.encryption || "tls"}
                    onValueChange={(value) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        email: { ...prev.email, encryption: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Email Settings</Label>
                  <p className="text-sm text-muted-foreground">Configure email delivery and formatting options</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable HTML Emails</Label>
                      <p className="text-sm text-muted-foreground">Send formatted HTML emails</p>
                    </div>
                    <Switch
                      checked={commConfig?.email?.htmlEmails || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, htmlEmails: checked },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Tracking</Label>
                      <p className="text-sm text-muted-foreground">Track email opens and clicks</p>
                    </div>
                    <Switch
                      checked={commConfig?.email?.emailTracking || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, emailTracking: checked },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-retry Failed Emails</Label>
                      <p className="text-sm text-muted-foreground">Retry failed email deliveries</p>
                    </div>
                    <Switch
                      checked={commConfig?.email?.autoRetry || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, autoRetry: checked },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Queue</Label>
                      <p className="text-sm text-muted-foreground">Queue emails for batch sending</p>
                    </div>
                    <Switch
                      checked={commConfig?.email?.emailQueue || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, emailQueue: checked },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">Max Retries</Label>
                    <Input
                      id="max-retries"
                      type="number"
                      placeholder="3"
                      value={commConfig?.email?.maxRetries || "3"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, maxRetries: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retry-delay">Retry Delay (minutes)</Label>
                    <Input
                      id="retry-delay"
                      type="number"
                      placeholder="5"
                      value={commConfig?.email?.retryDelay || "5"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, retryDelay: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      placeholder="50"
                      value={commConfig?.email?.batchSize || "50"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, batchSize: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => testConnection("email", commConfig?.email)}
                  disabled={emailStatus === "testing"}
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  Test Email
                </Button>
                <Button onClick={() => handleSave("email", commConfig?.email)} disabled={isLoading}>
                  Save Email Config
                </Button>
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  View Email Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <CardTitle>SMS Gateway Configuration</CardTitle>
                </div>
                {getStatusBadge(smsStatus)}
              </div>
              <CardDescription>Configure SMS gateway for sending text messages to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sms-provider">SMS Provider</Label>
                <Select
                  value={commConfig?.sms?.provider || "africastalking"}
                  onValueChange={(value) =>
                    setCommConfig((prev) => ({
                      ...prev,
                      sms: { ...prev.sms, provider: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="africastalking">Africa's Talking</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="textlocal">TextLocal</SelectItem>
                    <SelectItem value="custom">Custom API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sms-username">Username/API Key *</Label>
                  <Input
                    id="sms-username"
                    placeholder="Enter username or API key"
                    value={commConfig?.sms?.username || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        sms: { ...prev.sms, username: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-api-key">API Key/Token *</Label>
                  <Input
                    id="sms-api-key"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Enter API key"
                    value={commConfig?.sms?.apiKey || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        sms: { ...prev.sms, apiKey: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-sender-id">Sender ID</Label>
                  <Input
                    id="sms-sender-id"
                    placeholder="YOURCOMPANY"
                    value={commConfig?.sms?.senderId || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        sms: { ...prev.sms, senderId: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-endpoint">API Endpoint</Label>
                  <Input
                    id="sms-endpoint"
                    placeholder="https://api.africastalking.com/version1/messaging"
                    value={commConfig?.sms?.endpoint || ""}
                    onChange={(e) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        sms: { ...prev.sms, endpoint: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">SMS Settings</Label>
                  <p className="text-sm text-muted-foreground">Configure SMS delivery and formatting options</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Delivery Reports</Label>
                      <p className="text-sm text-muted-foreground">Track SMS delivery status</p>
                    </div>
                    <Switch
                      checked={commConfig?.sms?.deliveryReports || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, deliveryReports: checked },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Unicode Support</Label>
                      <p className="text-sm text-muted-foreground">Support special characters</p>
                    </div>
                    <Switch
                      checked={commConfig?.sms?.unicodeSupport || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, unicodeSupport: checked },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-retry Failed SMS</Label>
                      <p className="text-sm text-muted-foreground">Retry failed SMS deliveries</p>
                    </div>
                    <Switch
                      checked={commConfig?.sms?.autoRetry || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, autoRetry: checked },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Queue</Label>
                      <p className="text-sm text-muted-foreground">Queue SMS for batch sending</p>
                    </div>
                    <Switch
                      checked={commConfig?.sms?.smsQueue || false}
                      onCheckedChange={(checked) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, smsQueue: checked },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-max-retries">Max Retries</Label>
                    <Input
                      id="sms-max-retries"
                      type="number"
                      placeholder="3"
                      value={commConfig?.sms?.maxRetries || "3"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, maxRetries: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-retry-delay">Retry Delay (minutes)</Label>
                    <Input
                      id="sms-retry-delay"
                      type="number"
                      placeholder="2"
                      value={commConfig?.sms?.retryDelay || "2"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, retryDelay: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-batch-size">Batch Size</Label>
                    <Input
                      id="sms-batch-size"
                      type="number"
                      placeholder="100"
                      value={commConfig?.sms?.batchSize || "100"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, batchSize: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Cost Management</Label>
                  <p className="text-sm text-muted-foreground">Configure SMS cost and usage limits</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-cost-per-message">Cost per SMS (KES)</Label>
                    <Input
                      id="sms-cost-per-message"
                      type="number"
                      step="0.01"
                      placeholder="2.50"
                      value={commConfig?.sms?.costPerMessage || "2.50"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, costPerMessage: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="daily-sms-limit">Daily SMS Limit</Label>
                    <Input
                      id="daily-sms-limit"
                      type="number"
                      placeholder="1000"
                      value={commConfig?.sms?.dailyLimit || "1000"}
                      onChange={(e) =>
                        setCommConfig((prev) => ({
                          ...prev,
                          sms: { ...prev.sms, dailyLimit: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable SMS Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">Alert when approaching SMS limits</p>
                  </div>
                  <Switch
                    checked={commConfig?.sms?.budgetAlerts || false}
                    onCheckedChange={(checked) =>
                      setCommConfig((prev) => ({
                        ...prev,
                        sms: { ...prev.sms, budgetAlerts: checked },
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => testConnection("sms", commConfig?.sms)}
                  disabled={smsStatus === "testing"}
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  Test SMS
                </Button>
                <Button onClick={() => handleSave("sms", commConfig?.sms)} disabled={isLoading}>
                  Save SMS Config
                </Button>
                <Button variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  View SMS Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Monitor, Users, Palette, Settings, Save, RefreshCw, Eye, Shield, Bell } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PortalSettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<any>({
    customer: {},
    admin: {},
    themes: {},
    features: {},
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log("[v0] Fetching portal settings")
        const response = await fetch("/api/portal-settings")
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Portal settings loaded:", data)
          setSettings(data)
        } else {
          throw new Error("Failed to fetch settings")
        }
      } catch (error) {
        console.error("[v0] Error fetching portal settings:", error)
        toast({
          title: "Error",
          description: "Failed to load portal settings.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [toast])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      console.log("[v0] Saving portal settings")
      const response = await fetch("/api/portal-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        console.log("[v0] Portal settings saved successfully")
        toast({
          title: "Settings saved",
          description: "Portal settings have been updated successfully.",
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      console.error("[v0] Error saving portal settings:", error)
      toast({
        title: "Error",
        description: "Failed to save portal settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (path: string[], value: any) => {
    setSettings((prev: any) => {
      const newSettings = { ...prev }
      let current = newSettings

      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {}
        current = current[path[i]]
      }

      current[path[path.length - 1]] = value
      return newSettings
    })
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portal Settings</h2>
          <p className="text-muted-foreground">Configure customer and admin portal settings</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Preview Portal
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="customer" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customer">Customer Portal</TabsTrigger>
          <TabsTrigger value="admin">Admin Portal</TabsTrigger>
          <TabsTrigger value="themes">Themes & Branding</TabsTrigger>
          <TabsTrigger value="features">Features & Access</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Customer Portal - Administrative Settings</span>
                </CardTitle>
                <CardDescription>Configure administrative aspects of the customer portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-portal-url">Portal URL</Label>
                  <Input
                    id="customer-portal-url"
                    placeholder="https://portal.techconnect.co.ke"
                    value={settings.customer?.url || ""}
                    onChange={(e) => updateSetting(["customer", "url"], e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-title">Portal Title</Label>
                  <Input
                    id="portal-title"
                    placeholder="Customer Portal"
                    value={settings.customer?.title || ""}
                    onChange={(e) => updateSetting(["customer", "title"], e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Textarea
                    id="welcome-message"
                    placeholder="Enter welcome message"
                    value={settings.customer?.welcomeMessage || ""}
                    onChange={(e) => updateSetting(["customer", "welcomeMessage"], e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Registration Settings</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure customer self-registration</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Self Registration</Label>
                        <p className="text-sm text-muted-foreground">Let customers create accounts</p>
                      </div>
                      <Switch
                        defaultChecked={settings.customer?.allowSelfRegistration || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "allowSelfRegistration"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Verification Required</Label>
                        <p className="text-sm text-muted-foreground">Verify email before activation</p>
                      </div>
                      <Switch
                        defaultChecked={settings.customer?.emailVerificationRequired || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "emailVerificationRequired"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Admin Approval Required</Label>
                        <p className="text-sm text-muted-foreground">Admin must approve new accounts</p>
                      </div>
                      <Switch
                        checked={settings.customer?.adminApprovalRequired || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "adminApprovalRequired"], checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Select
                    defaultValue="30"
                    value={String(settings.customer?.sessionTimeout || 30)}
                    onValueChange={(value) => updateSetting(["customer", "sessionTimeout"], Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Customer Portal - System Settings</span>
                </CardTitle>
                <CardDescription>Configure system-level portal settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Security Settings</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure portal security features</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable HTTPS Only</Label>
                        <p className="text-sm text-muted-foreground">Force secure connections</p>
                      </div>
                      <Switch
                        defaultChecked={settings.customer?.enableHTTPSOnly || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "enableHTTPSOnly"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Rate Limiting</Label>
                        <p className="text-sm text-muted-foreground">Prevent abuse and attacks</p>
                      </div>
                      <Switch
                        defaultChecked={settings.customer?.enableRateLimiting || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "enableRateLimiting"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable CAPTCHA</Label>
                        <p className="text-sm text-muted-foreground">Prevent automated attacks</p>
                      </div>
                      <Switch
                        checked={settings.customer?.enableCAPTCHA || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "enableCAPTCHA"], checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Performance Settings</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure portal performance options</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Caching</Label>
                        <p className="text-sm text-muted-foreground">Cache static content</p>
                      </div>
                      <Switch
                        defaultChecked={settings.customer?.enableCaching || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "enableCaching"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Compression</Label>
                        <p className="text-sm text-muted-foreground">Compress responses</p>
                      </div>
                      <Switch
                        defaultChecked={settings.customer?.enableCompression || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "enableCompression"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable CDN</Label>
                        <p className="text-sm text-muted-foreground">Use content delivery network</p>
                      </div>
                      <Switch
                        checked={settings.customer?.enableCDN || false}
                        onCheckedChange={(checked) => updateSetting(["customer", "enableCDN"], checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-file-upload">Max File Upload Size (MB)</Label>
                  <Select
                    defaultValue="10"
                    value={String(settings.customer?.maxFileUpload || 10)}
                    onValueChange={(value) => updateSetting(["customer", "maxFileUpload"], Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 MB</SelectItem>
                      <SelectItem value="10">10 MB</SelectItem>
                      <SelectItem value="25">25 MB</SelectItem>
                      <SelectItem value="50">50 MB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Admin Portal - Administrative Settings</span>
                </CardTitle>
                <CardDescription>Configure administrative aspects of the admin portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-portal-url">Admin Portal URL</Label>
                  <Input
                    id="admin-portal-url"
                    placeholder="https://admin.techconnect.co.ke"
                    value={settings.admin?.url || ""}
                    onChange={(e) => updateSetting(["admin", "url"], e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-portal-title">Portal Title</Label>
                  <Input
                    id="admin-portal-title"
                    placeholder="Admin Portal"
                    value={settings.admin?.title || ""}
                    onChange={(e) => updateSetting(["admin", "title"], e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Access Control</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure admin portal access restrictions</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>IP Whitelist Only</Label>
                        <p className="text-sm text-muted-foreground">Restrict to specific IP addresses</p>
                      </div>
                      <Switch
                        checked={settings.admin?.ipWhitelistOnly || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "ipWhitelistOnly"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Require 2FA for All Admins</Label>
                        <p className="text-sm text-muted-foreground">Mandatory two-factor authentication</p>
                      </div>
                      <Switch
                        defaultChecked={settings.admin?.require2FA || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "require2FA"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Single Session Per User</Label>
                        <p className="text-sm text-muted-foreground">Only one active session allowed</p>
                      </div>
                      <Switch
                        defaultChecked={settings.admin?.singleSessionPerUser || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "singleSessionPerUser"], checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowed-ips">Allowed IP Addresses</Label>
                  <Textarea
                    id="allowed-ips"
                    placeholder="192.168.1.0/24&#10;203.0.113.0/24"
                    value={settings.admin?.allowedIPs || ""}
                    onChange={(e) => updateSetting(["admin", "allowedIPs"], e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Enter IP addresses or CIDR blocks, one per line</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-session-timeout">Session Timeout (minutes)</Label>
                  <Select
                    defaultValue="15"
                    value={String(settings.admin?.sessionTimeout || 15)}
                    onValueChange={(value) => updateSetting(["admin", "sessionTimeout"], Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>Admin Portal - System Settings</span>
                </CardTitle>
                <CardDescription>Configure system-level admin portal settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Audit & Logging</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure audit trail and logging settings</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Audit Logging</Label>
                        <p className="text-sm text-muted-foreground">Log all admin actions</p>
                      </div>
                      <Switch
                        defaultChecked={settings.admin?.enableAuditLogging || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "enableAuditLogging"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Log Failed Login Attempts</Label>
                        <p className="text-sm text-muted-foreground">Track security incidents</p>
                      </div>
                      <Switch
                        defaultChecked={settings.admin?.logFailedLoginAttempts || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "logFailedLoginAttempts"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Log Data Changes</Label>
                        <p className="text-sm text-muted-foreground">Track data modifications</p>
                      </div>
                      <Switch
                        defaultChecked={settings.admin?.logDataChanges || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "logDataChanges"], checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Backup & Recovery</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure backup and recovery options</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Database Backup</Label>
                        <p className="text-sm text-muted-foreground">Automatic daily backups</p>
                      </div>
                      <Switch
                        defaultChecked={settings.admin?.autoDatabaseBackup || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "autoDatabaseBackup"], checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Configuration Backup</Label>
                        <p className="text-sm text-muted-foreground">Backup system settings</p>
                      </div>
                      <Switch
                        defaultChecked={settings.admin?.configurationBackup || false}
                        onCheckedChange={(checked) => updateSetting(["admin", "configurationBackup"], checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-retention">Backup Retention (days)</Label>
                  <Select
                    defaultValue="30"
                    value={String(settings.admin?.backupRetention || 30)}
                    onValueChange={(value) => updateSetting(["admin", "backupRetention"], Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Themes & Branding</span>
              </CardTitle>
              <CardDescription>Customize the appearance and branding of both portals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Customer Portal Theme</Label>
                    <p className="text-sm text-muted-foreground mb-3">Customize customer portal appearance</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-theme">Theme</Label>
                    <Select
                      defaultValue="modern"
                      value={settings.themes?.customerTheme || "modern"}
                      onValueChange={(value) => updateSetting(["themes", "customerTheme"], value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-primary-color">Primary Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="customer-primary-color"
                          type="color"
                          defaultValue="#3b82f6"
                          value={settings.themes?.customerPrimaryColor || "#3b82f6"}
                          className="w-16 h-10 p-1"
                          onChange={(e) => updateSetting(["themes", "customerPrimaryColor"], e.target.value)}
                        />
                        <Input
                          placeholder="#3b82f6"
                          value={settings.themes?.customerPrimaryColor || "#3b82f6"}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-secondary-color">Secondary Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="customer-secondary-color"
                          type="color"
                          defaultValue="#64748b"
                          value={settings.themes?.customerSecondaryColor || "#64748b"}
                          className="w-16 h-10 p-1"
                          onChange={(e) => updateSetting(["themes", "customerSecondaryColor"], e.target.value)}
                        />
                        <Input
                          placeholder="#64748b"
                          value={settings.themes?.customerSecondaryColor || "#64748b"}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-font">Font Family</Label>
                    <Select
                      defaultValue="inter"
                      value={settings.themes?.customerFont || "inter"}
                      onValueChange={(value) => updateSetting(["themes", "customerFont"], value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="roboto">Roboto</SelectItem>
                        <SelectItem value="opensans">Open Sans</SelectItem>
                        <SelectItem value="lato">Lato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Admin Portal Theme</Label>
                    <p className="text-sm text-muted-foreground mb-3">Customize admin portal appearance</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-theme">Theme</Label>
                    <Select
                      defaultValue="dark"
                      value={settings.themes?.adminTheme || "dark"}
                      onValueChange={(value) => updateSetting(["themes", "adminTheme"], value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-primary-color">Primary Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="admin-primary-color"
                          type="color"
                          defaultValue="#1f2937"
                          value={settings.themes?.adminPrimaryColor || "#1f2937"}
                          className="w-16 h-10 p-1"
                          onChange={(e) => updateSetting(["themes", "adminPrimaryColor"], e.target.value)}
                        />
                        <Input
                          placeholder="#1f2937"
                          value={settings.themes?.adminPrimaryColor || "#1f2937"}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-accent-color">Accent Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="admin-accent-color"
                          type="color"
                          defaultValue="#3b82f6"
                          value={settings.themes?.adminAccentColor || "#3b82f6"}
                          className="w-16 h-10 p-1"
                          onChange={(e) => updateSetting(["themes", "adminAccentColor"], e.target.value)}
                        />
                        <Input
                          placeholder="#3b82f6"
                          value={settings.themes?.adminAccentColor || "#3b82f6"}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-sidebar">Sidebar Style</Label>
                    <Select
                      defaultValue="collapsible"
                      value={settings.themes?.adminSidebar || "collapsible"}
                      onValueChange={(value) => updateSetting(["themes", "adminSidebar"], value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="collapsible">Collapsible</SelectItem>
                        <SelectItem value="overlay">Overlay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Custom CSS</Label>
                  <p className="text-sm text-muted-foreground mb-3">Add custom CSS for advanced styling</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer-css">Customer Portal CSS</Label>
                    <Textarea
                      id="customer-css"
                      placeholder="/* Custom CSS for customer portal */"
                      value={settings.themes?.customerCSS || ""}
                      rows={6}
                      className="font-mono text-sm"
                      onChange={(e) => updateSetting(["themes", "customerCSS"], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-css">Admin Portal CSS</Label>
                    <Textarea
                      id="admin-css"
                      placeholder="/* Custom CSS for admin portal */"
                      value={settings.themes?.adminCSS || ""}
                      rows={6}
                      className="font-mono text-sm"
                      onChange={(e) => updateSetting(["themes", "adminCSS"], e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Customer Portal Features</span>
                </CardTitle>
                <CardDescription>Configure which features are available to customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      feature: "Account Dashboard",
                      description: "View account overview and status",
                      enabled: settings.features?.customer?.accountDashboard || true,
                    },
                    {
                      feature: "Bill Payment",
                      description: "Pay bills online via M-Pesa/Bank",
                      enabled: settings.features?.customer?.billPayment || true,
                    },
                    {
                      feature: "Usage Statistics",
                      description: "View data usage and statistics",
                      enabled: settings.features?.customer?.usageStatistics || true,
                    },
                    {
                      feature: "Service Management",
                      description: "Upgrade/downgrade service plans",
                      enabled: settings.features?.customer?.serviceManagement || true,
                    },
                    {
                      feature: "Support Tickets",
                      description: "Create and track support tickets",
                      enabled: settings.features?.customer?.supportTickets || true,
                    },
                    {
                      feature: "Payment History",
                      description: "View payment history and receipts",
                      enabled: settings.features?.customer?.paymentHistory || true,
                    },
                    {
                      feature: "Profile Management",
                      description: "Update personal information",
                      enabled: settings.features?.customer?.profileManagement || true,
                    },
                    {
                      feature: "Referral Program",
                      description: "Refer friends and earn rewards",
                      enabled: settings.features?.customer?.referralProgram || false,
                    },
                    {
                      feature: "Live Chat Support",
                      description: "Real-time chat with support",
                      enabled: settings.features?.customer?.liveChatSupport || false,
                    },
                    {
                      feature: "Mobile App Download",
                      description: "Download mobile app links",
                      enabled: settings.features?.customer?.mobileAppDownload || true,
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="font-medium">{item.feature}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) => updateSetting(["features", "customer", item.feature], checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Admin Portal Features</span>
                </CardTitle>
                <CardDescription>Configure admin portal modules and features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      feature: "Customer Management",
                      description: "Manage customer accounts and data",
                      enabled: settings.features?.admin?.customerManagement || true,
                    },
                    {
                      feature: "Billing & Finance",
                      description: "Billing, payments, and financial reports",
                      enabled: settings.features?.admin?.billingAndFinance || true,
                    },
                    {
                      feature: "Network Management",
                      description: "Manage network infrastructure",
                      enabled: settings.features?.admin?.networkManagement || true,
                    },
                    {
                      feature: "Support System",
                      description: "Handle customer support tickets",
                      enabled: settings.features?.admin?.supportSystem || true,
                    },
                    {
                      feature: "User Management",
                      description: "Manage admin users and permissions",
                      enabled: settings.features?.admin?.userManagement || true,
                    },
                    {
                      feature: "Reports & Analytics",
                      description: "Generate reports and analytics",
                      enabled: settings.features?.admin?.reportsAndAnalytics || true,
                    },
                    {
                      feature: "Inventory Management",
                      description: "Track equipment and inventory",
                      enabled: settings.features?.admin?.inventoryManagement || true,
                    },
                    {
                      feature: "Task Management",
                      description: "Assign and track tasks",
                      enabled: settings.features?.admin?.taskManagement || true,
                    },
                    {
                      feature: "HR Management",
                      description: "Employee and HR functions",
                      enabled: settings.features?.admin?.hrManagement || true,
                    },
                    {
                      feature: "Vehicle Management",
                      description: "Fleet and vehicle tracking",
                      enabled: settings.features?.admin?.vehicleManagement || false,
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="font-medium">{item.feature}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) => updateSetting(["features", "admin", item.feature], checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>Configure portal notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Customer Notifications</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure notifications shown to customers</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Bill Due Reminders</Label>
                        <p className="text-sm text-muted-foreground">Show bill due notifications</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.customer?.billDueReminders || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "customer", "billDueReminders"], checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Service Alerts</Label>
                        <p className="text-sm text-muted-foreground">Network and service alerts</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.customer?.serviceAlerts || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "customer", "serviceAlerts"], checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Promotional Offers</Label>
                        <p className="text-sm text-muted-foreground">Show promotional content</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.customer?.promotionalOffers || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "customer", "promotionalOffers"], checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>System Maintenance</Label>
                        <p className="text-sm text-muted-foreground">Maintenance notifications</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.customer?.systemMaintenance || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "customer", "systemMaintenance"], checked)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Admin Notifications</Label>
                    <p className="text-sm text-muted-foreground mb-3">Configure notifications for admin users</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>System Alerts</Label>
                        <p className="text-sm text-muted-foreground">Critical system notifications</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.admin?.systemAlerts || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "admin", "systemAlerts"], checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>New Customer Registrations</Label>
                        <p className="text-sm text-muted-foreground">Alert on new customers</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.admin?.newCustomerRegistrations || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "admin", "newCustomerRegistrations"], checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Payment Failures</Label>
                        <p className="text-sm text-muted-foreground">Failed payment notifications</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.admin?.paymentFailures || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "admin", "paymentFailures"], checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Task Assignments</Label>
                        <p className="text-sm text-muted-foreground">New task notifications</p>
                      </div>
                      <Switch
                        checked={settings.features?.notifications?.admin?.taskAssignments || false}
                        onCheckedChange={(checked) =>
                          updateSetting(["features", "notifications", "admin", "taskAssignments"], checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

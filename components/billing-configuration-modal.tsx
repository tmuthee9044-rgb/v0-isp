"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Calculator, Clock, CreditCard, Bell, FileText, Settings } from "lucide-react"

interface BillingConfigurationModalProps {
  customerId: number
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface BillingConfig {
  id?: number
  customer_id: number
  billing_cycle: string
  billing_day: number
  pro_rata_enabled: boolean
  tax_inclusive: boolean
  tax_rate: number
  tax_exempt: boolean
  payment_terms: number
  grace_period_days: number
  late_fee_type: string
  late_fee_amount: number
  credit_limit: number
  auto_suspend_on_overdue: boolean
  overdue_threshold_days: number
  auto_generate_invoices: boolean
  auto_send_invoices: boolean
  auto_send_reminders: boolean
  reminder_days_before: number
  reminder_days_after: number
  notification_email: string
  notification_phone: string
  notification_methods: string[]
  custom_invoice_template: string
  custom_payment_terms: string
  billing_notes: string
}

export function BillingConfigurationModal({ customerId, isOpen, onClose, onSave }: BillingConfigurationModalProps) {
  const [config, setConfig] = useState<BillingConfig>({
    customer_id: customerId,
    billing_cycle: "monthly",
    billing_day: 1,
    pro_rata_enabled: true,
    tax_inclusive: false,
    tax_rate: 16.0,
    tax_exempt: false,
    payment_terms: 30,
    grace_period_days: 7,
    late_fee_type: "percentage",
    late_fee_amount: 5.0,
    credit_limit: 0,
    auto_suspend_on_overdue: true,
    overdue_threshold_days: 30,
    auto_generate_invoices: true,
    auto_send_invoices: true,
    auto_send_reminders: true,
    reminder_days_before: 3,
    reminder_days_after: 7,
    notification_email: "",
    notification_phone: "",
    notification_methods: ["email"],
    custom_invoice_template: "",
    custom_payment_terms: "",
    billing_notes: "",
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && customerId) {
      loadBillingConfig()
    }
  }, [isOpen, customerId])

  const loadBillingConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/billing-config`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConfig({
            ...config,
            ...result.data,
            notification_methods: Array.isArray(result.data.notification_methods)
              ? result.data.notification_methods
              : JSON.parse(result.data.notification_methods || '["email"]'),
          })
        }
      }
    } catch (error) {
      console.error("Error loading billing config:", error)
      toast.error("Failed to load billing configuration")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/billing-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast.success("Billing configuration saved successfully")
          onSave()
          onClose()
        } else {
          toast.error(result.error || "Failed to save configuration")
        }
      } else {
        toast.error("Failed to save billing configuration")
      }
    } catch (error) {
      console.error("Error saving billing config:", error)
      toast.error("Failed to save billing configuration")
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (field: keyof BillingConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const toggleNotificationMethod = (method: string) => {
    const methods = [...config.notification_methods]
    const index = methods.indexOf(method)
    if (index > -1) {
      methods.splice(index, 1)
    } else {
      methods.push(method)
    }
    updateConfig("notification_methods", methods)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Billing Configuration
          </DialogTitle>
          <DialogDescription>
            Configure billing rules, payment terms, and automation settings for this customer
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading configuration...</div>
          </div>
        ) : (
          <Tabs defaultValue="billing" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="billing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Billing Cycle & Tax Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Billing Cycle</Label>
                      <Select
                        value={config.billing_cycle}
                        onValueChange={(value) => updateConfig("billing_cycle", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Billing Day</Label>
                      <Input
                        type="number"
                        min="1"
                        max={config.billing_cycle === "weekly" ? "7" : "31"}
                        value={config.billing_day}
                        onChange={(e) => updateConfig("billing_day", Number.parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.billing_cycle === "weekly" ? "Day of week (1=Monday)" : "Day of month"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pro-rata Billing</Label>
                      <p className="text-sm text-muted-foreground">Enable proportional billing for mid-cycle changes</p>
                    </div>
                    <Switch
                      checked={config.pro_rata_enabled}
                      onCheckedChange={(checked) => updateConfig("pro_rata_enabled", checked)}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={config.tax_rate}
                        onChange={(e) => updateConfig("tax_rate", Number.parseFloat(e.target.value))}
                        disabled={config.tax_exempt}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Tax Inclusive Pricing</Label>
                        <Switch
                          checked={config.tax_inclusive}
                          onCheckedChange={(checked) => updateConfig("tax_inclusive", checked)}
                          disabled={config.tax_exempt}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Tax Exempt</Label>
                        <Switch
                          checked={config.tax_exempt}
                          onCheckedChange={(checked) => updateConfig("tax_exempt", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Terms & Late Fees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Payment Terms (Days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.payment_terms}
                        onChange={(e) => updateConfig("payment_terms", Number.parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Grace Period (Days)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={config.grace_period_days}
                        onChange={(e) => updateConfig("grace_period_days", Number.parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Late Fee Type</Label>
                      <Select
                        value={config.late_fee_type}
                        onValueChange={(value) => updateConfig("late_fee_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Late Fee Amount {config.late_fee_type === "percentage" ? "(%)" : "(KES)"}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.late_fee_amount}
                        onChange={(e) => updateConfig("late_fee_amount", Number.parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Credit Limit (KES)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.credit_limit}
                        onChange={(e) => updateConfig("credit_limit", Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Overdue Threshold (Days)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.overdue_threshold_days}
                        onChange={(e) => updateConfig("overdue_threshold_days", Number.parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-suspend on Overdue</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically suspend services when payment is overdue
                      </p>
                    </div>
                    <Switch
                      checked={config.auto_suspend_on_overdue}
                      onCheckedChange={(checked) => updateConfig("auto_suspend_on_overdue", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Billing Automation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-generate Invoices</Label>
                        <p className="text-sm text-muted-foreground">Automatically create recurring invoices</p>
                      </div>
                      <Switch
                        checked={config.auto_generate_invoices}
                        onCheckedChange={(checked) => updateConfig("auto_generate_invoices", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-send Invoices</Label>
                        <p className="text-sm text-muted-foreground">Automatically send invoices to customer</p>
                      </div>
                      <Switch
                        checked={config.auto_send_invoices}
                        onCheckedChange={(checked) => updateConfig("auto_send_invoices", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-send Reminders</Label>
                        <p className="text-sm text-muted-foreground">Automatically send payment reminders</p>
                      </div>
                      <Switch
                        checked={config.auto_send_reminders}
                        onCheckedChange={(checked) => updateConfig("auto_send_reminders", checked)}
                      />
                    </div>
                  </div>

                  {config.auto_send_reminders && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Reminder Days Before Due</Label>
                          <Input
                            type="number"
                            min="0"
                            value={config.reminder_days_before}
                            onChange={(e) => updateConfig("reminder_days_before", Number.parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Reminder Days After Due</Label>
                          <Input
                            type="number"
                            min="0"
                            value={config.reminder_days_after}
                            onChange={(e) => updateConfig("reminder_days_after", Number.parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Notification Email</Label>
                      <Input
                        type="email"
                        placeholder="Override customer email"
                        value={config.notification_email}
                        onChange={(e) => updateConfig("notification_email", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Notification Phone</Label>
                      <Input
                        type="tel"
                        placeholder="Override customer phone"
                        value={config.notification_phone}
                        onChange={(e) => updateConfig("notification_phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notification Methods</Label>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant={config.notification_methods.includes("email") ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleNotificationMethod("email")}
                      >
                        Email
                      </Badge>
                      <Badge
                        variant={config.notification_methods.includes("sms") ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleNotificationMethod("sms")}
                      >
                        SMS
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Advanced Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Custom Invoice Template</Label>
                    <Input
                      placeholder="Template name (optional)"
                      value={config.custom_invoice_template}
                      onChange={(e) => updateConfig("custom_invoice_template", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Custom Payment Terms</Label>
                    <Textarea
                      placeholder="Custom payment terms text for invoices"
                      value={config.custom_payment_terms}
                      onChange={(e) => updateConfig("custom_payment_terms", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Internal Billing Notes</Label>
                    <Textarea
                      placeholder="Internal notes about this customer's billing"
                      value={config.billing_notes}
                      onChange={(e) => updateConfig("billing_notes", e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

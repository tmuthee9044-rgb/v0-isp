"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Settings, CreditCard, Smartphone, Building2, AlertCircle, CheckCircle, Save } from "lucide-react"

interface FinanceSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  currentSettings: {
    payment_method: string
    auto_payment: boolean
  }
}

export function FinanceSettingsModal({ open, onOpenChange, customerId, currentSettings }: FinanceSettingsModalProps) {
  const [paymentMethod, setPaymentMethod] = useState(currentSettings.payment_method)
  const [autoPayment, setAutoPayment] = useState(currentSettings.auto_payment)
  const [mpesaNumber, setMpesaNumber] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [reminderDays, setReminderDays] = useState("3")
  const [lateFeePercentage, setLateFeePercentage] = useState("5")
  const [graceDays, setGraceDays] = useState("7")
  const [isLoading, setIsLoading] = useState(false)

  const paymentMethods = [
    {
      value: "mpesa",
      label: "M-Pesa",
      icon: Smartphone,
      description: "Mobile money payments",
      popular: true,
    },
    {
      value: "bank",
      label: "Bank Transfer",
      icon: Building2,
      description: "Direct bank transfers",
      popular: false,
    },
    {
      value: "card",
      label: "Credit/Debit Card",
      icon: CreditCard,
      description: "Card payments",
      popular: false,
    },
  ]

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("Updating finance settings:", {
        customerId,
        paymentMethod,
        autoPayment,
        mpesaNumber,
        bankAccount,
        cardNumber,
        reminderDays,
        lateFeePercentage,
        graceDays,
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating finance settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Finance & Payment Settings
          </DialogTitle>
          <DialogDescription>Configure payment methods and billing preferences for this customer</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.map((method) => {
                  const Icon = method.icon
                  return (
                    <Card
                      key={method.value}
                      className={`cursor-pointer transition-all ${
                        paymentMethod === method.value ? "ring-2 ring-primary border-primary" : "hover:shadow-md"
                      }`}
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Icon className="w-6 h-6 text-primary" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{method.label}</span>
                              {method.popular && <Badge className="text-xs">Popular</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                          {paymentMethod === method.value && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Payment Method Specific Fields */}
              {paymentMethod === "mpesa" && (
                <div className="mt-4 p-4 border rounded-lg bg-green-50/50">
                  <Label htmlFor="mpesa-number">M-Pesa Phone Number</Label>
                  <Input
                    id="mpesa-number"
                    value={mpesaNumber}
                    onChange={(e) => setMpesaNumber(e.target.value)}
                    placeholder="254712345678"
                    className="mt-1"
                  />
                </div>
              )}

              {paymentMethod === "bank" && (
                <div className="mt-4 p-4 border rounded-lg bg-blue-50/50">
                  <Label htmlFor="bank-account">Bank Account Number</Label>
                  <Input
                    id="bank-account"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Enter bank account number"
                    className="mt-1"
                  />
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="mt-4 p-4 border rounded-lg bg-purple-50/50">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="**** **** **** 1234"
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Automatic Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-payment"
                  checked={autoPayment}
                  onCheckedChange={(checked) => setAutoPayment(checked as boolean)}
                />
                <Label htmlFor="auto-payment" className="flex items-center gap-2">
                  Enable automatic payments
                  {autoPayment ? (
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </Label>
              </div>

              {autoPayment && (
                <div className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      Automatic payments will be processed 1 day before the due date using the selected payment method.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="reminder-days">Payment Reminder (Days Before Due)</Label>
                  <Select value={reminderDays} onValueChange={setReminderDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="5">5 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="late-fee">Late Payment Fee (%)</Label>
                  <Select value={lateFeePercentage} onValueChange={setLateFeePercentage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Fee</SelectItem>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grace-days">Grace Period (Days)</Label>
                  <Select value={graceDays} onValueChange={setGraceDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Grace Period</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium capitalize">{paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto Payment:</span>
                  <Badge className={autoPayment ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {autoPayment ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Reminder:</span>
                  <span className="font-medium">{reminderDays} days before due</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Late Fee:</span>
                  <span className="font-medium">{lateFeePercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grace Period:</span>
                  <span className="font-medium">{graceDays} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

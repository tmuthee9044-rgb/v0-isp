"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Star, Gift, Users, DollarSign, Award, Plus, Edit, Trash2, RefreshCw, Target } from "lucide-react"

interface BonusRule {
  id: string
  name: string
  description: string
  topup_min_amount: number
  bonus_percentage: number
  points_awarded: number
  is_active: boolean
  valid_from: string
  valid_until: string
  created_at: string
}

interface LoyaltyReports {
  loyaltyStats: {
    total_customers_with_points: number
    total_points_earned: number
    total_points_redeemed: number
    total_earn_transactions: number
    total_redeem_transactions: number
  }
  topCustomers: Array<{
    id: string
    name: string
    email: string
    loyalty_points: number
    transaction_count: number
    points_earned: number
    points_redeemed: number
  }>
  bonusStats: {
    total_bonus_transactions: number
    total_bonus_amount: number
    average_bonus_amount: number
  }
  campaignStats: Array<{
    campaign_name: string
    bonus_percentage: number
    points_awarded: number
    transactions_count: number
    total_topup_amount: number
    total_bonus_awarded: number
  }>
  period: number
}

export default function AdminLoyaltyPage() {
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])
  const [loyaltyReports, setLoyaltyReports] = useState<LoyaltyReports | null>(null)
  const [loading, setLoading] = useState(true)
  const [createRuleDialogOpen, setCreateRuleDialogOpen] = useState(false)
  const [manualAwardDialogOpen, setManualAwardDialogOpen] = useState(false)
  const [reportPeriod, setReportPeriod] = useState("30")
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [reportPeriod])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rulesResponse, reportsResponse] = await Promise.all([
        fetch("/api/admin/loyalty/bonus-rules"),
        fetch(`/api/admin/loyalty/reports?period=${reportPeriod}`),
      ])

      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json()
        setBonusRules(rulesData.data)
      }

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json()
        setLoyaltyReports(reportsData.data)
      }
    } catch (error) {
      console.error("Failed to fetch loyalty data:", error)
      toast({
        title: "Error",
        description: "Failed to load loyalty management data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBonusRule = async (formData: FormData) => {
    try {
      const response = await fetch("/api/admin/loyalty/bonus-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
          topup_min_amount: Number.parseFloat(formData.get("topup_min_amount") as string),
          bonus_percentage: Number.parseFloat(formData.get("bonus_percentage") as string),
          points_awarded: Number.parseInt(formData.get("points_awarded") as string),
          valid_from: formData.get("valid_from"),
          valid_until: formData.get("valid_until"),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Bonus rule created successfully",
        })
        setCreateRuleDialogOpen(false)
        fetchData()
      } else {
        throw new Error("Failed to create bonus rule")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create bonus rule",
        variant: "destructive",
      })
    }
  }

  const handleManualAward = async (formData: FormData) => {
    try {
      const response = await fetch("/api/admin/loyalty/manual-award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: formData.get("customer_id"),
          points: Number.parseInt(formData.get("points") as string) || 0,
          wallet_credit: Number.parseFloat(formData.get("wallet_credit") as string) || 0,
          reason: formData.get("reason"),
          admin_user: "admin", // In real app, get from auth context
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Manual award processed successfully",
        })
        setManualAwardDialogOpen(false)
        fetchData()
      } else {
        throw new Error("Failed to process manual award")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process manual award",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Loyalty Management</h2>
          <p className="text-muted-foreground">
            Configure loyalty programs, bonus rules, and track customer engagement
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loyaltyReports && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loyaltyReports.loyaltyStats.total_customers_with_points}</div>
              <p className="text-xs text-muted-foreground">with loyalty points</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loyaltyReports.loyaltyStats.total_points_earned.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loyaltyReports.loyaltyStats.total_earn_transactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Redeemed</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loyaltyReports.loyaltyStats.total_points_redeemed.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loyaltyReports.loyaltyStats.total_redeem_transactions} redemptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bonus Credits</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KES {loyaltyReports.bonusStats.total_bonus_amount?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {loyaltyReports.bonusStats.total_bonus_transactions || 0} bonuses awarded
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Bonus Rules</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
          <TabsTrigger value="manual">Manual Awards</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Bonus Rules & Campaigns</h3>
            <Dialog open={createRuleDialogOpen} onOpenChange={setCreateRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Bonus Rule</DialogTitle>
                  <DialogDescription>Configure a new loyalty bonus campaign</DialogDescription>
                </DialogHeader>
                <form action={handleCreateBonusRule}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" name="name" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description
                      </Label>
                      <Textarea id="description" name="description" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="topup_min_amount" className="text-right">
                        Min Amount
                      </Label>
                      <Input
                        id="topup_min_amount"
                        name="topup_min_amount"
                        type="number"
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bonus_percentage" className="text-right">
                        Bonus %
                      </Label>
                      <Input
                        id="bonus_percentage"
                        name="bonus_percentage"
                        type="number"
                        step="0.1"
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="points_awarded" className="text-right">
                        Points
                      </Label>
                      <Input id="points_awarded" name="points_awarded" type="number" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="valid_from" className="text-right">
                        Valid From
                      </Label>
                      <Input id="valid_from" name="valid_from" type="datetime-local" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="valid_until" className="text-right">
                        Valid Until
                      </Label>
                      <Input
                        id="valid_until"
                        name="valid_until"
                        type="datetime-local"
                        className="col-span-3"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Rule</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bonusRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>{rule.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Min Top-up:</span>
                      <span>KES {rule.topup_min_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bonus:</span>
                      <span>{rule.bonus_percentage}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Points:</span>
                      <span>{rule.points_awarded}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Valid Until:</span>
                      <span>{new Date(rule.valid_until).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {loyaltyReports && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance</CardTitle>
                  <CardDescription>Effectiveness of bonus campaigns and promotions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loyaltyReports.campaignStats.map((campaign, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{campaign.campaign_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {campaign.bonus_percentage}% bonus + {campaign.points_awarded} points
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            KES {campaign.total_topup_amount?.toLocaleString() || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.transactions_count} transactions
                          </div>
                          <div className="text-sm text-green-600">
                            KES {campaign.total_bonus_awarded?.toLocaleString() || 0} bonus
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {loyaltyReports && (
            <Card>
              <CardHeader>
                <CardTitle>Top Loyalty Customers</CardTitle>
                <CardDescription>Customers with highest loyalty engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loyaltyReports.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                          <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{customer.name}</h4>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">{customer.loyalty_points} points</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.points_earned} earned • {customer.points_redeemed} redeemed
                        </div>
                        <div className="text-sm text-muted-foreground">{customer.transaction_count} transactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Manual Awards</h3>
              <p className="text-sm text-muted-foreground">
                Award loyalty points or wallet credits manually for customer retention
              </p>
            </div>
            <Dialog open={manualAwardDialogOpen} onOpenChange={setManualAwardDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Award className="mr-2 h-4 w-4" />
                  Award Points/Credits
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual Award</DialogTitle>
                  <DialogDescription>Award loyalty points or wallet credits to a customer</DialogDescription>
                </DialogHeader>
                <form action={handleManualAward}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="customer_id" className="text-right">
                        Customer ID
                      </Label>
                      <Input id="customer_id" name="customer_id" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="points" className="text-right">
                        Loyalty Points
                      </Label>
                      <Input id="points" name="points" type="number" className="col-span-3" placeholder="0" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="wallet_credit" className="text-right">
                        Wallet Credit
                      </Label>
                      <Input
                        id="wallet_credit"
                        name="wallet_credit"
                        type="number"
                        step="0.01"
                        className="col-span-3"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="reason" className="text-right">
                        Reason
                      </Label>
                      <Textarea id="reason" name="reason" className="col-span-3" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Process Award</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Manual Award System</h3>
                <p className="text-muted-foreground mb-4">
                  Use the "Award Points/Credits" button above to manually award loyalty points or wallet credits to
                  customers for special cases, customer retention, or compensation.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="text-center">
                    <Star className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                    <h4 className="font-medium">Loyalty Points</h4>
                    <p className="text-sm text-muted-foreground">Award points for customer retention</p>
                  </div>
                  <div className="text-center">
                    <DollarSign className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <h4 className="font-medium">Wallet Credits</h4>
                    <p className="text-sm text-muted-foreground">Add credits for compensation</p>
                  </div>
                  <div className="text-center">
                    <Target className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <h4 className="font-medium">Targeted Rewards</h4>
                    <p className="text-sm text-muted-foreground">Reward specific customer actions</p>
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

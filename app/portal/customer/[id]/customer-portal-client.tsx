"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Wifi,
  CreditCard,
  Router,
  Plus,
  Phone,
  MessageSquare,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Gift,
  Star,
  Trophy,
  Zap,
  TrendingUp,
} from "lucide-react"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  county?: string
  postal_code?: string
  connection_type?: string
  router_ip?: string
  mac_address?: string
  installation_date?: string
  last_payment?: string
  balance: number
  status: string
  portal_username?: string
  customer_type?: string
  payment_method?: string
  auto_payment?: boolean
  business_name?: string
  business_type?: string
  physical_gps_lat?: string
  physical_gps_lng?: string
  created_at: string
}

interface Service {
  id: string
  plan_name: string
  price: number
  speed_download: string
  speed_upload: string
  status: string
  start_date: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  status: string
  reference?: string
}

interface WalletData {
  balance: number
  transactions: Array<{
    id: string
    amount: number
    type: "topup" | "payment" | "bonus" | "refund"
    description: string
    created_at: string
  }>
}

interface LoyaltyData {
  points: number
  tier: string
  transactions: Array<{
    id: string
    points: number
    type: "earn" | "redeem"
    description: string
    created_at: string
  }>
  redemptionOptions: Array<{
    id: string
    title: string
    description: string
    pointsCost: number
    type: "wallet_credit" | "service_discount" | "bandwidth_extension"
  }>
}

interface BonusOffer {
  id: string
  title: string
  description: string
  minAmount: number
  bonusPercentage: number
  pointsAwarded: number
  validUntil: string
}

interface CustomerPortalClientProps {
  customer: Customer
  services: Service[]
  payments: Payment[]
}

export function CustomerPortalClient({ customer, services, payments }: CustomerPortalClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  const [serviceUpgradeDialogOpen, setServiceUpgradeDialogOpen] = useState(false)
  const [walletTopupDialogOpen, setWalletTopupDialogOpen] = useState(false)
  const [loyaltyRedeemDialogOpen, setLoyaltyRedeemDialogOpen] = useState(false)
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null)
  const [bonusOffers, setBonusOffers] = useState<BonusOffer[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchWalletAndLoyaltyData = async () => {
      try {
        const [walletResponse, loyaltyResponse, bonusResponse] = await Promise.all([
          fetch(`/api/customers/${customer.id}/wallet`),
          fetch(`/api/customers/${customer.id}/loyalty`),
          fetch("/api/wallet/bonus-rules"),
        ])

        if (walletResponse.ok) {
          const walletResult = await walletResponse.json()
          setWalletData(walletResult.data)
        }

        if (loyaltyResponse.ok) {
          const loyaltyResult = await loyaltyResponse.json()
          setLoyaltyData(loyaltyResult.data)
        }

        if (bonusResponse.ok) {
          const bonusResult = await bonusResponse.json()
          setBonusOffers(bonusResult.data)
        }
      } catch (error) {
        console.error("Failed to fetch wallet/loyalty data:", error)
      }
    }

    fetchWalletAndLoyaltyData()
  }, [customer.id])

  const handleWalletTopup = async (formData: FormData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customer.id}/wallet/topup`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Wallet Top-up Successful",
          description: result.message || "Your wallet has been topped up successfully.",
        })
        setWalletTopupDialogOpen(false)
        // Refresh wallet data
        window.location.reload()
      } else {
        toast({
          title: "Top-up Failed",
          description: result.error || "Failed to process wallet top-up",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process wallet top-up. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLoyaltyRedeem = async (formData: FormData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customer.id}/loyalty/redeem`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Points Redeemed Successfully",
          description: result.message || "Your loyalty points have been redeemed.",
        })
        setLoyaltyRedeemDialogOpen(false)
        // Refresh loyalty data
        window.location.reload()
      } else {
        toast({
          title: "Redemption Failed",
          description: result.error || "Failed to redeem loyalty points",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to redeem loyalty points. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (formData: FormData) => {
    setLoading(true)
    try {
      const response = await fetch("/api/portal/payments/process", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Payment Initiated",
          description: result.message || "Your payment is being processed.",
        })
        setPaymentDialogOpen(false)
        // Refresh page data
        window.location.reload()
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Failed to process payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSupportTicket = async (formData: FormData) => {
    setLoading(true)
    try {
      const response = await fetch("/api/portal/support/tickets", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Support Ticket Created",
          description: "Your support ticket has been submitted successfully.",
        })
        setSupportDialogOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create support ticket",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create support ticket. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500"
      case "suspended":
        return "bg-red-500"
      case "pending":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
              <p className="text-gray-600">Welcome back, {customer.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={getStatusColor(customer.status)}>{customer.status}</Badge>
              <div className="text-right">
                <p className="text-sm text-gray-600">Wallet Balance</p>
                <p className="font-bold text-green-600">KES {walletData?.balance.toLocaleString() || "0"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Loyalty Points</p>
                <p className="font-bold text-purple-600 flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  {loyaltyData?.points.toLocaleString() || "0"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Account Balance</p>
                <p className={`font-bold ${customer.balance < 0 ? "text-red-600" : "text-green-600"}`}>
                  KES {customer.balance.toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <Dialog open={walletTopupDialogOpen} onOpenChange={setWalletTopupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Wallet className="mr-2 h-4 w-4" />
                      Top-up Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Top-up Wallet</DialogTitle>
                      <DialogDescription>Add money to your wallet and earn bonus credits</DialogDescription>
                    </DialogHeader>
                    <form action={handleWalletTopup}>
                      <input type="hidden" name="customer_id" value={customer.id} />
                      <div className="grid gap-4 py-4">
                        {bonusOffers.length > 0 && (
                          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                            <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                              <Gift className="h-4 w-4 mr-1" />
                              Active Bonus Offers
                            </h4>
                            {bonusOffers.map((offer) => (
                              <div key={offer.id} className="text-sm text-purple-700 mb-1">
                                • {offer.title}: {offer.description}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="amount" className="text-right">
                            Amount (KES)
                          </Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            min="1"
                            step="0.01"
                            className="col-span-3"
                            placeholder="Enter amount"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="payment_method" className="text-right">
                            Payment Method
                          </Label>
                          <Select name="payment_method" required>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mpesa">M-Pesa</SelectItem>
                              <SelectItem value="card">Credit/Debit Card</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone_number" className="text-right">
                            Phone Number
                          </Label>
                          <Input
                            id="phone_number"
                            name="phone_number"
                            type="tel"
                            className="col-span-3"
                            placeholder="254XXXXXXXXX"
                            defaultValue={customer.phone}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Processing..." : "Top-up Wallet"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Make Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Make a Payment</DialogTitle>
                      <DialogDescription>Choose your payment method and amount</DialogDescription>
                    </DialogHeader>
                    <form action={handlePayment}>
                      <input type="hidden" name="customer_id" value={customer.id} />
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="amount" className="text-right">
                            Amount (KES)
                          </Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            min="1"
                            step="0.01"
                            className="col-span-3"
                            placeholder="Enter amount"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="payment_method" className="text-right">
                            Payment Method
                          </Label>
                          <Select name="payment_method" required>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mpesa">M-Pesa</SelectItem>
                              <SelectItem value="card">Credit/Debit Card</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone_number" className="text-right">
                            Phone Number
                          </Label>
                          <Input
                            id="phone_number"
                            name="phone_number"
                            type="tel"
                            className="col-span-3"
                            placeholder="254XXXXXXXXX"
                            defaultValue={customer.phone}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Processing..." : "Pay Now"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Support
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Support Ticket</DialogTitle>
                      <DialogDescription>Describe your issue and we'll help you resolve it</DialogDescription>
                    </DialogHeader>
                    <form action={handleSupportTicket}>
                      <input type="hidden" name="customer_id" value={customer.id} />
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="subject" className="text-right">
                            Subject
                          </Label>
                          <Input
                            id="subject"
                            name="subject"
                            className="col-span-3"
                            placeholder="Brief description of your issue"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="priority" className="text-right">
                            Priority
                          </Label>
                          <Select name="priority" defaultValue="medium">
                            <SelectTrigger className="col-span-3">
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
                        <div className="grid grid-cols-4 items-start gap-4">
                          <Label htmlFor="description" className="text-right mt-2">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            name="description"
                            className="col-span-3"
                            placeholder="Detailed description of your issue"
                            rows={4}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Creating..." : "Create Ticket"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="wallet">Wallet & Rewards</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-6">
            {loyaltyData && (
              <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Trophy className="mr-2 h-5 w-5" />
                    Loyalty Status - {loyaltyData.tier} Member
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold">{loyaltyData.points.toLocaleString()} Points</p>
                      <p className="text-purple-100">Available for redemption</p>
                    </div>
                    <Dialog open={loyaltyRedeemDialogOpen} onOpenChange={setLoyaltyRedeemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm">
                          <Gift className="mr-2 h-4 w-4" />
                          Redeem Points
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Redeem Loyalty Points</DialogTitle>
                          <DialogDescription>
                            Choose how to use your {loyaltyData.points} loyalty points
                          </DialogDescription>
                        </DialogHeader>
                        <form action={handleLoyaltyRedeem}>
                          <input type="hidden" name="customer_id" value={customer.id} />
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="redemption_type" className="text-right">
                                Redemption Type
                              </Label>
                              <Select name="redemption_type" required>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select redemption option" />
                                </SelectTrigger>
                                <SelectContent>
                                  {loyaltyData.redemptionOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.title} ({option.pointsCost} points)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              {loyaltyData.redemptionOptions.map((option) => (
                                <div key={option.id} className="p-3 border rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">{option.title}</p>
                                      <p className="text-sm text-gray-600">{option.description}</p>
                                    </div>
                                    <Badge variant="outline">{option.pointsCost} points</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={loading}>
                              {loading ? "Redeeming..." : "Redeem Points"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Progress value={Math.min((loyaltyData.points / 1000) * 100, 100)} className="bg-purple-400" />
                  <p className="text-sm text-purple-100 mt-2">
                    {1000 - (loyaltyData.points % 1000)} points to next reward tier
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Wallet Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    KES {walletData?.balance.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Available for payments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {loyaltyData?.points.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">{loyaltyData?.tier || "Bronze"} member</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    +{loyaltyData?.transactions.filter((t) => t.type === "earn").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Points earned</p>
                </CardContent>
              </Card>
            </div>

            {bonusOffers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                    Active Bonus Offers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bonusOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-yellow-800">{offer.title}</h4>
                            <p className="text-sm text-yellow-700 mt-1">{offer.description}</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                {offer.bonusPercentage}% Bonus
                              </Badge>
                              <Badge variant="outline" className="text-purple-700 border-purple-300">
                                +{offer.pointsAwarded} Points
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Valid until</p>
                            <p className="font-medium">{new Date(offer.validUntil).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Wallet Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {walletData?.transactions.length ? (
                    <div className="space-y-3">
                      {walletData.transactions.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {transaction.type === "topup" && "+"}
                              {transaction.type === "payment" && "-"}
                              {transaction.type === "bonus" && "+"}
                              KES {transaction.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              transaction.type === "topup"
                                ? "default"
                                : transaction.type === "bonus"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {transaction.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No wallet transactions yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Loyalty Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {loyaltyData?.transactions.length ? (
                    <div className="space-y-3">
                      {loyaltyData.transactions.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium flex items-center">
                              <Star className="h-4 w-4 mr-1 text-purple-500" />
                              {transaction.type === "earn" && "+"}
                              {transaction.type === "redeem" && "-"}
                              {transaction.points} points
                            </p>
                            <p className="text-sm text-gray-600">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={transaction.type === "earn" ? "default" : "outline"}>
                            {transaction.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No loyalty activity yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {customer.balance < 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">Outstanding Balance</p>
                      <p className="text-sm text-red-600">
                        Your account has an outstanding balance of KES {Math.abs(customer.balance).toLocaleString()}.
                        Please make a payment to avoid service interruption.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Services</CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{services.filter((s) => s.status === "active").length}</div>
                  <p className="text-xs text-muted-foreground">
                    {services.filter((s) => s.status === "suspended").length} suspended
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {customer.last_payment ? new Date(customer.last_payment).toLocaleDateString() : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payments.length > 0 ? `KES ${payments[0].amount.toLocaleString()}` : "No payments"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                  <Router className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center">
                    {customer.status === "active" ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
                        Online
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
                        Offline
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{customer.connection_type || "Fiber"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-4">
                    {payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">KES {payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                          </p>
                          {payment.reference && <p className="text-xs text-gray-500">Ref: {payment.reference}</p>}
                        </div>
                        <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No payment history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Services</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage your internet services</p>
                </div>
                <Dialog open={serviceUpgradeDialogOpen} onOpenChange={setServiceUpgradeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Request Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request New Service</DialogTitle>
                      <DialogDescription>Request a new service or upgrade your existing plan</DialogDescription>
                    </DialogHeader>
                    <form>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="service_type" className="text-right">
                            Service Type
                          </Label>
                          <Select name="service_type">
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upgrade">Upgrade Existing</SelectItem>
                              <SelectItem value="additional">Additional Service</SelectItem>
                              <SelectItem value="downgrade">Downgrade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                          <Label htmlFor="request_details" className="text-right mt-2">
                            Details
                          </Label>
                          <Textarea
                            id="request_details"
                            name="request_details"
                            className="col-span-3"
                            placeholder="Describe your service request"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Submit Request</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div key={service.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{service.plan_name}</h3>
                          <Badge className={getStatusColor(service.status)}>{service.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Monthly Fee</p>
                            <p className="font-medium">KES {service.price.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center">
                            <Download className="h-4 w-4 mr-1 text-blue-500" />
                            <div>
                              <p className="text-gray-600">Download</p>
                              <p className="font-medium">{service.speed_download}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Upload className="h-4 w-4 mr-1 text-green-500" />
                            <div>
                              <p className="text-gray-600">Upload</p>
                              <p className="font-medium">{service.speed_upload}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-600">Start Date</p>
                            <p className="font-medium">{new Date(service.start_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {service.status === "suspended" && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-600">
                              Service suspended due to outstanding payment. Please make a payment to reactivate.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No active services</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Current Balance:</span>
                      <span className={`font-bold ${customer.balance < 0 ? "text-red-600" : "text-green-600"}`}>
                        KES {customer.balance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Monthly Services:</span>
                      <span className="font-medium">
                        KES {services.reduce((sum, service) => sum + service.price, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Payment Method:</span>
                      <span>{customer.payment_method || "Not set"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Auto-payment:</span>
                      <Badge variant={customer.auto_payment ? "default" : "secondary"}>
                        {customer.auto_payment ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" onClick={() => setPaymentDialogOpen(true)}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Make Payment
                    </Button>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Download className="mr-2 h-4 w-4" />
                      Download Invoice
                    </Button>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Phone className="mr-2 h-4 w-4" />
                      Contact Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">KES {payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                          </p>
                          {payment.reference && <p className="text-xs text-gray-500">Ref: {payment.reference}</p>}
                        </div>
                        <div className="text-right">
                          <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                          <Button variant="ghost" size="sm" className="ml-2">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No payment history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="font-medium">{customer.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Customer Type</label>
                      <p className="font-medium">{customer.customer_type || "Individual"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Address</label>
                      <p className="font-medium">
                        {customer.address && customer.city
                          ? `${customer.address}, ${customer.city}${customer.county ? `, ${customer.county}` : ""}`
                          : "Not provided"}
                      </p>
                    </div>
                    {customer.business_name && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Business Name</label>
                        <p className="font-medium">{customer.business_name}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Installation Date</label>
                      <p className="font-medium">
                        {customer.installation_date
                          ? new Date(customer.installation_date).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Information */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Router IP</label>
                      <p className="font-medium font-mono">{customer.router_ip || "Not assigned"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">MAC Address</label>
                      <p className="font-medium font-mono">{customer.mac_address || "Not recorded"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Connection Type</label>
                      <p className="font-medium">{customer.connection_type || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Portal Username</label>
                      <p className="font-medium font-mono">{customer.portal_username || "Not set"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

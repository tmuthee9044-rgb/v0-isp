"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Wifi, CreditCard, Smartphone, Clock, Database, CheckCircle, Loader2 } from "lucide-react"

interface HotspotPackage {
  id: string
  name: string
  description: string
  time_limit: number // minutes
  data_limit: number // MB
  price: number // KES
  popular?: boolean
}

interface Hotspot {
  id: number
  name: string
  location: string
  ssid: string
}

export default function HotspotPaymentPage() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [selectedHotspot, setSelectedHotspot] = useState("")
  const [selectedPackage, setSelectedPackage] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("mpesa")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [email, setEmail] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [voucher, setVoucher] = useState<any>(null)
  const { toast } = useToast()

  const packages: HotspotPackage[] = [
    {
      id: "basic-1h",
      name: "Basic 1 Hour",
      description: "Perfect for quick browsing and social media",
      time_limit: 60,
      data_limit: 500,
      price: 50,
    },
    {
      id: "standard-3h",
      name: "Standard 3 Hours",
      description: "Great for work and streaming",
      time_limit: 180,
      data_limit: 1500,
      price: 120,
      popular: true,
    },
    {
      id: "premium-6h",
      name: "Premium 6 Hours",
      description: "Extended access for heavy usage",
      time_limit: 360,
      data_limit: 3000,
      price: 200,
    },
    {
      id: "daily-24h",
      name: "Daily Pass",
      description: "Full day unlimited access",
      time_limit: 1440,
      data_limit: 5000,
      price: 350,
    },
  ]

  useEffect(() => {
    loadHotspots()
  }, [])

  const loadHotspots = async () => {
    try {
      const response = await fetch("/api/hotspots")
      if (response.ok) {
        const data = await response.json()
        setHotspots(data)
        if (data.length > 0) {
          setSelectedHotspot(data[0].id.toString())
        }
      }
    } catch (error) {
      console.error("Failed to load hotspots:", error)
    }
  }

  const processPayment = async () => {
    if (!selectedHotspot || !selectedPackage || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const selectedPkg = packages.find((p) => p.id === selectedPackage)
    if (!selectedPkg) return

    setIsProcessing(true)

    try {
      const response = await fetch("/api/hotspot-payment/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotspot_id: Number.parseInt(selectedHotspot),
          package_id: selectedPackage,
          payment_method: paymentMethod,
          phone_number: phoneNumber,
          email: email,
          amount: selectedPkg.price,
          time_limit: selectedPkg.time_limit,
          data_limit: selectedPkg.data_limit,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (paymentMethod === "mpesa") {
          toast({
            title: "Payment Initiated",
            description: "Please check your phone for M-Pesa prompt",
          })

          // Poll for payment confirmation
          pollPaymentStatus(result.payment_id)
        } else {
          setVoucher(result.voucher)
          toast({
            title: "Payment Successful",
            description: "Your access voucher has been generated",
          })
        }
      } else {
        throw new Error(result.error || "Payment processing failed")
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 30 // 5 minutes
    let attempts = 0

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/hotspot-payment/status/${paymentId}`)
        const result = await response.json()

        if (result.status === "completed") {
          setVoucher(result.voucher)
          toast({
            title: "Payment Confirmed",
            description: "Your access voucher is ready!",
          })
          return
        } else if (result.status === "failed") {
          toast({
            title: "Payment Failed",
            description: "Payment was not completed. Please try again.",
            variant: "destructive",
          })
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000) // Check every 10 seconds
        } else {
          toast({
            title: "Payment Timeout",
            description: "Payment verification timed out. Please contact support if payment was deducted.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error checking payment status:", error)
      }
    }

    setTimeout(checkStatus, 5000) // Start checking after 5 seconds
  }

  const selectedPkg = packages.find((p) => p.id === selectedPackage)
  const selectedHotspotData = hotspots.find((h) => h.id.toString() === selectedHotspot)

  if (voucher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
            <CardDescription>Your WiFi access voucher is ready</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <div className="text-3xl font-bold font-mono text-blue-600 mb-2">{voucher.code}</div>
                <div className="text-sm text-gray-600">Voucher Code</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Time Limit</div>
                  <div className="text-gray-600">
                    {Math.floor(voucher.time_limit / 60)}h {voucher.time_limit % 60}m
                  </div>
                </div>
                <div>
                  <div className="font-medium">Data Limit</div>
                  <div className="text-gray-600">{voucher.data_limit} MB</div>
                </div>
                <div>
                  <div className="font-medium">Valid Until</div>
                  <div className="text-gray-600">{new Date(voucher.expiry_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium">Hotspot</div>
                  <div className="text-gray-600">{selectedHotspotData?.name}</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">How to Connect:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>
                  1. Connect to WiFi: <strong>{selectedHotspotData?.ssid}</strong>
                </li>
                <li>2. Open your browser</li>
                <li>
                  3. Enter voucher code: <strong>{voucher.code}</strong>
                </li>
                <li>4. Start browsing!</li>
              </ol>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(voucher.code)
                toast({ title: "Copied!", description: "Voucher code copied to clipboard" })
              }}
            >
              Copy Voucher Code
            </Button>

            <Button variant="outline" className="w-full bg-transparent" onClick={() => window.location.reload()}>
              Buy Another Voucher
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Wifi className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl">Get WiFi Access</CardTitle>
          <CardDescription>Choose a package and pay to get instant internet access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hotspot Selection */}
          <div>
            <Label className="text-base font-medium">Select Hotspot Location</Label>
            <Select value={selectedHotspot} onValueChange={setSelectedHotspot}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose hotspot location" />
              </SelectTrigger>
              <SelectContent>
                {hotspots.map((hotspot) => (
                  <SelectItem key={hotspot.id} value={hotspot.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{hotspot.name}</div>
                        <div className="text-sm text-gray-500">{hotspot.location}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Package Selection */}
          <div>
            <Label className="text-base font-medium">Choose Access Package</Label>
            <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage} className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="relative">
                    <RadioGroupItem value={pkg.id} id={pkg.id} className="sr-only" />
                    <Label
                      htmlFor={pkg.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPackage === pkg.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{pkg.name}</h3>
                        {pkg.popular && <Badge className="bg-orange-100 text-orange-800">Popular</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>
                              {Math.floor(pkg.time_limit / 60)}h {pkg.time_limit % 60}m
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Database className="h-4 w-4 text-gray-400" />
                            <span>{pkg.data_limit} MB</span>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-blue-600">KES {pkg.price}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Payment Method */}
          <div>
            <Label className="text-base font-medium">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mpesa" id="mpesa" />
                <Label htmlFor="mpesa" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  M-Pesa
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Credit/Debit Card
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Order Summary */}
          {selectedPkg && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Package:</span>
                  <span className="font-medium">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>
                    {Math.floor(selectedPkg.time_limit / 60)}h {selectedPkg.time_limit % 60}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Data:</span>
                  <span>{selectedPkg.data_limit} MB</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>KES {selectedPkg.price}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pay Button */}
          <Button
            onClick={processPayment}
            disabled={!selectedHotspot || !selectedPackage || !phoneNumber || isProcessing}
            className="w-full h-12 text-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>Pay KES {selectedPkg?.price || 0}</>
            )}
          </Button>

          <div className="text-center text-sm text-gray-500">
            <p>Secure payment processing • Instant access • 24/7 support</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts"
import {
  DollarSign,
  Shield,
  Zap,
  Users,
  Download,
  Upload,
  Database,
  CheckCircle,
  XCircle,
  Printer,
  FileDown,
  BarChart3,
  TrendingUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ServicePlan {
  id: number
  name: string
  type: "residential" | "business" | "enterprise" | "dedicated"
  category: "basic" | "standard" | "premium" | "enterprise" | "custom"
  price: number
  currency: string
  setupFee: number
  speedDown: number
  speedUp: number
  guaranteedSpeedDown: number
  guaranteedSpeedUp: number
  burstSpeedDown: number
  burstSpeedUp: number
  burstDuration: number
  aggregationRatio: string
  dataLimit: number | null
  dataLimitPeriod: "daily" | "weekly" | "monthly" | "billing"
  fupAction: "throttle" | "suspend" | "charge" | "notify"
  throttleSpeed: number
  taxRate: number
  contractLength: number
  staticIP: boolean
  portForwarding: boolean
  prioritySupport: boolean
  slaGuarantee: number
  deviceLimit: number
  connectionLimit: number
  contentFiltering: boolean
  portBlocking: string[]
  qosPriority: "low" | "standard" | "high" | "premium"
  active: boolean
  customers: number
  description: string
}

export default function ServiceComparisonPage() {
  const [selectedPlans, setSelectedPlans] = useState<number[]>([])
  const [availablePlans, setAvailablePlans] = useState<ServicePlan[]>([])
  const [comparisonView, setComparisonView] = useState<"table" | "cards" | "chart">("table")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchServicePlans = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/services")
        const result = await response.json()

        if (result.success && result.data) {
          const plans: ServicePlan[] = result.data.map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            type: plan.service_type || "residential",
            category: plan.category || "standard",
            price: Number.parseFloat(plan.price) || 0,
            currency: plan.currency || "USD",
            setupFee: Number.parseFloat(plan.setup_fee) || 0,
            speedDown: Number.parseInt(plan.speed_download) || 0,
            speedUp: Number.parseInt(plan.speed_upload) || 0,
            guaranteedSpeedDown:
              Number.parseInt(plan.guaranteed_speed_down) || Number.parseInt(plan.speed_download) * 0.8 || 0,
            guaranteedSpeedUp:
              Number.parseInt(plan.guaranteed_speed_up) || Number.parseInt(plan.speed_upload) * 0.8 || 0,
            burstSpeedDown: Number.parseInt(plan.burst_speed_down) || Number.parseInt(plan.speed_download) * 1.5 || 0,
            burstSpeedUp: Number.parseInt(plan.burst_speed_up) || Number.parseInt(plan.speed_upload) * 1.5 || 0,
            burstDuration: Number.parseInt(plan.burst_duration) || 300,
            aggregationRatio: plan.aggregation_ratio || "1:10",
            dataLimit: plan.data_limit ? Number.parseInt(plan.data_limit) : null,
            dataLimitPeriod: plan.data_limit_period || "monthly",
            fupAction: plan.fup_action || "throttle",
            throttleSpeed: Number.parseInt(plan.fup_speed) || 0,
            taxRate: Number.parseFloat(plan.tax_rate) || 16,
            contractLength: Number.parseInt(plan.contract_period) || 12,
            staticIP: plan.static_ip || false,
            portForwarding: plan.port_forwarding || false,
            prioritySupport: plan.priority_support || false,
            slaGuarantee: Number.parseFloat(plan.sla_guarantee) || 95,
            deviceLimit: Number.parseInt(plan.device_limit) || 10,
            connectionLimit: Number.parseInt(plan.connection_limit) || 100,
            contentFiltering: plan.content_filtering || false,
            portBlocking: plan.port_blocking || [],
            qosPriority: plan.qos_priority || "standard",
            active: plan.is_active !== false,
            customers: Number.parseInt(plan.total_customers) || 0,
            description: plan.description || "",
          }))

          setAvailablePlans(plans)
          if (plans.length > 0) {
            setSelectedPlans(plans.slice(0, Math.min(3, plans.length)).map((p) => p.id))
          }
        }
      } catch (error) {
        console.error("Error fetching service plans:", error)
        toast({
          title: "Error",
          description: "Failed to load service plans",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchServicePlans()
  }, [toast])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service plans...</p>
        </div>
      </div>
    )
  }

  if (availablePlans.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">No service plans available</p>
          <p className="text-sm text-muted-foreground">Create service plans to compare them</p>
        </div>
      </div>
    )
  }

  const filteredPlans = availablePlans.filter((plan) => {
    const typeMatch = filterType === "all" || plan.type === filterType
    const categoryMatch = filterCategory === "all" || plan.category === filterCategory
    return typeMatch && categoryMatch
  })

  const selectedPlanData = selectedPlans
    .map((id) => availablePlans.find((plan) => plan.id === id))
    .filter(Boolean) as ServicePlan[]

  const handlePlanToggle = (planId: number) => {
    if (selectedPlans.includes(planId)) {
      if (selectedPlans.length > 1) {
        setSelectedPlans(selectedPlans.filter((id) => id !== planId))
      } else {
        toast({
          title: "Minimum Selection",
          description: "At least one plan must be selected for comparison.",
          variant: "destructive",
        })
      }
    } else {
      if (selectedPlans.length < 5) {
        setSelectedPlans([...selectedPlans, planId])
      } else {
        toast({
          title: "Maximum Selection",
          description: "You can compare up to 5 plans at once.",
          variant: "destructive",
        })
      }
    }
  }

  const exportComparison = (format: "pdf" | "csv" | "print") => {
    toast({
      title: "Export Started",
      description: `Exporting comparison as ${format.toUpperCase()}...`,
    })
  }

  const speedComparisonData = selectedPlanData.map((plan) => ({
    name: plan.name,
    download: plan.speedDown,
    upload: plan.speedUp,
    guaranteed_down: plan.guaranteedSpeedDown,
    guaranteed_up: plan.guaranteedSpeedUp,
    burst_down: plan.burstSpeedDown,
    burst_up: plan.burstSpeedUp,
  }))

  const priceComparisonData = selectedPlanData.map((plan) => ({
    name: plan.name,
    monthly: plan.price,
    setup: plan.setupFee,
    annual: plan.price * 12 * (1 - (plan.contractLength >= 12 ? 0.1 : 0)),
  }))

  const featureRadarData = [
    {
      feature: "Speed",
      ...Object.fromEntries(selectedPlanData.map((plan) => [plan.name, (plan.speedDown / 500) * 100])),
    },
    { feature: "Reliability", ...Object.fromEntries(selectedPlanData.map((plan) => [plan.name, plan.slaGuarantee])) },
    {
      feature: "Value",
      ...Object.fromEntries(selectedPlanData.map((plan) => [plan.name, Math.max(0, 100 - (plan.price / 300) * 100)])),
    },
    {
      feature: "Features",
      ...Object.fromEntries(
        selectedPlanData.map((plan) => [
          plan.name,
          (plan.staticIP ? 20 : 0) +
            (plan.portForwarding ? 20 : 0) +
            (plan.prioritySupport ? 20 : 0) +
            (plan.dataLimit === null ? 20 : 0) +
            (plan.qosPriority === "premium" ? 20 : plan.qosPriority === "high" ? 15 : 10),
        ]),
      ),
    },
    { feature: "Capacity", ...Object.fromEntries(selectedPlanData.map((plan) => [plan.name, plan.deviceLimit * 2])) },
  ]

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case "Speed":
        return <Zap className="h-4 w-4" />
      case "Price":
        return <DollarSign className="h-4 w-4" />
      case "Data":
        return <Database className="h-4 w-4" />
      case "Support":
        return <Users className="h-4 w-4" />
      case "Security":
        return <Shield className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const getFeatureValue = (plan: ServicePlan, feature: string) => {
    switch (feature) {
      case "Speed":
        return `${plan.speedDown}/${plan.speedUp} Mbps`
      case "Guaranteed Speed":
        return `${plan.guaranteedSpeedDown}/${plan.guaranteedSpeedUp} Mbps`
      case "Burst Speed":
        return `${plan.burstSpeedDown}/${plan.burstSpeedUp} Mbps (${plan.burstDuration}s)`
      case "Price":
        return `$${plan.price}/mo`
      case "Setup Fee":
        return `$${plan.setupFee}`
      case "Data Limit":
        return plan.dataLimit ? `${plan.dataLimit} GB/${plan.dataLimitPeriod}` : "Unlimited"
      case "SLA":
        return `${plan.slaGuarantee}%`
      case "Devices":
        return `${plan.deviceLimit} devices`
      case "Static IP":
        return plan.staticIP ? "Included" : "Not included"
      case "Priority Support":
        return plan.prioritySupport ? "24/7" : "Standard"
      case "QoS Priority":
        return plan.qosPriority.charAt(0).toUpperCase() + plan.qosPriority.slice(1)
      default:
        return "N/A"
    }
  }

  const comparisonFeatures = [
    "Speed",
    "Guaranteed Speed",
    "Burst Speed",
    "Price",
    "Setup Fee",
    "Data Limit",
    "SLA",
    "Devices",
    "Static IP",
    "Priority Support",
    "QoS Priority",
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Service Plan Comparison</h2>
          <p className="text-muted-foreground">Compare service plans side by side to find the best fit</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportComparison("print")}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={() => exportComparison("csv")}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportComparison("pdf")}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparison Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="filter-type">Service Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="dedicated">Dedicated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-category">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="view-type">View Type</Label>
              <Select
                value={comparisonView}
                onValueChange={(value: "table" | "cards" | "chart") => setComparisonView(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table View</SelectItem>
                  <SelectItem value="cards">Card View</SelectItem>
                  <SelectItem value="chart">Chart View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="differences-only"
                checked={showDifferencesOnly}
                onCheckedChange={(checked) => setShowDifferencesOnly(checked as boolean)}
              />
              <Label htmlFor="differences-only">Show differences only</Label>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Select Plans to Compare ({selectedPlans.length}/5)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedPlans.includes(plan.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handlePlanToggle(plan.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{plan.name}</h4>
                    <Checkbox checked={selectedPlans.includes(plan.id)} />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>${plan.price}/mo</div>
                    <div>
                      {plan.speedDown}/{plan.speedUp} Mbps
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {plan.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={comparisonView} onValueChange={(value) => setComparisonView(value as "table" | "cards" | "chart")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="table">Table Comparison</TabsTrigger>
          <TabsTrigger value="cards">Card Comparison</TabsTrigger>
          <TabsTrigger value="chart">Chart Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feature Comparison</CardTitle>
              <CardDescription>Side-by-side comparison of all selected service plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Feature</TableHead>
                      {selectedPlanData.map((plan) => (
                        <TableHead key={plan.id} className="text-center min-w-32">
                          <div className="space-y-1">
                            <div className="font-semibold">{plan.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {plan.type}
                            </Badge>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonFeatures.map((feature) => (
                      <TableRow key={feature}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {getFeatureIcon(feature)}
                          {feature}
                        </TableCell>
                        {selectedPlanData.map((plan) => (
                          <TableCell key={plan.id} className="text-center">
                            {getFeatureValue(plan, feature)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedPlanData.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <Badge variant={plan.qosPriority === "premium" ? "default" : "secondary"}>{plan.qosPriority}</Badge>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold">${plan.price}</div>
                    <div className="text-sm text-muted-foreground">per month</div>
                    <div className="text-xs text-muted-foreground">Setup: ${plan.setupFee}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        Download
                      </span>
                      <span className="text-sm">{plan.speedDown} Mbps</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Upload
                      </span>
                      <span className="text-sm">{plan.speedUp} Mbps</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Zap className="h-4 w-4" />
                        Burst
                      </span>
                      <span className="text-sm">
                        {plan.burstSpeedDown}/{plan.burstSpeedUp} Mbps
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Data Limit</span>
                      <span className="text-sm">{plan.dataLimit ? `${plan.dataLimit} GB` : "Unlimited"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SLA Guarantee</span>
                      <span className="text-sm">{plan.slaGuarantee}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Device Limit</span>
                      <span className="text-sm">{plan.deviceLimit} devices</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Included Features</h4>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        {plan.staticIP ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        Static IP
                      </div>
                      <div className="flex items-center gap-1">
                        {plan.portForwarding ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        Port Forwarding
                      </div>
                      <div className="flex items-center gap-1">
                        {plan.prioritySupport ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        Priority Support
                      </div>
                      <div className="flex items-center gap-1">
                        {plan.contentFiltering ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        Content Filter
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">
                    {(plan.customers || 0).toLocaleString()} active customers
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chart">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Speed Comparison</CardTitle>
                <CardDescription>Download and upload speeds across selected plans</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={speedComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="download" fill="#8884d8" name="Download (Mbps)" />
                    <Bar dataKey="upload" fill="#82ca9d" name="Upload (Mbps)" />
                    <Bar dataKey="guaranteed_down" fill="#ffc658" name="Guaranteed Down (Mbps)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Comparison</CardTitle>
                <CardDescription>Monthly, setup, and annual costs</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priceComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="monthly" fill="#8884d8" name="Monthly ($)" />
                    <Bar dataKey="setup" fill="#82ca9d" name="Setup Fee ($)" />
                    <Bar dataKey="annual" fill="#ffc658" name="Annual ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Analysis</CardTitle>
                <CardDescription>Overall feature comparison across all dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={featureRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="feature" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {selectedPlanData.map((plan, index) => (
                      <Radar
                        key={plan.id}
                        name={plan.name}
                        dataKey={plan.name}
                        stroke={`hsl(${index * 60}, 70%, 50%)`}
                        fill={`hsl(${index * 60}, 70%, 50%)`}
                        fillOpacity={0.1}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Smart Recommendations
          </CardTitle>
          <CardDescription>AI-powered recommendations based on your comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-green-600 mb-2">Best Value</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Standard Home offers the best price-to-performance ratio
              </p>
              <div className="text-xs">
                <div>• 50/10 Mbps for $49.99/mo</div>
                <div>• Port forwarding included</div>
                <div>• 97% SLA guarantee</div>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-blue-600 mb-2">Best Performance</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Enterprise Pro delivers maximum speed and reliability
              </p>
              <div className="text-xs">
                <div>• 500/100 Mbps guaranteed</div>
                <div>• 99.9% SLA guarantee</div>
                <div>• Premium support included</div>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-purple-600 mb-2">Most Popular</h4>
              <p className="text-sm text-muted-foreground mb-2">Standard Home is chosen by most customers</p>
              <div className="text-xs">
                <div>• 2,100 active customers</div>
                <div>• Balanced features</div>
                <div>• Great for families</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

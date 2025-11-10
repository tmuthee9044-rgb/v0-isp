"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Save,
  Info,
  Download,
  DollarSign,
  Zap,
  Shield,
  TrendingUp,
  Settings,
  Gauge,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { toast } from "sonner"

interface EditServicePlanProps {
  params: {
    id: string
  }
}

export default function EditServicePlan({ params }: EditServicePlanProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [basicInfo, setBasicInfo] = useState({
    planName: "",
    description: "",
    serviceType: "",
    category: "",
    status: "active",
  })

  const [speedConfig, setSpeedConfig] = useState({
    downloadSpeed: [100],
    uploadSpeed: [50],
    guaranteedDownload: [80],
    guaranteedUpload: [40],
    burstDownload: [150],
    burstUpload: [75],
    burstDuration: [300],
    aggregationRatio: [4],
    priorityLevel: "standard",
  })

  const [pricingConfig, setPricingConfig] = useState({
    monthlyPrice: "",
    setupFee: "",
    billingCycle: "",
    contractLength: "",
    promoPrice: "",
    promoEnabled: false,
    promoDuration: "",
    currency: "KES",
    taxIncluded: false,
    taxRate: [16],
  })

  const [fupConfig, setFupConfig] = useState({
    enabled: false,
    dataLimit: "",
    limitType: "monthly",
    actionAfterLimit: "throttle",
    throttleSpeed: [10],
    resetDay: "1",
    exemptHours: [],
    exemptDays: [],
    warningThreshold: [80],
  })

  const [qosConfig, setQosConfig] = useState({
    enabled: false,
    bandwidthAllocation: {
      web: [25],
      streaming: [40],
      gaming: [20],
      other: [15],
    },
    trafficShaping: false,
    latencyOptimization: false,
    packetPrioritization: false,
  })

  const [advancedFeatures, setAdvancedFeatures] = useState({
    staticIP: false,
    portForwarding: false,
    vpnAccess: false,
    prioritySupport: false,
    slaGuarantee: false,
    redundancy: false,
    monitoring: false,
    customDNS: false,
  })

  const [restrictions, setRestrictions] = useState({
    contentFiltering: false,
    timeRestrictions: false,
    bandwidthScheduling: false,
    deviceLimit: "",
    concurrentConnections: "",
    portBlocking: [],
  })

  const serviceTypes = [
    { value: "fiber", label: "Fiber Optic", icon: Zap },
    { value: "wireless", label: "Wireless", icon: Zap },
    { value: "satellite", label: "Satellite", icon: Zap },
    { value: "dsl", label: "DSL", icon: Zap },
    { value: "cable", label: "Cable", icon: Zap },
  ]

  const exemptHours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`)

  const blockedPorts = [
    { port: 22, name: "SSH", description: "Secure Shell access" },
    { port: 23, name: "Telnet", description: "Unencrypted remote access" },
    { port: 25, name: "SMTP", description: "Email sending (spam prevention)" },
    { port: 135, name: "RPC", description: "Windows RPC service" },
    { port: 139, name: "NetBIOS", description: "Windows file sharing" },
    { port: 445, name: "SMB", description: "Windows file sharing" },
    { port: 1433, name: "SQL Server", description: "Microsoft SQL Server" },
    { port: 3389, name: "RDP", description: "Remote Desktop Protocol" },
  ]

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/services/${params.id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch service data")
        }

        const serviceData = await response.json()

        setBasicInfo({
          planName: serviceData.name || "",
          description: serviceData.description || "",
          serviceType: serviceData.service_type || "",
          category: serviceData.category || "",
          status: serviceData.status || "active",
        })

        // Parse speed data from database
        const speedParts = serviceData.speed ? serviceData.speed.split("/") : ["100", "50"]
        setSpeedConfig({
          downloadSpeed: [Number.parseInt(speedParts[0]) || 100],
          uploadSpeed: [Number.parseInt(speedParts[1]) || 50],
          guaranteedDownload: [Math.floor((Number.parseInt(speedParts[0]) || 100) * 0.8)],
          guaranteedUpload: [Math.floor((Number.parseInt(speedParts[1]) || 50) * 0.8)],
          burstDownload: [Math.floor((Number.parseInt(speedParts[0]) || 100) * 1.5)],
          burstUpload: [Math.floor((Number.parseInt(speedParts[1]) || 50) * 1.5)],
          burstDuration: [300],
          aggregationRatio: [4],
          priorityLevel: serviceData.priority_level || "standard",
        })

        setPricingConfig({
          monthlyPrice: serviceData.price?.toString() || "",
          setupFee: serviceData.setup_fee?.toString() || "",
          billingCycle: serviceData.billing_cycle || "monthly",
          contractLength: serviceData.contract_length?.toString() || "",
          promoPrice: serviceData.promo_price?.toString() || "",
          promoEnabled: !!serviceData.promo_price,
          promoDuration: serviceData.promo_duration?.toString() || "",
          currency: serviceData.currency || "KES",
          taxIncluded: serviceData.tax_included || false,
          taxRate: [serviceData.tax_rate || 16],
        })

        if (serviceData.fup_config) {
          try {
            const fup =
              typeof serviceData.fup_config === "string"
                ? JSON.parse(serviceData.fup_config)
                : serviceData.fup_config || {}
            setFupConfig({
              enabled: fup.enabled || false,
              dataLimit: fup.dataLimit || "",
              limitType: fup.limitType || "monthly",
              actionAfterLimit: fup.actionAfterLimit || "throttle",
              throttleSpeed: [fup.throttleSpeed || 10],
              resetDay: fup.resetDay || "1",
              exemptHours: fup.exemptHours || [],
              exemptDays: fup.exemptDays || [],
              warningThreshold: [fup.warningThreshold || 80],
            })
          } catch (error) {
            console.error("Error parsing FUP config:", error)
            // Use default FUP config if parsing fails
          }
        }

        if (serviceData.qos_config) {
          try {
            const qos =
              typeof serviceData.qos_config === "string"
                ? JSON.parse(serviceData.qos_config)
                : serviceData.qos_config || {}
            setQosConfig({
              enabled: qos.enabled || false,
              bandwidthAllocation: qos.bandwidthAllocation || {
                web: [25],
                streaming: [40],
                gaming: [20],
                other: [15],
              },
              trafficShaping: qos.trafficShaping || false,
              latencyOptimization: qos.latencyOptimization || false,
              packetPrioritization: qos.packetPrioritization || false,
            })
          } catch (error) {
            console.error("Error parsing QoS config:", error)
            // Use default QoS config if parsing fails
          }
        }

        if (serviceData.advanced_features) {
          try {
            const features =
              typeof serviceData.advanced_features === "string"
                ? JSON.parse(serviceData.advanced_features)
                : serviceData.advanced_features || {}
            setAdvancedFeatures({
              staticIP: features.staticIP || false,
              portForwarding: features.portForwarding || false,
              vpnAccess: features.vpnAccess || false,
              prioritySupport: features.prioritySupport || false,
              slaGuarantee: features.slaGuarantee || false,
              redundancy: features.redundancy || false,
              monitoring: features.monitoring || false,
              customDNS: features.customDNS || false,
            })
          } catch (error) {
            console.error("Error parsing advanced features:", error)
            // Use default advanced features if parsing fails
          }
        }

        if (serviceData.restrictions) {
          try {
            const rest =
              typeof serviceData.restrictions === "string"
                ? JSON.parse(serviceData.restrictions)
                : serviceData.restrictions || {}
            setRestrictions({
              contentFiltering: rest.contentFiltering || false,
              timeRestrictions: rest.timeRestrictions || false,
              bandwidthScheduling: rest.bandwidthScheduling || false,
              deviceLimit: rest.deviceLimit || "",
              concurrentConnections: rest.concurrentConnections || "",
              portBlocking: rest.portBlocking || [],
            })
          } catch (error) {
            console.error("Error parsing restrictions:", error)
            // Use default restrictions if parsing fails
          }
        }
      } catch (error) {
        console.error("Error fetching service data:", error)
        toast.error("Failed to load service data")
        router.push("/services")
      } finally {
        setIsLoading(false)
      }
    }

    fetchServiceData()
  }, [params.id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!basicInfo.planName || !pricingConfig.monthlyPrice) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSaving(true)

    try {
      const formData = {
        name: basicInfo.planName,
        description: basicInfo.description,
        service_type: basicInfo.serviceType,
        category: basicInfo.category,
        status: basicInfo.status,
        download_speed: speedConfig.downloadSpeed[0],
        upload_speed: speedConfig.uploadSpeed[0],
        guaranteed_download: speedConfig.guaranteedDownload[0],
        guaranteed_upload: speedConfig.guaranteedUpload[0],
        burst_download: speedConfig.burstDownload[0],
        burst_upload: speedConfig.burstUpload[0],
        burst_duration: speedConfig.burstDuration[0],
        aggregation_ratio: speedConfig.aggregationRatio[0],
        priority_level: speedConfig.priorityLevel,
        price: Number.parseFloat(pricingConfig.monthlyPrice),
        setup_fee: Number.parseFloat(pricingConfig.setupFee) || 0,
        billing_cycle: pricingConfig.billingCycle,
        contract_length: pricingConfig.contractLength || null,
        currency: pricingConfig.currency,
        tax_included: pricingConfig.taxIncluded,
        tax_rate: pricingConfig.taxRate[0],
        promo_price: pricingConfig.promoEnabled ? Number.parseFloat(pricingConfig.promoPrice) || null : null,
        promo_enabled: pricingConfig.promoEnabled,
        promo_duration: pricingConfig.promoEnabled ? pricingConfig.promoDuration || null : null,
        fup_enabled: fupConfig.enabled,
        data_limit: fupConfig.enabled ? Number.parseInt(fupConfig.dataLimit) || null : null,
        limit_type: fupConfig.limitType,
        action_after_limit: fupConfig.actionAfterLimit,
        throttle_speed: fupConfig.enabled ? fupConfig.throttleSpeed[0] : null,
        reset_day: fupConfig.resetDay,
        warning_threshold: fupConfig.warningThreshold[0],
        advanced_features: advancedFeatures,
        qos_config: qosConfig,
        restrictions: restrictions,
      }

      const response = await fetch(`/api/services/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update service plan")
      }

      toast.success("Service plan updated successfully!")
      router.push("/services")
    } catch (error) {
      console.error("[v0] Error updating service plan:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update service plan")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading service data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/services")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Service Plan</h1>
            <p className="text-muted-foreground">Update service plan configuration and pricing</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Updating..." : "Update Service Plan"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="speed">Speed & QoS</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Tax</TabsTrigger>
            <TabsTrigger value="fup">Fair Usage</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Basic Service Information
                </CardTitle>
                <CardDescription>Update the core details of your service plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="planName">Service Plan Name *</Label>
                    <Input
                      id="planName"
                      placeholder="e.g., Premium Fiber 100Mbps"
                      value={basicInfo.planName}
                      onChange={(e) => setBasicInfo({ ...basicInfo, planName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Type *</Label>
                    <Select
                      value={basicInfo.serviceType}
                      onValueChange={(value) => setBasicInfo({ ...basicInfo, serviceType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Service Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the service plan features, benefits, and target audience"
                    value={basicInfo.description}
                    onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Service Category</Label>
                    <Select
                      value={basicInfo.category}
                      onValueChange={(value) => setBasicInfo({ ...basicInfo, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic Plans</SelectItem>
                        <SelectItem value="standard">Standard Plans</SelectItem>
                        <SelectItem value="premium">Premium Plans</SelectItem>
                        <SelectItem value="enterprise">Enterprise Plans</SelectItem>
                        <SelectItem value="custom">Custom Solutions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Service Status</Label>
                    <Select
                      value={basicInfo.status}
                      onValueChange={(value) => setBasicInfo({ ...basicInfo, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Speed & QoS Tab */}
          <TabsContent value="speed" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-green-600" />
                    Speed Configuration
                  </CardTitle>
                  <CardDescription>Configure download and upload speeds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Download Speed: {speedConfig.downloadSpeed[0]} Mbps</Label>
                      <Slider
                        value={speedConfig.downloadSpeed}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, downloadSpeed: value })}
                        max={1000}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Upload Speed: {speedConfig.uploadSpeed[0]} Mbps</Label>
                      <Slider
                        value={speedConfig.uploadSpeed}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, uploadSpeed: value })}
                        max={500}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Guaranteed Speeds
                  </CardTitle>
                  <CardDescription>Minimum guaranteed performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Guaranteed Download: {speedConfig.guaranteedDownload[0]} Mbps</Label>
                      <Slider
                        value={speedConfig.guaranteedDownload}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, guaranteedDownload: value })}
                        max={speedConfig.downloadSpeed[0]}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Guaranteed Upload: {speedConfig.guaranteedUpload[0]} Mbps</Label>
                      <Slider
                        value={speedConfig.guaranteedUpload}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, guaranteedUpload: value })}
                        max={speedConfig.uploadSpeed[0]}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Burst & Aggregation Settings
                </CardTitle>
                <CardDescription>Configure speed bursting and aggregation ratios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Burst Configuration</h4>
                    <div className="space-y-2">
                      <Label>Burst Download: {speedConfig.burstDownload[0]} Mbps</Label>
                      <Slider
                        value={speedConfig.burstDownload}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, burstDownload: value })}
                        max={speedConfig.downloadSpeed[0] * 2}
                        min={speedConfig.downloadSpeed[0]}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Burst Upload: {speedConfig.burstUpload[0]} Mbps</Label>
                      <Slider
                        value={speedConfig.burstUpload}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, burstUpload: value })}
                        max={speedConfig.uploadSpeed[0] * 2}
                        min={speedConfig.uploadSpeed[0]}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Burst Duration: {speedConfig.burstDuration[0]} seconds</Label>
                      <Slider
                        value={speedConfig.burstDuration}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, burstDuration: value })}
                        max={600}
                        min={30}
                        step={30}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Aggregation & Priority</h4>
                    <div className="space-y-2">
                      <Label>Aggregation Ratio: 1:{speedConfig.aggregationRatio[0]}</Label>
                      <Slider
                        value={speedConfig.aggregationRatio}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, aggregationRatio: value })}
                        max={20}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Higher ratios allow more oversubscription</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Traffic Priority Level</Label>
                      <Select
                        value={speedConfig.priorityLevel}
                        onValueChange={(value) => setSpeedConfig({ ...speedConfig, priorityLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="standard">Standard Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="premium">Premium Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-orange-600" />
                  Quality of Service (QoS)
                </CardTitle>
                <CardDescription>Advanced traffic management and optimization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="qosEnabled"
                    checked={qosConfig.enabled}
                    onCheckedChange={(checked) => setQosConfig({ ...qosConfig, enabled: checked })}
                  />
                  <Label htmlFor="qosEnabled">Enable QoS Management</Label>
                </div>

                {qosConfig.enabled && (
                  <div className="space-y-6 pl-6 border-l-2 border-blue-200">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <h4 className="font-medium">Bandwidth Allocation</h4>
                        <div className="space-y-2">
                          <Label>Web Browsing: {qosConfig.bandwidthAllocation.web[0]}%</Label>
                          <Slider
                            value={qosConfig.bandwidthAllocation.web}
                            onValueChange={(value) =>
                              setQosConfig({
                                ...qosConfig,
                                bandwidthAllocation: { ...qosConfig.bandwidthAllocation, web: value },
                              })
                            }
                            max={100}
                            min={0}
                            step={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Streaming: {qosConfig.bandwidthAllocation.streaming[0]}%</Label>
                          <Slider
                            value={qosConfig.bandwidthAllocation.streaming}
                            onValueChange={(value) =>
                              setQosConfig({
                                ...qosConfig,
                                bandwidthAllocation: { ...qosConfig.bandwidthAllocation, streaming: value },
                              })
                            }
                            max={100}
                            min={0}
                            step={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gaming: {qosConfig.bandwidthAllocation.gaming[0]}%</Label>
                          <Slider
                            value={qosConfig.bandwidthAllocation.gaming}
                            onValueChange={(value) =>
                              setQosConfig({
                                ...qosConfig,
                                bandwidthAllocation: { ...qosConfig.bandwidthAllocation, gaming: value },
                              })
                            }
                            max={100}
                            min={0}
                            step={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Other: {qosConfig.bandwidthAllocation.other[0]}%</Label>
                          <Slider
                            value={qosConfig.bandwidthAllocation.other}
                            onValueChange={(value) =>
                              setQosConfig({
                                ...qosConfig,
                                bandwidthAllocation: { ...qosConfig.bandwidthAllocation, other: value },
                              })
                            }
                            max={100}
                            min={0}
                            step={5}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-medium">Advanced QoS Features</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="trafficShaping"
                              checked={qosConfig.trafficShaping}
                              onCheckedChange={(checked) => setQosConfig({ ...qosConfig, trafficShaping: checked })}
                            />
                            <Label htmlFor="trafficShaping">Traffic Shaping</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="latencyOptimization"
                              checked={qosConfig.latencyOptimization}
                              onCheckedChange={(checked) =>
                                setQosConfig({ ...qosConfig, latencyOptimization: checked })
                              }
                            />
                            <Label htmlFor="latencyOptimization">Latency Optimization</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="packetPrioritization"
                              checked={qosConfig.packetPrioritization}
                              onCheckedChange={(checked) =>
                                setQosConfig({ ...qosConfig, packetPrioritization: checked })
                              }
                            />
                            <Label htmlFor="packetPrioritization">Packet Prioritization</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing & Tax Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Pricing Structure
                  </CardTitle>
                  <CardDescription>Configure service pricing and billing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyPrice">Monthly Price *</Label>
                      <Input
                        id="monthlyPrice"
                        type="number"
                        step="0.01"
                        placeholder="99.99"
                        value={pricingConfig.monthlyPrice}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, monthlyPrice: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="setupFee">Setup/Installation Fee</Label>
                      <Input
                        id="setupFee"
                        type="number"
                        step="0.01"
                        placeholder="50.00"
                        value={pricingConfig.setupFee}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, setupFee: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="billingCycle">Billing Cycle</Label>
                      <Select
                        value={pricingConfig.billingCycle}
                        onValueChange={(value) => setPricingConfig({ ...pricingConfig, billingCycle: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select billing cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                          <SelectItem value="semi-annual">Semi-Annual (6 months)</SelectItem>
                          <SelectItem value="annual">Annual (12 months)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={pricingConfig.currency}
                        onValueChange={(value) => setPricingConfig({ ...pricingConfig, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contractLength">Contract Length</Label>
                      <Select
                        value={pricingConfig.contractLength}
                        onValueChange={(value) => setPricingConfig({ ...pricingConfig, contractLength: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select contract length" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Contract</SelectItem>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="12">12 Months</SelectItem>
                          <SelectItem value="24">24 Months</SelectItem>
                          <SelectItem value="36">36 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    Promotional Pricing & Tax
                  </CardTitle>
                  <CardDescription>Configure promotions and tax settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="promoEnabled"
                      checked={pricingConfig.promoEnabled}
                      onCheckedChange={(checked) => setPricingConfig({ ...pricingConfig, promoEnabled: checked })}
                    />
                    <Label htmlFor="promoEnabled">Enable Promotional Pricing</Label>
                  </div>

                  {pricingConfig.promoEnabled && (
                    <div className="space-y-4 pl-6 border-l-2 border-orange-200">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="promoPrice">Promotional Price</Label>
                          <Input
                            id="promoPrice"
                            type="number"
                            step="0.01"
                            placeholder="79.99"
                            value={pricingConfig.promoPrice}
                            onChange={(e) => setPricingConfig({ ...pricingConfig, promoPrice: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promoDuration">Promo Duration (months)</Label>
                          <Input
                            id="promoDuration"
                            type="number"
                            placeholder="3"
                            value={pricingConfig.promoDuration}
                            onChange={(e) => setPricingConfig({ ...pricingConfig, promoDuration: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Tax Configuration</h4>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="taxIncluded"
                        checked={pricingConfig.taxIncluded}
                        onCheckedChange={(checked) => setPricingConfig({ ...pricingConfig, taxIncluded: checked })}
                      />
                      <Label htmlFor="taxIncluded">Price includes tax</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate: {pricingConfig.taxRate[0]}%</Label>
                      <Slider
                        value={pricingConfig.taxRate}
                        onValueChange={(value) => setPricingConfig({ ...pricingConfig, taxRate: value })}
                        max={30}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fup" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-red-600" />
                  Fair Usage Policy (FUP)
                </CardTitle>
                <CardDescription>Configure data limits and usage policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="fupEnabled"
                    checked={fupConfig.enabled}
                    onCheckedChange={(checked) => setFupConfig({ ...fupConfig, enabled: checked })}
                  />
                  <Label htmlFor="fupEnabled">Enable Fair Usage Policy</Label>
                </div>

                {fupConfig.enabled && (
                  <div className="space-y-6 pl-6 border-l-2 border-red-200">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="dataLimit">Data Limit (GB)</Label>
                        <Input
                          id="dataLimit"
                          type="number"
                          placeholder="500"
                          value={fupConfig.dataLimit}
                          onChange={(e) => setFupConfig({ ...fupConfig, dataLimit: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="limitType">Limit Period</Label>
                        <Select
                          value={fupConfig.limitType}
                          onValueChange={(value) => setFupConfig({ ...fupConfig, limitType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="billing-cycle">Per Billing Cycle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="actionAfterLimit">Action After Limit</Label>
                        <Select
                          value={fupConfig.actionAfterLimit}
                          onValueChange={(value) => setFupConfig({ ...fupConfig, actionAfterLimit: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="throttle">Throttle Speed</SelectItem>
                            <SelectItem value="suspend">Suspend Service</SelectItem>
                            <SelectItem value="charge">Additional Charges</SelectItem>
                            <SelectItem value="notify">Notify Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="resetDay">Reset Day (Monthly)</Label>
                        <Select
                          value={fupConfig.resetDay}
                          onValueChange={(value) => setFupConfig({ ...fupConfig, resetDay: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {fupConfig.actionAfterLimit === "throttle" && (
                      <div className="space-y-2">
                        <Label>Throttle Speed: {fupConfig.throttleSpeed[0]} Mbps</Label>
                        <Slider
                          value={fupConfig.throttleSpeed}
                          onValueChange={(value) => setFupConfig({ ...fupConfig, throttleSpeed: value })}
                          max={50}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Warning Threshold: {fupConfig.warningThreshold[0]}%</Label>
                      <Slider
                        value={fupConfig.warningThreshold}
                        onValueChange={(value) => setFupConfig({ ...fupConfig, warningThreshold: value })}
                        max={100}
                        min={50}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Send warning when usage reaches this percentage</p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Exempt Hours (No FUP Applied)</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {exemptHours.map((hour) => (
                          <div key={hour} className="flex items-center space-x-2">
                            <Checkbox
                              id={`hour-${hour}`}
                              checked={fupConfig.exemptHours.includes(hour)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFupConfig({
                                    ...fupConfig,
                                    exemptHours: [...fupConfig.exemptHours, hour],
                                  })
                                } else {
                                  setFupConfig({
                                    ...fupConfig,
                                    exemptHours: fupConfig.exemptHours.filter((h) => h !== hour),
                                  })
                                }
                              }}
                            />
                            <Label htmlFor={`hour-${hour}`} className="text-xs">
                              {hour}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Exempt Days</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day}`}
                              checked={fupConfig.exemptDays.includes(day)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFupConfig({
                                    ...fupConfig,
                                    exemptDays: [...fupConfig.exemptDays, day],
                                  })
                                } else {
                                  setFupConfig({
                                    ...fupConfig,
                                    exemptDays: fupConfig.exemptDays.filter((d) => d !== day),
                                  })
                                }
                              }}
                            />
                            <Label htmlFor={`day-${day}`} className="text-xs">
                              {day}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  Advanced Service Features
                </CardTitle>
                <CardDescription>Premium features and add-ons for this service plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Network Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="staticIP">Static IP Address</Label>
                          <p className="text-xs text-muted-foreground">Dedicated IP address</p>
                        </div>
                        <Switch
                          id="staticIP"
                          checked={advancedFeatures.staticIP}
                          onCheckedChange={(checked) => setAdvancedFeatures({ ...advancedFeatures, staticIP: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="portForwarding">Port Forwarding</Label>
                          <p className="text-xs text-muted-foreground">Advanced port management</p>
                        </div>
                        <Switch
                          id="portForwarding"
                          checked={advancedFeatures.portForwarding}
                          onCheckedChange={(checked) =>
                            setAdvancedFeatures({ ...advancedFeatures, portForwarding: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="customDNS">Custom DNS Settings</Label>
                          <p className="text-xs text-muted-foreground">Allow custom DNS servers</p>
                        </div>
                        <Switch
                          id="customDNS"
                          checked={advancedFeatures.customDNS}
                          onCheckedChange={(checked) =>
                            setAdvancedFeatures({ ...advancedFeatures, customDNS: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="vpnAccess">VPN Access</Label>
                          <p className="text-xs text-muted-foreground">Built-in VPN service</p>
                        </div>
                        <Switch
                          id="vpnAccess"
                          checked={advancedFeatures.vpnAccess}
                          onCheckedChange={(checked) =>
                            setAdvancedFeatures({ ...advancedFeatures, vpnAccess: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Service Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="prioritySupport">Priority Support</Label>
                          <p className="text-xs text-muted-foreground">24/7 premium support</p>
                        </div>
                        <Switch
                          id="prioritySupport"
                          checked={advancedFeatures.prioritySupport}
                          onCheckedChange={(checked) =>
                            setAdvancedFeatures({ ...advancedFeatures, prioritySupport: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="slaGuarantee">SLA Guarantee</Label>
                          <p className="text-xs text-muted-foreground">Service level agreement</p>
                        </div>
                        <Switch
                          id="slaGuarantee"
                          checked={advancedFeatures.slaGuarantee}
                          onCheckedChange={(checked) =>
                            setAdvancedFeatures({ ...advancedFeatures, slaGuarantee: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="redundancy">Network Redundancy</Label>
                          <p className="text-xs text-muted-foreground">Backup connection paths</p>
                        </div>
                        <Switch
                          id="redundancy"
                          checked={advancedFeatures.redundancy}
                          onCheckedChange={(checked) =>
                            setAdvancedFeatures({ ...advancedFeatures, redundancy: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="monitoring">Advanced Monitoring</Label>
                          <p className="text-xs text-muted-foreground">Real-time performance monitoring</p>
                        </div>
                        <Switch
                          id="monitoring"
                          checked={advancedFeatures.monitoring}
                          onCheckedChange={(checked) =>
                            setAdvancedFeatures({ ...advancedFeatures, monitoring: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Service Restrictions & Limitations
                </CardTitle>
                <CardDescription>Configure service limitations and security restrictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Content & Access Restrictions</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="contentFiltering">Content Filtering</Label>
                          <p className="text-xs text-muted-foreground">Block inappropriate content</p>
                        </div>
                        <Switch
                          id="contentFiltering"
                          checked={restrictions.contentFiltering}
                          onCheckedChange={(checked) => setRestrictions({ ...restrictions, contentFiltering: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="timeRestrictions">Time-based Restrictions</Label>
                          <p className="text-xs text-muted-foreground">Limit access during certain hours</p>
                        </div>
                        <Switch
                          id="timeRestrictions"
                          checked={restrictions.timeRestrictions}
                          onCheckedChange={(checked) => setRestrictions({ ...restrictions, timeRestrictions: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="bandwidthScheduling">Bandwidth Scheduling</Label>
                          <p className="text-xs text-muted-foreground">Different speeds at different times</p>
                        </div>
                        <Switch
                          id="bandwidthScheduling"
                          checked={restrictions.bandwidthScheduling}
                          onCheckedChange={(checked) =>
                            setRestrictions({ ...restrictions, bandwidthScheduling: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Connection Limits</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="deviceLimit">Maximum Devices</Label>
                        <Input
                          id="deviceLimit"
                          type="number"
                          placeholder="10"
                          value={restrictions.deviceLimit}
                          onChange={(e) => setRestrictions({ ...restrictions, deviceLimit: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Maximum number of connected devices</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="concurrentConnections">Concurrent Connections</Label>
                        <Input
                          id="concurrentConnections"
                          type="number"
                          placeholder="100"
                          value={restrictions.concurrentConnections}
                          onChange={(e) => setRestrictions({ ...restrictions, concurrentConnections: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Maximum simultaneous connections</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Port Blocking</h4>
                  <p className="text-sm text-muted-foreground">Select ports to block for security</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {blockedPorts.map((port) => (
                      <div key={port.port} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Checkbox
                          id={`port-${port.port}`}
                          checked={restrictions.portBlocking.includes(port.port)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRestrictions({
                                ...restrictions,
                                portBlocking: [...restrictions.portBlocking, port.port],
                              })
                            } else {
                              setRestrictions({
                                ...restrictions,
                                portBlocking: restrictions.portBlocking.filter((p) => p !== port.port),
                              })
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`port-${port.port}`} className="font-medium">
                            Port {port.port} - {port.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">{port.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Service Plan Review
                </CardTitle>
                <CardDescription>Review all configurations before updating the service plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Basic Information</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Plan Name:</span> {basicInfo.planName || "Not set"}
                        </p>
                        <p>
                          <span className="font-medium">Service Type:</span> {basicInfo.serviceType || "Not set"}
                        </p>
                        <p>
                          <span className="font-medium">Category:</span> {basicInfo.category || "Not set"}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span> {basicInfo.status}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Speed Configuration</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Download Speed:</span> {speedConfig.downloadSpeed[0]} Mbps
                        </p>
                        <p>
                          <span className="font-medium">Upload Speed:</span> {speedConfig.uploadSpeed[0]} Mbps
                        </p>
                        <p>
                          <span className="font-medium">Guaranteed Download:</span> {speedConfig.guaranteedDownload[0]}{" "}
                          Mbps
                        </p>
                        <p>
                          <span className="font-medium">Guaranteed Upload:</span> {speedConfig.guaranteedUpload[0]} Mbps
                        </p>
                        <p>
                          <span className="font-medium">Burst Download:</span> {speedConfig.burstDownload[0]} Mbps
                        </p>
                        <p>
                          <span className="font-medium">Burst Upload:</span> {speedConfig.burstUpload[0]} Mbps
                        </p>
                        <p>
                          <span className="font-medium">Aggregation Ratio:</span> 1:{speedConfig.aggregationRatio[0]}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Pricing & Tax</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Monthly Price:</span> {pricingConfig.currency}{" "}
                          {pricingConfig.monthlyPrice || "0.00"}
                        </p>
                        <p>
                          <span className="font-medium">Setup Fee:</span> {pricingConfig.currency}{" "}
                          {pricingConfig.setupFee || "0.00"}
                        </p>
                        <p>
                          <span className="font-medium">Tax Rate:</span> {pricingConfig.taxRate[0]}%
                        </p>
                        <p>
                          <span className="font-medium">Tax Included:</span> {pricingConfig.taxIncluded ? "Yes" : "No"}
                        </p>
                        <p>
                          <span className="font-medium">Billing Cycle:</span> {pricingConfig.billingCycle || "Not set"}
                        </p>
                        <p>
                          <span className="font-medium">Contract Length:</span> {pricingConfig.contractLength || "0"}{" "}
                          months
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Fair Usage Policy</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Enabled:</span> {fupConfig.enabled ? "Yes" : "No"}
                        </p>
                        {fupConfig.enabled && (
                          <>
                            <p>
                              <span className="font-medium">Data Limit:</span> {fupConfig.dataLimit || "Unlimited"} GB
                            </p>
                            <p>
                              <span className="font-medium">Limit Type:</span> {fupConfig.limitType}
                            </p>
                            <p>
                              <span className="font-medium">Action After Limit:</span> {fupConfig.actionAfterLimit}
                            </p>
                            <p>
                              <span className="font-medium">Warning Threshold:</span> {fupConfig.warningThreshold[0]}%
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Advanced Features</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Static IP:</span> {advancedFeatures.staticIP ? "Yes" : "No"}
                        </p>
                        <p>
                          <span className="font-medium">Port Forwarding:</span>{" "}
                          {advancedFeatures.portForwarding ? "Yes" : "No"}
                        </p>
                        <p>
                          <span className="font-medium">VPN Access:</span> {advancedFeatures.vpnAccess ? "Yes" : "No"}
                        </p>
                        <p>
                          <span className="font-medium">Priority Support:</span>{" "}
                          {advancedFeatures.prioritySupport ? "Yes" : "No"}
                        </p>
                        <p>
                          <span className="font-medium">SLA Guarantee:</span>{" "}
                          {advancedFeatures.slaGuarantee ? "Yes" : "No"}
                        </p>
                        <p>
                          <span className="font-medium">Network Redundancy:</span>{" "}
                          {advancedFeatures.redundancy ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">QoS Configuration</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">QoS Enabled:</span> {qosConfig.enabled ? "Yes" : "No"}
                        </p>
                        {qosConfig.enabled && (
                          <>
                            <p>
                              <span className="font-medium">Traffic Shaping:</span>{" "}
                              {qosConfig.trafficShaping ? "Yes" : "No"}
                            </p>
                            <p>
                              <span className="font-medium">Latency Optimization:</span>{" "}
                              {qosConfig.latencyOptimization ? "Yes" : "No"}
                            </p>
                            <p>
                              <span className="font-medium">Packet Prioritization:</span>{" "}
                              {qosConfig.packetPrioritization ? "Yes" : "No"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Configuration Summary</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        This service plan includes comprehensive ISP features with advanced speed management, fair usage
                        policies, QoS controls, and security restrictions. All configurations will be applied when the
                        plan is updated.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}

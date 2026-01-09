"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  Building2,
  MapPin,
  Phone,
  Globe,
  Palette,
  FileText,
  Save,
  TestTube,
  Shield,
  Lock,
  Eye,
  AlertCircle,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  getCompanySettings,
  updateCompanySettings,
  getContentData,
  updateContentData,
} from "@/app/actions/company-settings-actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ContentData {
  terms: any
  privacy: any
}

interface Location {
  id: string
  name: string
  address: string
  city: string
  region: string
  description: string
  status: "active" | "inactive"
  router_count?: number
}

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState("basic")
  const [isLoading, setIsLoading] = useState(false)
  const [contentData, setContentData] = useState<ContentData>({ terms: null, privacy: null })
  const [isSavingContent, setIsSavingContent] = useState(false)
  const [companySettings, setCompanySettings] = useState<Record<string, any>>({})
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Locations Tab State
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  useEffect(() => {
    loadCompanySettings()
  }, [])

  const loadCompanySettings = async () => {
    try {
      const settings = await getCompanySettings()
      setCompanySettings(settings)
    } catch (error) {
      console.error("Error loading company settings:", error)
    }
  }

  useEffect(() => {
    if (activeTab === "localization") {
      loadContentData()
    }
  }, [activeTab])

  const loadContentData = async () => {
    try {
      const [termsData, privacyData] = await Promise.all([getContentData("terms"), getContentData("privacy")])

      setContentData({
        terms: termsData || getDefaultTermsContent(),
        privacy: privacyData || getDefaultPrivacyContent(),
      })
    } catch (error) {
      console.error("[v0] Error loading content:", error)
      setContentData({
        terms: getDefaultTermsContent(),
        privacy: getDefaultPrivacyContent(),
      })
    }
  }

  const getDefaultTermsContent = () => ({
    title: "Terms of Service",
    lastUpdated: new Date().toLocaleDateString(),
    content: {
      introduction:
        "Welcome to TechConnect ISP. These Terms of Service govern your use of our internet services and website.",
      serviceDescription:
        "TechConnect ISP provides high-speed internet connectivity services to residential and business customers.",
      userResponsibilities:
        "As a customer, you agree to use our services in compliance with all applicable laws and regulations.",
      paymentTerms: "Service fees are billed monthly in advance. Payment is due within 30 days of the invoice date.",
      serviceAvailability: "While we strive to provide continuous service, we do not guarantee 100% uptime.",
      privacyPolicy:
        "Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.",
      termination: "Either party may terminate this agreement with 30 days written notice.",
      limitation:
        "Our liability is limited to the monthly service fee. We are not liable for indirect, incidental, or consequential damages.",
      changes:
        "We may modify these Terms at any time. Changes will be posted on our website and take effect 30 days after posting.",
      contact:
        "If you have questions about these Terms, please contact us at legal@techconnect.co.ke or call our customer service at +254 712 345 678.",
    },
  })

  const getDefaultPrivacyContent = () => ({
    title: "Privacy Policy",
    lastUpdated: new Date().toLocaleDateString(),
    content: {
      introduction: "At TechConnect ISP, we are committed to protecting your privacy and personal information.",
      informationCollection:
        "We collect information you provide directly to us, such as when you create an account, contact customer service, or use our services.",
      informationUse:
        "We use your information to provide and maintain our services, process payments and billing, and communicate with you about your account.",
      informationSharing: "We do not sell, trade, or rent your personal information to third parties.",
      dataSecurity:
        "We implement appropriate technical and organizational security measures to protect your personal information.",
      cookies: "Our website uses cookies and similar technologies to enhance your browsing experience.",
      userRights:
        "You have the right to access and review your personal information, request corrections to inaccurate information.",
      dataRetention:
        "We retain your personal information for as long as necessary to provide our services and comply with legal obligations.",
      childrenPrivacy: "Our services are not intended for children under 13 years of age.",
      changes: "We may update this Privacy Policy from time to time. We will notify you of any material changes.",
      contact:
        "If you have questions about this Privacy Policy, please contact our Data Protection Officer at privacy@techconnect.co.ke.",
    },
  })

  const saveContent = async (type: "terms" | "privacy", content: any) => {
    setIsSavingContent(true)
    try {
      const result = await updateContentData(type, content)

      if (result.success) {
        toast.success(result.message)
        loadContentData() // Reload to get updated timestamps
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Failed to save ${type === "terms" ? "Terms of Service" : "Privacy Policy"}. Please try again.`)
    } finally {
      setIsSavingContent(false)
    }
  }

  const updateContentField = (type: "terms" | "privacy", section: string, value: string) => {
    setContentData((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        content: {
          ...prev[type].content,
          [section]: value,
        },
      },
    }))
  }

  const handleSave = async (formData: FormData) => {
    const companyName = formData.get("company_name") as string

    if (!companyName || companyName.trim() === "") {
      setMessage({ type: "error", text: "Company name is required" })
      setIsLoading(false)
      return
    }

    console.log("[v0] Submitting form with company name:", companyName)
    setIsLoading(true)
    setMessage(null)

    const result = await updateCompanySettings(formData)

    if (result.success) {
      setMessage({ type: "success", text: result.message })
    } else {
      setMessage({ type: "error", text: result.message })
    }

    setIsLoading(false)
  }

  const handleFileUpload = async (file: File, type: "logo" | "favicon" | "template") => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        toast.success(`${type} uploaded successfully`)
        loadCompanySettings()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Failed to upload ${type}`)
    }
  }

  // Locations Tab Functions
  useEffect(() => {
    if (activeTab === "locations") {
      fetchLocations()
    }
  }, [activeTab])

  const fetchLocations = async () => {
    setLoadingLocations(true)
    try {
      const response = await fetch("/api/locations")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations)
      } else {
        console.error("Invalid locations data:", data)
        setLocations([]) // Ensure locations is always an array
        toast.error("Failed to load locations")
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
      setLocations([]) // Ensure locations is always an array
      toast.error("Failed to load locations")
    } finally {
      setLoadingLocations(false)
    }
  }

  const handleLocationSubmit = async (event: any) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.target)
    const locationData = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      region: formData.get("region") as string,
      description: formData.get("description") as string,
      status: formData.get("status") as string,
    }

    try {
      const url = "/api/locations"
      const method = editingLocation ? "PUT" : "POST"
      const body = editingLocation ? { ...locationData, id: editingLocation.id } : locationData

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body), // Fixed typo from JSON.JSON.stringify
      })

      const data = await response.json()

      if (data.success) {
        if (editingLocation) {
          setLocations(locations.map((location) => (location.id === editingLocation.id ? data.location : location)))
          toast.success("Location updated successfully")
        } else {
          setLocations([...locations, data.location])
          toast.success("Location added successfully")
        }
      } else {
        toast.error(data.error || "Failed to save location")
      }
    } catch (error) {
      console.error("Error saving location:", error)
      toast.error("Failed to save location. Please try again.")
    } finally {
      setIsLoading(false)
      setShowAddLocation(false)
      setEditingLocation(null)
    }
  }

  const deleteLocation = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/locations?id=${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        setLocations(locations.filter((location) => location.id !== id))
        toast.success("Location deleted successfully")
      } else {
        toast.error(data.error || "Failed to delete location")
      }
    } catch (error) {
      console.error("Error deleting location:", error)
      toast.error("Failed to delete location. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const editLocation = (location: Location) => {
    setEditingLocation(location)
    setShowAddLocation(true)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Company Profile</h2>
          <p className="text-muted-foreground">Manage your company information, branding, and contact details</p>
        </div>
        <div className="flex items-center space-x-2">
          {message && (
            <Badge
              variant={message.type === "success" ? "default" : "destructive"}
              className={message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
            >
              {message.text}
            </Badge>
          )}
          <Badge variant="default" className="bg-green-100 text-green-800">
            Configured
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="localization">Localization</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <form action={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Company Information</span>
                </CardTitle>
                <CardDescription>Basic company details that appear throughout the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      name="company_name"
                      placeholder="Your ISP Company Name"
                      defaultValue={companySettings.company_name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trading-name">Trading Name</Label>
                    <Input
                      id="trading-name"
                      name="trading_name"
                      placeholder="Trading or DBA name"
                      defaultValue={companySettings.company_trading_name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration-number">Registration Number</Label>
                    <Input
                      id="registration-number"
                      name="registration_number"
                      placeholder="Company registration number"
                      defaultValue={companySettings.company_registration_number || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-number">Tax ID/VAT Number</Label>
                    <Input
                      id="tax-number"
                      name="tax_number"
                      placeholder="Tax identification number"
                      defaultValue={companySettings.company_tax_number || ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Company Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief description of your company"
                    defaultValue={companySettings.company_description || ""}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select name="industry" defaultValue={companySettings.company_industry || "telecommunications"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telecommunications">Telecommunications</SelectItem>
                        <SelectItem value="internet-services">Internet Services</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-size">Company Size</Label>
                    <Select name="company_size" defaultValue={companySettings.company_size || "medium"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">1-50 employees</SelectItem>
                        <SelectItem value="medium">51-200 employees</SelectItem>
                        <SelectItem value="large">201+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founded-year">Founded Year</Label>
                    <Input
                      id="founded-year"
                      name="founded_year"
                      type="number"
                      placeholder="2020"
                      defaultValue={companySettings.company_founded_year || ""}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <form action={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Logo & Branding</span>
                </CardTitle>
                <CardDescription>Upload your company logo and configure branding elements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Company Logo</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="logo-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file, "logo")
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById("logo-upload")?.click()}
                          >
                            Upload Logo
                          </Button>
                          <p className="mt-2 text-sm text-gray-500">PNG, JPG up to 2MB (Recommended: 200x80px)</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Favicon</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="mt-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="favicon-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file, "favicon")
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById("favicon-upload")?.click()}
                          >
                            Upload Favicon
                          </Button>
                          <p className="mt-1 text-xs text-gray-500">ICO, PNG 32x32px</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Brand Colors</Label>
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded border"></div>
                          <div className="flex-1">
                            <Label className="text-sm">Primary Color</Label>
                            <Input
                              name="primary_color"
                              defaultValue={companySettings.branding_primary_color || "#2563eb"}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-600 rounded border"></div>
                          <div className="flex-1">
                            <Label className="text-sm">Secondary Color</Label>
                            <Input
                              name="secondary_color"
                              defaultValue={companySettings.branding_secondary_color || "#4b5563"}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-600 rounded border"></div>
                          <div className="flex-1">
                            <Label className="text-sm">Accent Color</Label>
                            <Input
                              name="accent_color"
                              defaultValue={companySettings.branding_accent_color || "#16a34a"}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Document Templates</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Invoice Template</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept=".docx,.pdf"
                            className="hidden"
                            id="invoice-template-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file, "template")
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                            onClick={() => document.getElementById("invoice-template-upload")?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Template
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full">
                            <TestTube className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Letterhead</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept=".docx,.pdf"
                            className="hidden"
                            id="letterhead-template-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file, "template")
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                            onClick={() => document.getElementById("letterhead-template-upload")?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Template
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full">
                            <TestTube className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Receipt Template</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept=".docx,.pdf"
                            className="hidden"
                            id="receipt-template-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file, "template")
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                            onClick={() => document.getElementById("receipt-template-upload")?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Template
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full">
                            <TestTube className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <form action={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Contact Information</span>
                </CardTitle>
                <CardDescription>Contact details for customer communications and legal documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-phone">Primary Phone *</Label>
                      <Input
                        id="primary-phone"
                        name="primary_phone"
                        placeholder="+254 700 000 000"
                        defaultValue={companySettings.primary_phone || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-phone">Secondary Phone</Label>
                      <Input
                        id="secondary-phone"
                        name="secondary_phone"
                        placeholder="+254 700 000 000"
                        defaultValue={companySettings.contact_secondary_phone || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primary-email">Primary Email *</Label>
                      <Input
                        id="primary-email"
                        name="primary_email"
                        type="email"
                        placeholder="info@company.com"
                        defaultValue={companySettings.primary_email || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Support Email</Label>
                      <Input
                        id="support-email"
                        name="support_email"
                        type="email"
                        placeholder="support@company.com"
                        defaultValue={companySettings.contact_support_email || ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        placeholder="https://www.company.com"
                        defaultValue={companySettings.website || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-facebook">Facebook</Label>
                      <Input
                        id="social-facebook"
                        name="social_facebook"
                        placeholder="https://facebook.com/company"
                        defaultValue={companySettings.contact_facebook || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-twitter">Twitter/X</Label>
                      <Input
                        id="social-twitter"
                        name="social_twitter"
                        placeholder="https://twitter.com/company"
                        defaultValue={companySettings.contact_twitter || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social-linkedin">LinkedIn</Label>
                      <Input
                        id="social-linkedin"
                        name="social_linkedin"
                        placeholder="https://linkedin.com/company/company"
                        defaultValue={companySettings.contact_linkedin || ""}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Physical Address</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="street-address">Street Address *</Label>
                      <Input
                        id="street-address"
                        name="street_address"
                        placeholder="123 Main Street"
                        defaultValue={companySettings.street_address || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        placeholder="City"
                        defaultValue={companySettings.contact_city || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/County</Label>
                      <Input
                        id="state"
                        name="state"
                        placeholder="State/County"
                        defaultValue={companySettings.contact_state || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        name="postal_code"
                        placeholder="00100"
                        defaultValue={companySettings.contact_postal_code || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select name="country" defaultValue={companySettings.contact_country || "kenya"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kenya">Kenya</SelectItem>
                          <SelectItem value="uganda">Uganda</SelectItem>
                          <SelectItem value="tanzania">Tanzania</SelectItem>
                          <SelectItem value="rwanda">Rwanda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="localization" className="space-y-4">
          <form action={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Localization Settings</span>
                </CardTitle>
                <CardDescription>Configure regional settings, currency, and language preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-language">Default Language</Label>
                    <Select name="default_language" defaultValue={companySettings.localization_language || "en"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select name="currency" defaultValue={companySettings.localization_currency || "kes"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kes">KES - Kenyan Shilling</SelectItem>
                        <SelectItem value="ugx">UGX - Ugandan Shilling</SelectItem>
                        <SelectItem value="tzs">TZS - Tanzanian Shilling</SelectItem>
                        <SelectItem value="usd">USD - US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select name="timezone" defaultValue={companySettings.localization_timezone || "eat"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eat">EAT (UTC+3)</SelectItem>
                        <SelectItem value="cat">CAT (UTC+2)</SelectItem>
                        <SelectItem value="wat">WAT (UTC+1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select name="date_format" defaultValue={companySettings.localization_date_format || "dd/mm/yyyy"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-format">Time Format</Label>
                    <Select name="time_format" defaultValue={companySettings.localization_time_format || "24h"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 Hour</SelectItem>
                        <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number-format">Number Format</Label>
                    <Select name="number_format" defaultValue={companySettings.localization_number_format || "comma"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select number format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comma">1,234.56</SelectItem>
                        <SelectItem value="space">1 234.56</SelectItem>
                        <SelectItem value="period">1.234,56</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week-start">Week Starts On</Label>
                    <Select name="week_start" defaultValue={companySettings.localization_week_start || "monday"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select week start" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-prefix">Company Prefix</Label>
                  <Input
                    id="company-prefix"
                    name="company_prefix"
                    placeholder="TW"
                    defaultValue={companySettings.company_prefix || ""}
                    maxLength={4}
                    className="uppercase"
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase()
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    2-4 character prefix used for customer portal login IDs and payment references
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Regional Compliance</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-system">Tax System</Label>
                      <Select name="tax_system" defaultValue={companySettings.tax_system || "vat"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax system" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vat">VAT (Value Added Tax)</SelectItem>
                          <SelectItem value="gst">GST (Goods and Services Tax)</SelectItem>
                          <SelectItem value="sales">Sales Tax</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
                      <Input
                        id="tax-rate"
                        name="tax_rate"
                        type="number"
                        placeholder="16"
                        defaultValue={companySettings.tax_rate || "16"}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-6">
                  <div>
                    <Label className="text-lg font-medium">Legal Content Management</Label>
                    <p className="text-sm text-gray-600 mt-1">Manage Terms of Service and Privacy Policy content</p>
                  </div>

                  {/* Terms of Service Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <Shield className="h-4 w-4" />
                        <span>Terms of Service</span>
                      </CardTitle>
                      <CardDescription>
                        Manage the content that appears on your Terms of Service page
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href="/terms" target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3 w-3 mr-1" />
                              Preview Page
                            </a>
                          </Button>
                          {contentData.terms?.lastUpdated && (
                            <span className="text-xs text-gray-500">Last updated: {contentData.terms.lastUpdated}</span>
                          )}
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {contentData.terms && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="terms-title">Page Title</Label>
                            <Input
                              id="terms-title"
                              value={contentData.terms.title}
                              onChange={(e) =>
                                setContentData((prev) => ({
                                  ...prev,
                                  terms: { ...prev.terms, title: e.target.value },
                                }))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="terms-intro">Introduction</Label>
                              <Textarea
                                id="terms-intro"
                                rows={3}
                                value={contentData.terms.content.introduction}
                                onChange={(e) => updateContentField("terms", "introduction", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="terms-service">Service Description</Label>
                              <Textarea
                                id="terms-service"
                                rows={3}
                                value={contentData.terms.content.serviceDescription}
                                onChange={(e) => updateContentField("terms", "serviceDescription", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="terms-payment">Payment Terms</Label>
                              <Textarea
                                id="terms-payment"
                                rows={3}
                                value={contentData.terms.content.paymentTerms}
                                onChange={(e) => updateContentField("terms", "paymentTerms", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="terms-contact">Contact Information</Label>
                              <Textarea
                                id="terms-contact"
                                rows={3}
                                value={contentData.terms.content.contact}
                                onChange={(e) => updateContentField("terms", "contact", e.target.value)}
                              />
                            </div>
                          </div>

                          <Button
                            onClick={() => saveContent("terms", contentData.terms)}
                            disabled={isSavingContent}
                            className="w-full md:w-auto"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSavingContent ? "Saving..." : "Save Terms of Service"}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Privacy Policy Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <Lock className="h-4 w-4" />
                        <span>Privacy Policy</span>
                      </CardTitle>
                      <CardDescription>
                        Manage the content that appears on your Privacy Policy page
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href="/privacy" target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3 w-3 mr-1" />
                              Preview Page
                            </a>
                          </Button>
                          {contentData.privacy?.lastUpdated && (
                            <span className="text-xs text-gray-500">
                              Last updated: {contentData.privacy.lastUpdated}
                            </span>
                          )}
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {contentData.privacy && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="privacy-title">Page Title</Label>
                            <Input
                              id="privacy-title"
                              value={contentData.privacy.title}
                              onChange={(e) =>
                                setContentData((prev) => ({
                                  ...prev,
                                  privacy: { ...prev.privacy, title: e.target.value },
                                }))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="privacy-intro">Introduction</Label>
                              <Textarea
                                id="privacy-intro"
                                rows={3}
                                value={contentData.privacy.content.introduction}
                                onChange={(e) => updateContentField("privacy", "introduction", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="privacy-collection">Information Collection</Label>
                              <Textarea
                                id="privacy-collection"
                                rows={3}
                                value={contentData.privacy.content.informationCollection}
                                onChange={(e) => updateContentField("privacy", "informationCollection", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="privacy-security">Data Security</Label>
                              <Textarea
                                id="privacy-security"
                                rows={3}
                                value={contentData.privacy.content.dataSecurity}
                                onChange={(e) => updateContentField("privacy", "dataSecurity", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="privacy-contact">Contact Information</Label>
                              <Textarea
                                id="privacy-contact"
                                rows={3}
                                value={contentData.privacy.content.contact}
                                onChange={(e) => updateContentField("privacy", "contact", e.target.value)}
                              />
                            </div>
                          </div>

                          <Button
                            onClick={() => saveContent("privacy", contentData.privacy)}
                            disabled={isSavingContent}
                            className="w-full md:w-auto"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSavingContent ? "Saving..." : "Save Privacy Policy"}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Changes to legal content will be immediately visible on your Terms of Service and Privacy Policy
                      pages. Please review all content carefully before saving.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Service Locations</span>
              </CardTitle>
              <CardDescription>Manage service locations for network equipment and customer services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Locations</h3>
                  <p className="text-sm text-muted-foreground">Add and manage service locations</p>
                </div>
                <Button onClick={() => setShowAddLocation(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>

              {loadingLocations ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading locations...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {locations.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No locations yet</h3>
                      <p className="text-gray-500 mb-4">Add your first service location to get started</p>
                      <Button onClick={() => setShowAddLocation(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.isArray(locations) &&
                        locations.map((location) => (
                          <Card key={location.id} className="relative">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base">{location.name}</CardTitle>
                                  <CardDescription className="text-sm">{location.address}</CardDescription>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => editLocation(location)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => deleteLocation(location.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center text-muted-foreground">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {location.city}, {location.region}
                                </div>
                                {location.description && (
                                  <p className="text-muted-foreground">{location.description}</p>
                                )}
                                <div className="flex items-center justify-between pt-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      location.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {location.status}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {location.router_count || 0} routers
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add/Edit Location Dialog */}
              <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
                    <DialogDescription>
                      {editingLocation ? "Update location details" : "Add a new service location for network equipment"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleLocationSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location-name">Location Name *</Label>
                      <Input
                        id="location-name"
                        name="name"
                        placeholder="e.g., Main Office, Branch A"
                        defaultValue={editingLocation?.name || ""}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-address">Address *</Label>
                      <Input
                        id="location-address"
                        name="address"
                        placeholder="Street address"
                        defaultValue={editingLocation?.address || ""}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location-city">City *</Label>
                        <Input
                          id="location-city"
                          name="city"
                          placeholder="City"
                          defaultValue={editingLocation?.city || ""}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location-region">Region</Label>
                        <Input
                          id="location-region"
                          name="region"
                          placeholder="Region/State"
                          defaultValue={editingLocation?.region || ""}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-description">Description</Label>
                      <Textarea
                        id="location-description"
                        name="description"
                        placeholder="Optional description"
                        defaultValue={editingLocation?.description || ""}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-status">Status</Label>
                      <Select name="status" defaultValue={editingLocation?.status || "active"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddLocation(false)
                          setEditingLocation(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : editingLocation ? "Update" : "Add Location"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

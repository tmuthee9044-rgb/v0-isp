"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, User, Building, School, Phone, MapPin } from "lucide-react"
import Link from "next/link"

interface Location {
  id: number
  name: string
  city: string
  region: string // Changed from county to region to match database schema
  type: string
}

interface CustomerFormData {
  // Basic Information
  customer_type: "individual" | "company" | "school"
  first_name: string
  last_name: string
  name: string
  email: string
  phone: string
  alternate_email?: string
  date_of_birth?: string
  gender?: string
  national_id?: string

  // Business Information (for companies/schools)
  contact_person?: string
  business_reg_no?: string
  vat_pin?: string
  tax_id?: string
  business_type?: string
  industry?: string
  company_size?: string
  school_type?: string
  student_count?: number
  staff_count?: number

  // Contact Information
  phone_primary: string
  phone_secondary?: string
  phone_office?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string

  // Address Information
  physical_address: string
  physical_city: string
  physical_county: string
  physical_postal_code?: string
  physical_gps_coordinates?: string
  billing_address?: string
  billing_city?: string
  billing_county?: string
  billing_postal_code?: string
  same_as_physical: boolean
  location_id?: number

  // Service Configuration
  service_plan_id?: number
  billing_cycle: "monthly" | "quarterly" | "annually"
  auto_renewal: boolean
  paperless_billing: boolean
  sms_notifications: boolean

  // Technical Requirements
  connection_type?: string
  equipment_needed?: string
  installation_notes?: string
  technical_contact?: string
  technical_contact_phone?: string

  // Additional Information
  referral_source?: string
  special_requirements?: string
  internal_notes?: string
  sales_rep?: string
  account_manager?: string
}

export default function AddCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [formData, setFormData] = useState<CustomerFormData>({
    customer_type: "individual",
    first_name: "",
    last_name: "",
    name: "",
    email: "",
    phone: "",
    phone_primary: "",
    physical_address: "",
    physical_city: "",
    physical_county: "",
    same_as_physical: true,
    billing_cycle: "monthly",
    auto_renewal: true,
    paperless_billing: false,
    sms_notifications: true,
  })

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        console.log("[v0] Fetching locations...")
        const response = await fetch("/api/locations")
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Locations fetched:", data.locations)
          setLocations(data.locations || [])
        }
      } catch (error) {
        console.error("[v0] Failed to fetch locations:", error)
      }
    }
    fetchLocations()
  }, [])

  const handleInputChange = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (field === "first_name" || field === "last_name") {
      if (formData.customer_type === "individual") {
        const firstName = field === "first_name" ? value : formData.first_name
        const lastName = field === "last_name" ? value : formData.last_name
        setFormData((prev) => ({
          ...prev,
          name: `${firstName} ${lastName}`.trim(),
        }))
      }
    }

    if (field === "phone_primary") {
      setFormData((prev) => ({
        ...prev,
        phone: value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("[v0] Submitting customer data:", formData)
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const customer = await response.json()
        console.log("[v0] Customer created successfully:", customer)
        router.push(`/customers/${customer.id}`)
      } else {
        const error = await response.json()
        console.error("[v0] Error creating customer:", error)
        alert(`Error: ${error.message || error.error}`)
      }
    } catch (error) {
      console.error("[v0] Failed to create customer:", error)
      alert("Failed to create customer. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/customers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add New Customer</h1>
          <p className="text-muted-foreground">Create a new customer account with complete information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>Enter the customer's basic details and identification information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_type">Customer Type *</Label>
                    <Select
                      value={formData.customer_type}
                      onValueChange={(value) => handleInputChange("customer_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Individual
                          </div>
                        </SelectItem>
                        <SelectItem value="company">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Company
                          </div>
                        </SelectItem>
                        <SelectItem value="school">
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4" />
                            School
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.customer_type === "individual" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange("first_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange("last_name", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {(formData.customer_type === "company" || formData.customer_type === "school") && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        {formData.customer_type === "company" ? "Company Name" : "School Name"} *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person *</Label>
                      <Input
                        id="contact_person"
                        value={formData.contact_person || ""}
                        onChange={(e) => handleInputChange("contact_person", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternate_email">Alternate Email</Label>
                    <Input
                      id="alternate_email"
                      type="email"
                      value={formData.alternate_email || ""}
                      onChange={(e) => handleInputChange("alternate_email", e.target.value)}
                    />
                  </div>
                </div>

                {formData.customer_type === "individual" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth || ""}
                        onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender || ""}
                        onValueChange={(value) => handleInputChange("gender", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="national_id">National ID</Label>
                      <Input
                        id="national_id"
                        value={formData.national_id || ""}
                        onChange={(e) => handleInputChange("national_id", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {formData.customer_type === "company" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_reg_no">Business Registration No.</Label>
                      <Input
                        id="business_reg_no"
                        value={formData.business_reg_no || ""}
                        onChange={(e) => handleInputChange("business_reg_no", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_pin">VAT PIN</Label>
                      <Input
                        id="vat_pin"
                        value={formData.vat_pin || ""}
                        onChange={(e) => handleInputChange("vat_pin", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>Phone numbers and emergency contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_primary">Primary Phone *</Label>
                    <Input
                      id="phone_primary"
                      value={formData.phone_primary}
                      onChange={(e) => handleInputChange("phone_primary", e.target.value)}
                      placeholder="+254712345678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_secondary">Secondary Phone</Label>
                    <Input
                      id="phone_secondary"
                      value={formData.phone_secondary || ""}
                      onChange={(e) => handleInputChange("phone_secondary", e.target.value)}
                      placeholder="+254723456789"
                    />
                  </div>
                </div>

                {(formData.customer_type === "company" || formData.customer_type === "school") && (
                  <div className="space-y-2">
                    <Label htmlFor="phone_office">Office Phone</Label>
                    <Input
                      id="phone_office"
                      value={formData.phone_office || ""}
                      onChange={(e) => handleInputChange("phone_office", e.target.value)}
                      placeholder="+254202345678"
                    />
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={formData.emergency_contact_name || ""}
                        onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        value={formData.emergency_contact_phone || ""}
                        onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                      <Input
                        id="emergency_contact_relationship"
                        value={formData.emergency_contact_relationship || ""}
                        onChange={(e) => handleInputChange("emergency_contact_relationship", e.target.value)}
                        placeholder="Spouse, Parent, etc."
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
                <CardDescription>Physical and billing address details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-medium">Physical Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="physical_address">Street Address *</Label>
                    <Textarea
                      id="physical_address"
                      value={formData.physical_address}
                      onChange={(e) => handleInputChange("physical_address", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physical_city">Location *</Label>
                    <Select
                      value={formData.location_id?.toString() || ""}
                      onValueChange={(value) => {
                        const selectedLocation = locations.find((loc) => loc.id === Number.parseInt(value))
                        if (selectedLocation) {
                          console.log("[v0] Selected location:", selectedLocation)
                          handleInputChange("location_id", selectedLocation.id)
                          handleInputChange("physical_city", selectedLocation.city)
                          handleInputChange("physical_county", selectedLocation.region)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name} - {location.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This location will be used to determine the router for IP allocation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physical_county">Region *</Label>
                    <Input
                      id="physical_county"
                      value={formData.physical_county}
                      onChange={(e) => handleInputChange("physical_county", e.target.value)}
                      required
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physical_postal_code">Postal Code</Label>
                    <Input
                      id="physical_postal_code"
                      value={formData.physical_postal_code || ""}
                      onChange={(e) => handleInputChange("physical_postal_code", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physical_gps_coordinates">GPS Coordinates</Label>
                    <Input
                      id="physical_gps_coordinates"
                      value={formData.physical_gps_coordinates || ""}
                      onChange={(e) => handleInputChange("physical_gps_coordinates", e.target.value)}
                      placeholder="-1.2921, 36.8219"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="same_as_physical"
                    checked={formData.same_as_physical}
                    onCheckedChange={(checked) => handleInputChange("same_as_physical", checked)}
                  />
                  <Label htmlFor="same_as_physical">Billing address same as physical address</Label>
                </div>

                {!formData.same_as_physical && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-medium">Billing Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="billing_address">Street Address</Label>
                        <Textarea
                          id="billing_address"
                          value={formData.billing_address || ""}
                          onChange={(e) => handleInputChange("billing_address", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billing_city">City</Label>
                        <Input
                          id="billing_city"
                          value={formData.billing_city || ""}
                          onChange={(e) => handleInputChange("billing_city", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billing_county">Region</Label>
                        <Input
                          id="billing_county"
                          value={formData.billing_county || ""}
                          onChange={(e) => handleInputChange("billing_county", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="additional">
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Sales information, referrals, and internal notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referral_source">Referral Source</Label>
                    <Select
                      value={formData.referral_source || ""}
                      onValueChange={(value) => handleInputChange("referral_source", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How did they find us?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="referral">Customer Referral</SelectItem>
                        <SelectItem value="advertisement">Advertisement</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sales_rep">Sales Representative</Label>
                    <Input
                      id="sales_rep"
                      value={formData.sales_rep || ""}
                      onChange={(e) => handleInputChange("sales_rep", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_requirements">Special Requirements</Label>
                  <Textarea
                    id="special_requirements"
                    value={formData.special_requirements || ""}
                    onChange={(e) => handleInputChange("special_requirements", e.target.value)}
                    placeholder="Any special requirements or requests from the customer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal_notes">Internal Notes</Label>
                  <Textarea
                    id="internal_notes"
                    value={formData.internal_notes || ""}
                    onChange={(e) => handleInputChange("internal_notes", e.target.value)}
                    placeholder="Internal notes for staff (not visible to customer)"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/customers">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Creating..." : "Create Customer"}
          </Button>
        </div>
      </form>
    </div>
  )
}

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { User, Phone, MapPin, ArrowLeft, Save, Building, School } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface Location {
  id: number
  name: string
  city: string
  region: string // Changed from county to region to match database schema
  type: string
}

interface Customer {
  id: number
  first_name?: string
  last_name?: string
  name?: string
  email: string
  phone: string
  customer_type?: string
  status: string
  physical_address?: string
  address?: string
  date_of_birth?: string
  gender?: string
  national_id?: string
  alternate_email?: string
  vat_pin?: string
  tax_id?: string
  business_reg_no?: string
  business_type?: string
  industry?: string
  company_size?: string
  school_type?: string
  student_count?: number
  staff_count?: number
  contact_person?: string
  physical_city?: string
  physical_county?: string
  physical_postal_code?: string
  physical_gps_coordinates?: string
  billing_address?: string
  billing_city?: string
  billing_county?: string
  billing_postal_code?: string
  connection_type?: string
  installation_date?: string
  billing_cycle?: string
  auto_renewal?: boolean
  paperless_billing?: boolean
  sms_notifications?: boolean
  referral_source?: string
  special_requirements?: string
  sales_rep?: string
  account_manager?: string
  portal_login_id?: string
  portal_username?: string
  portal_password?: string
  phone_numbers?: any[]
  emergency_contacts?: any[]
  internal_notes?: string
  equipment_needed?: string
  installation_notes?: string
  technical_contact?: string
  phone_primary?: string
  phone_secondary?: string
  phone_office?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  location_id?: number
  id_number?: string // Added for national ID
  tax_number?: string // Added for VAT PIN/Tax ID
  business_name?: string // Added for company/school name
  gps_coordinates?: string // Added for physical GPS
  city?: string // Added for physical city
  state?: string // Added for physical county/region
  postal_code?: string // Added for physical postal code
  installation_address?: string // Added for physical address
  billing_gps_coordinates?: string // Added for billing GPS
}

interface CustomerFormData {
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
  phone_primary: string
  phone_secondary?: string
  phone_office?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
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
  referral_source?: string
  special_requirements?: string
  internal_notes?: string
  sales_rep?: string
  account_manager?: string
}

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerType, setCustomerType] = useState("individual")
  const [sameAsPhysical, setSameAsPhysical] = useState(true)
  const [phoneNumbers, setPhoneNumbers] = useState([{ id: 1, number: "", type: "mobile", isPrimary: true }])
  const [emergencyContacts, setEmergencyContacts] = useState([{ id: 1, name: "", phone: "", relationship: "" }])

  const [portalCredentials, setPortalCredentials] = useState({
    loginId: "",
    username: "",
    password: "",
    autoGeneratePassword: true,
  })
  const [physicalCoordinates, setPhysicalCoordinates] = useState({ lat: -1.2921, lng: 36.8219 })
  const [billingCoordinates, setBillingCoordinates] = useState({ lat: -1.2921, lng: 36.8219 })
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [servicePlans, setServicePlans] = useState<any[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showOnlyInStock, setShowOnlyInStock] = useState(false)
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<any[]>([])

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
  })

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${params.id}`)
        if (response.ok) {
          const customerData = await response.json()
          setCustomer(customerData)
          setCustomerType(customerData.customer_type || "individual")

          if (customerData.services && customerData.services.length > 0) {
            const currentService = customerData.services[0]
            setSelectedPlan({
              id: currentService.service_plan_id,
              name: currentService.plan_name,
              price: currentService.price,
              speed_up: currentService.speed_up,
              speed_down: currentService.speed_down,
              throttle_speed: currentService.throttle_speed,
              data_limit: currentService.data_limit,
            })
          }

          if (customerData.inventory_items && customerData.inventory_items.length > 0) {
            setSelectedInventoryItems(
              customerData.inventory_items.map((item: any) => ({
                id: item.inventory_id,
                name: item.item_name,
                category: item.category,
                price: item.price,
                quantity: item.quantity,
                total: item.total_cost,
              })),
            )
          }

          setPortalCredentials({
            loginId: customerData.portal_login_id || "",
            username: customerData.portal_username || "",
            password: customerData.portal_password || "",
            autoGeneratePassword: false,
          })

          if (customerData.gps_coordinates) {
            const [lat, lng] = customerData.gps_coordinates
              .split(",")
              .map((coord: string) => Number.parseFloat(coord.trim()))
            if (!isNaN(lat) && !isNaN(lng)) {
              setPhysicalCoordinates({ lat, lng })
            }
          }

          if (customerData.billing_gps_coordinates) {
            const [lat, lng] = customerData.billing_gps_coordinates
              .split(",")
              .map((coord: string) => Number.parseFloat(coord.trim()))
            if (!isNaN(lat) && !isNaN(lng)) {
              setBillingCoordinates({ lat, lng })
            }
          }

          // Set phone numbers from customer data
          if (customerData.phone_numbers && customerData.phone_numbers.length > 0) {
            setPhoneNumbers(
              customerData.phone_numbers.map((phone: any, index: number) => ({
                id: index + 1,
                number: phone.number || phone.phone || "",
                type: phone.type || "mobile",
                isPrimary: phone.isPrimary || index === 0,
              })),
            )
          } else if (customerData.phone) {
            setPhoneNumbers([{ id: 1, number: customerData.phone, type: "mobile", isPrimary: true }])
          }

          // Set emergency contacts from customer data
          if (customerData.emergency_contacts && customerData.emergency_contacts.length > 0) {
            setEmergencyContacts(
              customerData.emergency_contacts.map((contact: any, index: number) => ({
                id: index + 1,
                name: contact.name || "",
                phone: contact.phone || "",
                relationship: contact.relationship || "",
              })),
            )
          }

          // Check if billing address is different from physical
          const hasDifferentBilling =
            customerData.billing_address && customerData.billing_address !== customerData.address
          setSameAsPhysical(!hasDifferentBilling)

          setFormData({
            customer_type: (customerData.customer_type as any) || "individual",
            first_name: customerData.first_name || "",
            last_name: customerData.last_name || "",
            name: customerData.business_name || customerData.name || "",
            email: customerData.email || "",
            phone: customerData.phone || "",
            alternate_email: customerData.alternate_email || "",
            date_of_birth: customerData.date_of_birth || "",
            gender: customerData.gender || "",
            national_id: customerData.id_number || customerData.national_id || "",
            contact_person: customerData.contact_person || "",
            business_reg_no: customerData.business_reg_no || "",
            vat_pin: customerData.tax_number || customerData.vat_pin || "",
            tax_id: customerData.tax_number || customerData.tax_id || "",
            business_type: customerData.business_type || "",
            industry: customerData.industry || "",
            company_size: customerData.company_size || "",
            school_type: customerData.school_type || "",
            student_count: customerData.student_count === undefined ? undefined : customerData.student_count,
            staff_count: customerData.staff_count === undefined ? undefined : customerData.staff_count,
            phone_primary: customerData.phone || "",
            phone_secondary: customerData.phone_secondary || "",
            phone_office: customerData.phone_office || "",
            emergency_contact_name: customerData.emergency_contact_name || "",
            emergency_contact_phone: customerData.emergency_contact_phone || "",
            emergency_contact_relationship: customerData.emergency_contact_relationship || "",
            physical_address:
              customerData.address || customerData.physical_address || customerData.installation_address || "",
            physical_city: customerData.city || customerData.physical_city || "",
            physical_county: customerData.state || customerData.physical_county || "",
            physical_postal_code: customerData.postal_code || customerData.physical_postal_code || "",
            physical_gps_coordinates: customerData.gps_coordinates || customerData.physical_gps_coordinates || "",
            billing_address: customerData.billing_address || "",
            billing_city: customerData.billing_city || "",
            billing_county: customerData.billing_county || "",
            billing_postal_code: customerData.billing_postal_code || "",
            same_as_physical: !customerData.billing_address || customerData.billing_address === customerData.address,
            location_id: customerData.location_id === undefined ? undefined : customerData.location_id,
            referral_source: customerData.referral_source || "",
            special_requirements: customerData.special_requirements || "",
            internal_notes: customerData.internal_notes || "",
            sales_rep: customerData.sales_rep || "",
            account_manager: customerData.account_manager || "",
          })
        } else {
          toast.error("Failed to load customer data")
          router.push("/customers")
        }
      } catch (error) {
        console.error("Error loading customer:", error)
        toast.error("Error loading customer data")
        router.push("/customers")
      } finally {
        setLoading(false)
      }
    }

    const loadServicePlans = async () => {
      setLoadingPlans(true)
      try {
        const response = await fetch("/api/service-plans")
        if (response.ok) {
          const plans = await response.json()
          // Ensure plans is always an array
          setServicePlans(Array.isArray(plans) ? plans : [])
        } else {
          console.error("Failed to load service plans:", response.status, response.statusText)
          setServicePlans([])
        }
      } catch (error) {
        console.error("Error loading service plans:", error)
        setServicePlans([])
      } finally {
        setLoadingPlans(false)
      }
    }

    const loadInventory = async () => {
      setLoadingInventory(true)
      try {
        console.log("[v0] Loading inventory from /api/inventory/available")
        const response = await fetch("/api/inventory/available", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })
        console.log("[v0] Inventory API response status:", response.status)

        if (response.ok) {
          let data
          try {
            const responseText = await response.text()
            console.log("[v0] Raw response text:", responseText.substring(0, 200))
            data = JSON.parse(responseText)
            console.log("[v0] Inventory API response data:", data)
          } catch (parseError) {
            console.error("[v0] JSON parsing error:", parseError)
            console.error("[v0] Response was not valid JSON, using fallback")
            setInventoryItems([])
            return
          }

          // Handle both possible response formats
          const items = data.items || data || []
          setInventoryItems(Array.isArray(items) ? items : [])
        } else {
          console.error("[v0] Inventory API returned error status:", response.status)
          const errorText = await response.text()
          console.error("[v0] Error response:", errorText)
          setInventoryItems([])
        }
      } catch (error) {
        console.error("[v0] Error loading inventory:", error)
        setInventoryItems([])
      } finally {
        setLoadingInventory(false)
      }
    }

    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/locations")
        if (response.ok) {
          const data = await response.json()
          setLocations(data.locations || [])
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error)
      }
    }

    loadCustomer()
    loadServicePlans()
    loadInventory()
    fetchLocations()
  }, [params.id, router])

  const handlePortalCredentialChange = (field: string, value: any) => {
    setPortalCredentials((prev) => ({ ...prev, [field]: value }))
  }

  const generatePortalCredentials = () => {
    const loginId = `TW${Date.now().toString().slice(-9)}`
    const username = `customer_${Date.now().toString().slice(-6)}`
    setPortalCredentials((prev) => ({
      ...prev,
      loginId,
      username,
    }))
  }

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handlePhysicalLocationSelect = (lat: number, lng: number) => {
    setPhysicalCoordinates({ lat, lng })
    if (sameAsPhysical) {
      setBillingCoordinates({ lat, lng })
    }
  }

  const handleBillingLocationSelect = (lat: number, lng: number) => {
    setBillingCoordinates({ lat, lng })
  }

  const handlePlanSelection = (planId: string) => {
    const plan = servicePlans.find((p) => p.id.toString() === planId)
    setSelectedPlan(plan)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount / 100)
  }

  const addPhoneNumber = () => {
    const newId = Math.max(...phoneNumbers.map((p) => p.id)) + 1
    setPhoneNumbers([...phoneNumbers, { id: newId, number: "", type: "mobile", isPrimary: false }])
  }

  const removePhoneNumber = (id: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((p) => p.id !== id))
    }
  }

  const updatePhoneNumber = (id: number, field: string, value: string) => {
    setPhoneNumbers(phoneNumbers.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const setPrimaryPhone = (id: number) => {
    setPhoneNumbers(phoneNumbers.map((p) => ({ ...p, isPrimary: p.id === id })))
  }

  const addEmergencyContact = () => {
    const newId = Math.max(...emergencyContacts.map((c) => c.id)) + 1
    setEmergencyContacts([...emergencyContacts, { id: newId, name: "", phone: "", relationship: "" }])
  }

  const removeEmergencyContact = (id: number) => {
    if (emergencyContacts.length > 1) {
      setEmergencyContacts(emergencyContacts.filter((c) => c.id !== id))
    }
  }

  const updateEmergencyContact = (id: number, field: string, value: string) => {
    setEmergencyContacts(emergencyContacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const handleSameAsPhysicalChange = (checked: boolean) => {
    setSameAsPhysical(checked)
  }

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
    setIsSubmitting(true)

    try {
      const formDataToSend = new FormData(e.currentTarget as HTMLFormElement)

      formDataToSend.append("portal_login_id", portalCredentials.loginId)
      formDataToSend.append("portal_username", portalCredentials.username)
      formDataToSend.append("portal_password", portalCredentials.password)
      formDataToSend.append("physical_lat", physicalCoordinates.lat.toString())
      formDataToSend.append("physical_lng", physicalCoordinates.lng.toString())
      formDataToSend.append("billing_lat", billingCoordinates.lat.toString())
      formDataToSend.append("billing_lng", billingCoordinates.lng.toString())

      if (selectedPlan) {
        formDataToSend.append("selected_plan", JSON.stringify(selectedPlan))
      }
      formDataToSend.append("selected_equipment", JSON.stringify(selectedInventoryItems))

      // Add phone numbers and emergency contacts to form data
      formDataToSend.append("phone_numbers", JSON.stringify(phoneNumbers))
      formDataToSend.append("emergency_contacts", JSON.stringify(emergencyContacts))
      formDataToSend.append("customer_type", customerType)
      formDataToSend.append("same_as_physical", sameAsPhysical.toString())

      const response = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        body: formDataToSend,
      })

      if (response.ok) {
        toast.success("Customer updated successfully!")
        router.push("/customers")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update customer")
      }
    } catch (error) {
      console.error("Error updating customer:", error)
      toast.error("Error updating customer")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleInventoryItem = (item: any) => {
    const existingItemIndex = selectedInventoryItems.findIndex((selected) => selected.id === item.id)

    if (existingItemIndex > -1) {
      // Item already exists, remove it
      const updatedItems = [...selectedInventoryItems]
      updatedItems.splice(existingItemIndex, 1)
      setSelectedInventoryItems(updatedItems)
    } else {
      // Item doesn't exist, add it with quantity 1
      setSelectedInventoryItems([...selectedInventoryItems, { id: item.id, item: item, quantity: 1 }])
    }
  }

  const updateItemQuantity = (itemId: any, newQuantity: number) => {
    setSelectedInventoryItems((prevItems) =>
      prevItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item)),
    )
  }

  const removeInventoryItem = (itemId: any) => {
    setSelectedInventoryItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
  }

  const getTotalInventoryCost = () => {
    return selectedInventoryItems.reduce((total, item) => total + item.item.unitCost * item.quantity, 0)
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading customer data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="text-center">
          <p className="text-muted-foreground">Customer not found</p>
          <Button asChild className="mt-4">
            <Link href="/customers">Back to Customers</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Matching the add customer page header design
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/customers/${params.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customer
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Customer</h1>
          <p className="text-muted-foreground">Update customer account information</p>
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
                <CardDescription>Update the customer's basic details and identification information</CardDescription>
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
                    <input type="hidden" name="customer_type" value={formData.customer_type} />
                  </div>
                </div>

                {formData.customer_type === "individual" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange("first_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        name="last_name"
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
                        name="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person *</Label>
                      <Input
                        id="contact_person"
                        name="contact_person"
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
                      name="email"
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
                      name="alternate_email"
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
                        name="date_of_birth"
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
                      <input type="hidden" name="gender" value={formData.gender || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="national_id">National ID</Label>
                      <Input
                        id="national_id"
                        name="national_id"
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
                        name="business_reg_no"
                        value={formData.business_reg_no || ""}
                        onChange={(e) => handleInputChange("business_reg_no", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_pin">VAT PIN</Label>
                      <Input
                        id="vat_pin"
                        name="vat_pin"
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
                      name="phone_primary"
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
                      name="phone_secondary"
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
                      name="phone_office"
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
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name || ""}
                        onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        name="emergency_contact_phone"
                        value={formData.emergency_contact_phone || ""}
                        onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                      <Input
                        id="emergency_contact_relationship"
                        name="emergency_contact_relationship"
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
                      name="physical_address"
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
                    <input type="hidden" name="location_id" value={formData.location_id || ""} />
                    <input type="hidden" name="physical_city" value={formData.physical_city} />
                    <p className="text-xs text-muted-foreground">
                      This location will be used to determine the router for IP allocation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physical_county">Region *</Label>
                    <Input
                      id="physical_county"
                      name="physical_county"
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
                      name="physical_postal_code"
                      value={formData.physical_postal_code || ""}
                      onChange={(e) => handleInputChange("physical_postal_code", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="physical_gps_coordinates">GPS Coordinates</Label>
                    <Input
                      id="physical_gps_coordinates"
                      name="physical_gps_coordinates"
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
                          name="billing_address"
                          value={formData.billing_address || ""}
                          onChange={(e) => handleInputChange("billing_address", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billing_city">City</Label>
                        <Input
                          id="billing_city"
                          name="billing_city"
                          value={formData.billing_city || ""}
                          onChange={(e) => handleInputChange("billing_city", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billing_county">Region</Label>
                        <Input
                          id="billing_county"
                          name="billing_county"
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
                    <input type="hidden" name="referral_source" value={formData.referral_source || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sales_rep">Sales Representative</Label>
                    <Input
                      id="sales_rep"
                      name="sales_rep"
                      value={formData.sales_rep || ""}
                      onChange={(e) => handleInputChange("sales_rep", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_requirements">Special Requirements</Label>
                  <Textarea
                    id="special_requirements"
                    name="special_requirements"
                    value={formData.special_requirements || ""}
                    onChange={(e) => handleInputChange("special_requirements", e.target.value)}
                    placeholder="Any special requirements or requests from the customer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal_notes">Internal Notes</Label>
                  <Textarea
                    id="internal_notes"
                    name="internal_notes"
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
          <Link href={`/customers/${params.id}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Updating..." : "Update Customer"}
          </Button>
        </div>
      </form>
    </div>
  )
}

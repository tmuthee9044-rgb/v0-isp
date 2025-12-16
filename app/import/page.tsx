"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { ArrowLeft, Upload, Download, Users, Package, Wrench, Check, AlertCircle, FileSpreadsheet } from "lucide-react"
import { useToast } from "@/components/ui/use-toast" // Import useToast
import { Label } from "@/components/ui/label" // Import Label

type EntityType = "customers" | "services" | "inventory" | "vehicles"

interface ColumnConfig {
  key: string
  label: string
  required: boolean
  description?: string // Added description field
}

interface EntityConfig {
  name: string
  icon: any
  backUrl: string
  apiEndpoint: string
  columns: ColumnConfig[]
}

const ENTITY_CONFIGS = {
  customers: {
    name: "Customers",
    icon: Users,
    backUrl: "/customers",
    apiEndpoint: "/api/import/bulk",
    columns: [
      // Core identification
      { key: "account_number", label: "Account Number", required: false },
      { key: "name", label: "Full Name", required: true },
      { key: "first_name", label: "First Name", required: true },
      { key: "last_name", label: "Last Name", required: true },
      { key: "business_name", label: "Business Name", required: false },

      // Contact information
      { key: "email", label: "Email", required: false },
      { key: "alternate_email", label: "Alternate Email", required: false },
      { key: "phone", label: "Phone", required: true },
      { key: "phone_primary", label: "Primary Phone", required: false },
      { key: "phone_secondary", label: "Secondary Phone", required: false },
      { key: "phone_office", label: "Office Phone", required: false },

      // Personal identification
      { key: "national_id", label: "National ID", required: false },
      { key: "date_of_birth", label: "Date of Birth", required: false },
      { key: "gender", label: "Gender", required: false },

      // Customer classification
      { key: "customer_type", label: "Customer Type (residential/business)", required: false },
      { key: "status", label: "Status (active/inactive)", required: false },

      // Physical address
      { key: "physical_address", label: "Physical Address", required: false },
      { key: "physical_city", label: "Physical City", required: false },
      { key: "physical_county", label: "Physical County", required: false },
      { key: "physical_postal_code", label: "Physical Postal Code", required: false },
      { key: "physical_country", label: "Physical Country", required: false },
      { key: "physical_gps_coordinates", label: "Physical GPS Coordinates", required: false },

      // Billing address
      { key: "billing_address", label: "Billing Address", required: false },
      { key: "billing_city", label: "Billing City", required: false },
      { key: "billing_postal_code", label: "Billing Postal Code", required: false },

      // Installation address
      { key: "installation_address", label: "Installation Address", required: false },
      { key: "city", label: "City", required: false },
      { key: "state", label: "State/Region", required: false },
      { key: "country", label: "Country", required: false },
      { key: "postal_code", label: "Postal Code", required: false },
      { key: "gps_coordinates", label: "GPS Coordinates", required: false },
      { key: "region", label: "Region", required: false },

      // Emergency contact
      { key: "emergency_contact_name", label: "Emergency Contact Name", required: false },
      { key: "emergency_contact_phone", label: "Emergency Contact Phone", required: false },
      { key: "emergency_contact_relationship", label: "Emergency Contact Relationship", required: false },

      // Business information
      { key: "business_type", label: "Business Type", required: false },
      { key: "business_reg_no", label: "Business Registration Number", required: false },
      { key: "contact_person", label: "Contact Person", required: false },
      { key: "tax_number", label: "Tax Number", required: false },
      { key: "vat_pin", label: "VAT PIN", required: false },

      // Service and account details
      { key: "plan", label: "Service Plan", required: false },
      { key: "monthly_fee", label: "Monthly Fee", required: false },
      { key: "balance", label: "Account Balance", required: false },
      { key: "connection_quality", label: "Connection Quality", required: false },

      // Portal credentials
      { key: "portal_login_id", label: "Portal Login ID", required: false },
      { key: "portal_username", label: "Portal Username", required: false },
      { key: "portal_password", label: "Portal Password", required: false },

      // Important dates
      { key: "installation_date", label: "Installation Date", required: false },
      { key: "last_payment_date", label: "Last Payment Date", required: false },
      { key: "contract_end_date", label: "Contract End Date", required: false },

      // Preferences and tracking
      { key: "preferred_contact_method", label: "Preferred Contact Method", required: false },
      { key: "referral_source", label: "Referral Source", required: false },
      { key: "sales_rep", label: "Sales Representative", required: false },
      { key: "account_manager", label: "Account Manager", required: false },
      { key: "special_requirements", label: "Special Requirements", required: false },
      { key: "internal_notes", label: "Internal Notes", required: false },

      // Billing preferences
      { key: "billing_cycle", label: "Billing Cycle", required: false },
      { key: "auto_renewal", label: "Auto Renewal (true/false)", required: false },
      { key: "paperless_billing", label: "Paperless Billing (true/false)", required: false },
      { key: "sms_notifications", label: "SMS Notifications (true/false)", required: false },
    ],
  },
  services: {
    name: "Service Plans",
    icon: Wrench,
    backUrl: "/services",
    apiEndpoint: "/api/import/bulk",
    columns: [
      { key: "name", label: "Plan Name", required: true },
      { key: "description", label: "Description", required: false },
      { key: "price", label: "Price", required: true },
      { key: "download_speed", label: "Download Speed (Mbps)", required: true },
      { key: "upload_speed", label: "Upload Speed (Mbps)", required: true },
      { key: "data_limit", label: "Data Limit (GB)", required: false },
      { key: "billing_cycle", label: "Billing Cycle", required: false },
      { key: "currency", label: "Currency", required: false },
      { key: "priority_level", label: "Priority Level", required: false },
      { key: "fair_usage_policy", label: "Fair Usage Policy", required: false },
      { key: "status", label: "Status", required: false },
    ],
  },
  inventory: {
    name: "Inventory",
    icon: Package,
    backUrl: "/inventory",
    apiEndpoint: "/api/import/bulk",
    columns: [
      { key: "product_id", label: "Product ID", required: true },
      { key: "product_name", label: "Product Name", required: true },
      { key: "quantity", label: "Quantity", required: true },
      { key: "price_per_unit", label: "Price per Unit", required: true },
      { key: "supplier", label: "Supplier", required: false },
      { key: "category", label: "Category", required: false },
      { key: "reorder_level", label: "Reorder Level", required: false },
      { key: "expiry_date", label: "Expiry Date", required: false },
      { key: "status", label: "Status", required: false },
    ],
  },
  vehicles: {
    name: "Vehicles",
    icon: FileSpreadsheet,
    backUrl: "/vehicles",
    apiEndpoint: "/api/import/bulk",
    columns: [
      { key: "name", label: "Vehicle Name", required: true },
      { key: "registration", label: "Registration Number", required: true },
      { key: "type", label: "Vehicle Type", required: true },
      { key: "model", label: "Model", required: false },
      { key: "year", label: "Year", required: false },
      { key: "fuel_type", label: "Fuel Type", required: false },
      { key: "mileage", label: "Current Mileage", required: false },
      { key: "fuel_consumption", label: "Fuel Consumption (L/100km)", required: false },
      { key: "purchase_date", label: "Purchase Date", required: false },
      { key: "purchase_cost", label: "Purchase Cost", required: false },
      { key: "insurance_expiry", label: "Insurance Expiry", required: false },
      { key: "license_expiry", label: "License Expiry", required: false },
      { key: "last_service", label: "Last Service Date", required: false },
      { key: "next_service", label: "Next Service Date", required: false },
      { key: "assigned_to", label: "Assigned To", required: false },
      { key: "location", label: "Location", required: false },
      { key: "status", label: "Status", required: false },
    ],
  },
}

export default function UniversalImportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast() // Declare useToast

  const [entityType, setEntityType] = useState<EntityType>("customers")
  const [fileData, setFileData] = useState<{ headers: string[]; rows: string[][]; filename: string } | null>(null)
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // useEffect(() => {
  //   const type = searchParams.get("type") || "customers"
  //   setEntityType(type as EntityType)

  //   const storedData = sessionStorage.getItem("importFileData")
  //   if (storedData) {
  //     const data = JSON.parse(storedData)
  //     setFileData(data)
  //     autoMapColumns(data.headers, type as EntityType)
  //   }
  // }, [searchParams])

  const currentConfig = ENTITY_CONFIGS[entityType] || ENTITY_CONFIGS.customers
  const IconComponent = currentConfig.icon

  const autoMapColumns = (headers: string[], type: EntityType) => {
    const mapping: { [key: string]: string } = {}
    const config = ENTITY_CONFIGS[type]

    if (!config) return

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim()

      config.columns.forEach((column) => {
        const lowerColumnKey = column.key.toLowerCase()
        const lowerColumnLabel = column.label.toLowerCase()

        if (lowerHeader === lowerColumnKey || lowerHeader === lowerColumnLabel) {
          mapping[column.key] = header
          return
        }

        if (lowerColumnKey.includes("name") && lowerHeader.includes("name")) {
          if (lowerColumnKey.includes("first") && lowerHeader.includes("first")) {
            mapping[column.key] = header
          } else if (lowerColumnKey.includes("last") && lowerHeader.includes("last")) {
            mapping[column.key] = header
          } else if (
            !lowerColumnKey.includes("first") &&
            !lowerColumnKey.includes("last") &&
            !lowerHeader.includes("first") &&
            !lowerHeader.includes("last")
          ) {
            mapping[column.key] = header
          }
        } else if (lowerColumnKey === "email" && lowerHeader.includes("email")) {
          mapping[column.key] = header
        } else if (lowerColumnKey === "phone" && (lowerHeader.includes("phone") || lowerHeader.includes("mobile"))) {
          mapping[column.key] = header
        } else if (
          lowerColumnKey === "price" &&
          (lowerHeader.includes("price") || lowerHeader.includes("cost") || lowerHeader.includes("amount"))
        ) {
          mapping[column.key] = header
        }
      })
    })

    setColumnMapping(mapping)
  }

  const handleEntityTypeChange = (newType: EntityType) => {
    setEntityType(newType)
    setColumnMapping({})
    setPreviewData([])
    setValidationErrors([])

    if (fileData) {
      autoMapColumns(fileData.headers, newType)
    }
  }

  const handleColumnMapping = (entityColumn: string, fileColumn: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [entityColumn]: fileColumn === "none" ? "" : fileColumn,
    }))
  }

  const generatePreview = () => {
    if (!fileData) return

    const preview = fileData.rows.slice(0, 5).map((row) => {
      const mappedRow: any = {}

      currentConfig.columns.forEach((col) => {
        const mappedColumn = columnMapping[col.key]
        if (mappedColumn) {
          const columnIndex = fileData.headers.indexOf(mappedColumn)
          mappedRow[col.key] = row[columnIndex] || ""
        } else {
          mappedRow[col.key] = ""
        }
      })

      return mappedRow
    })

    setPreviewData(preview)

    const errors: string[] = []
    const requiredFields = currentConfig.columns.filter((col) => col.required)

    requiredFields.forEach((field) => {
      if (!columnMapping[field.key]) {
        errors.push(`${field.label} is required but not mapped`)
      }
    })

    setValidationErrors(errors)
  }

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before importing",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      const importData = {
        fileData,
        columnMapping,
        entityType,
      }

      const response = await fetch(currentConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(importData),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.imported} ${currentConfig.name.toLowerCase()}`,
        })

        sessionStorage.removeItem("importFileData")
        router.push(currentConfig.backUrl)
      } else {
        const error = await response.json()
        throw new Error(error.message || "Import failed")
      }
    } catch (error) {
      console.error("[v0] Import error:", error)
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : `Failed to import ${currentConfig.name.toLowerCase()}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = currentConfig.columns.map((col) => col.label).join(",")
    const sampleRow = currentConfig.columns
      .map((col) => {
        switch (entityType) {
          case "customers":
            switch (col.key) {
              case "account_number":
                return "ACC123456"
              case "name":
                return "John Doe"
              case "first_name":
                return "John"
              case "last_name":
                return "Doe"
              case "business_name":
                return "Example Business Ltd"
              case "email":
                return "john.doe@example.com"
              case "alternate_email":
                return "john.alternate@example.com"
              case "phone":
                return "+254700000000"
              case "phone_primary":
                return "+254700000001"
              case "phone_secondary":
                return "+254700000002"
              case "phone_office":
                return "+254700000003"
              case "national_id":
                return "12345678"
              case "date_of_birth":
                return "1990-01-15"
              case "gender":
                return "Male"
              case "customer_type":
                return "residential"
              case "status":
                return "active"
              case "physical_address":
                return "123 Main Street, Apartment 4B"
              case "physical_city":
                return "Nairobi"
              case "physical_county":
                return "Nairobi County"
              case "physical_postal_code":
                return "00100"
              case "physical_country":
                return "Kenya"
              case "physical_gps_coordinates":
                return "-1.2921,36.8219"
              case "billing_address":
                return "PO Box 12345"
              case "billing_city":
                return "Nairobi"
              case "billing_postal_code":
                return "00100"
              case "installation_address":
                return "123 Main Street, Apartment 4B"
              case "city":
                return "Nairobi"
              case "state":
                return "Nairobi"
              case "country":
                return "Kenya"
              case "postal_code":
                return "00100"
              case "gps_coordinates":
                return "-1.2921,36.8219"
              case "region":
                return "Central"
              case "emergency_contact_name":
                return "Jane Doe"
              case "emergency_contact_phone":
                return "+254700000004"
              case "emergency_contact_relationship":
                return "Spouse"
              case "business_type":
                return "Retail"
              case "business_reg_no":
                return "BRN123456"
              case "contact_person":
                return "John Doe"
              case "tax_number":
                return "TAX123456"
              case "vat_pin":
                return "VAT123456"
              case "plan":
                return "Premium 50Mbps"
              case "monthly_fee":
                return "5000.00"
              case "balance":
                return "0.00"
              case "connection_quality":
                return "Excellent"
              case "portal_login_id":
                return "user123"
              case "portal_username":
                return "johndoe"
              case "portal_password":
                return "SecurePass123"
              case "installation_date":
                return "2024-01-15"
              case "last_payment_date":
                return "2024-12-01"
              case "contract_end_date":
                return "2025-12-31"
              case "preferred_contact_method":
                return "email"
              case "referral_source":
                return "Friend Referral"
              case "sales_rep":
                return "Jane Sales"
              case "account_manager":
                return "Mike Manager"
              case "special_requirements":
                return "Requires 24/7 support"
              case "internal_notes":
                return "VIP customer, handle with priority"
              case "billing_cycle":
                return "monthly"
              case "auto_renewal":
                return "true"
              case "paperless_billing":
                return "true"
              case "sms_notifications":
                return "true"
              default:
                return ""
            }
          case "services":
            switch (col.key) {
              case "name":
                return "Basic Home Plan"
              case "description":
                return "A basic home internet service plan"
              case "price":
                return "2999"
              case "download_speed":
                return "25"
              case "upload_speed":
                return "10"
              case "data_limit":
                return "100"
              case "billing_cycle":
                return "monthly"
              case "currency":
                return "KES"
              case "priority_level":
                return "standard"
              case "fair_usage_policy":
                return "fair"
              case "status":
                return "active"
              default:
                return ""
            }
          case "inventory":
            switch (col.key) {
              case "product_id":
                return "PROD001"
              case "product_name":
                return "Wireless Router"
              case "quantity":
                return "100"
              case "price_per_unit":
                return "2000"
              case "supplier":
                return "Tech Supplier Inc."
              case "category":
                return "Networking"
              case "reorder_level":
                return "20"
              case "expiry_date":
                return "2025-12-31"
              case "status":
                return "active"
              default:
                return ""
            }
          case "vehicles":
            switch (col.key) {
              case "name":
                return "Toyota Hiace"
              case "registration":
                return "KCA 123A"
              case "type":
                return "van"
              case "model":
                return "Hiace"
              case "year":
                return "2020"
              case "fuel_type":
                return "petrol"
              case "mileage":
                return "50000"
              case "fuel_consumption":
                return "8.5"
              case "purchase_date":
                return "2020-01-01"
              case "purchase_cost":
                return "200000"
              case "insurance_expiry":
                return "2025-01-01"
              case "license_expiry":
                return "2025-01-01"
              case "last_service":
                return "2023-01-01"
              case "next_service":
                return "2023-06-01"
              case "assigned_to":
                return "John Doe"
              case "location":
                return "Nairobi"
              case "status":
                return "active"
              default:
                return ""
            }
          default:
            return ""
        }
      })
      .join(",")

    const csvContent = `${headers}\n${sampleRow}`
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${entityType}_import_template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        toast({
          title: "Invalid file",
          description: "The file must contain at least a header row and one data row",
          variant: "destructive",
        })
        return
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h !== "") // Remove empty headers

      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim())
        // Ensure row has same length as headers, padding with empty strings if needed
        return headers.map((_, i) => values[i] || "")
      })

      setFileData({
        filename: file.name,
        headers,
        rows,
      })

      // Auto-map columns based on entity type
      autoMapColumns(headers, entityType)

      toast({
        title: "File uploaded",
        description: `Successfully loaded ${rows.length} rows`,
      })
    }

    reader.readAsText(file)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href={currentConfig.backUrl}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {currentConfig.name}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <IconComponent className="mr-2 h-6 w-6" />
              Import {currentConfig.name}
            </h1>
            <p className="text-muted-foreground">Map your file columns to {currentConfig.name.toLowerCase()} fields</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>
      </div>

      {/* Entity Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Import Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ENTITY_CONFIGS).map(([key, config]) => {
              const IconComp = config.icon
              return (
                <div
                  key={key}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    entityType === key ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-200"
                  }`}
                  onClick={() => handleEntityTypeChange(key as EntityType)}
                >
                  <div className="flex items-center space-x-3">
                    <IconComp className="h-6 w-6" />
                    <div>
                      <h3 className="font-medium">{config.name}</h3>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      {!fileData && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Upload CSV or Excel file</h3>
                <p className="text-muted-foreground">Choose a file to import {currentConfig.name.toLowerCase()}</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  ref={fileInputRef}
                />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {fileData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Column Mapping
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                File: {fileData.filename} ({fileData.rows.length} rows)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentConfig.columns.map((column) => (
                <div key={column.key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">
                      {column.label}
                      {column.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {column.description && <p className="text-xs text-muted-foreground">{column.description}</p>}
                  </div>
                  <Select
                    value={columnMapping[column.key] || "none"}
                    onValueChange={(value) => handleColumnMapping(column.key, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Not mapped --</SelectItem>
                      {fileData.headers
                        .filter((header) => header && header.trim() !== "")
                        .map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="pt-4 space-y-2">
                <Button onClick={generatePreview} className="w-full">
                  Generate Preview
                </Button>

                {validationErrors.length > 0 && (
                  <div className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Check className="mr-2 h-4 w-4" />
                Preview (First 5 rows)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        {currentConfig.columns
                          .filter((col) => columnMapping[col.key])
                          .map((col) => (
                            <th key={col.key} scope="col" className="px-6 py-3">
                              {col.label}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                          {currentConfig.columns
                            .filter((col) => columnMapping[col.key])
                            .map((col) => (
                              <td key={col.key} className="px-6 py-4">
                                {row[col.key] || "-"}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Click "Generate Preview" to see how your data will be imported</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Actions */}
      {fileData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to Import?</h3>
                <p className="text-sm text-muted-foreground">
                  {validationErrors.length === 0
                    ? `${fileData.rows.length} ${currentConfig.name.toLowerCase()} will be imported`
                    : `Fix ${validationErrors.length} validation errors first`}
                </p>
              </div>
              <Button
                onClick={handleImport}
                disabled={isLoading || validationErrors.length > 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Importing..." : `Import ${currentConfig.name}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

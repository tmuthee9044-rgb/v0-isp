"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Download, Users, Car, Briefcase, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface FileData {
  headers: string[]
  rows: any[][]
  filename: string
}

interface ColumnMapping {
  [key: string]: string
}

interface EntityColumn {
  key: string
  label: string
  required: boolean
}

const ENTITY_CONFIGS = {
  customers: {
    name: "Customers",
    icon: Users,
    backUrl: "/customers",
    apiEndpoint: "/api/import-customers/process",
    columns: [
      { key: "first_name", label: "First Name", required: true },
      { key: "last_name", label: "Last Name", required: true },
      { key: "email", label: "Email", required: true },
      { key: "phone", label: "Phone", required: true },
      { key: "address", label: "Address", required: false },
      { key: "city", label: "City", required: false },
      { key: "postal_code", label: "Postal Code", required: false },
      { key: "customer_type", label: "Customer Type", required: false },
      { key: "business_name", label: "Business Name", required: false },
      { key: "national_id", label: "National ID", required: false },
      { key: "date_of_birth", label: "Date of Birth", required: false },
      { key: "gender", label: "Gender", required: false },
    ],
  },
  services: {
    name: "Service Plans",
    icon: Settings,
    backUrl: "/services",
    apiEndpoint: "/api/import-services/process",
    columns: [
      { key: "name", label: "Plan Name", required: true },
      { key: "price", label: "Price", required: true },
      { key: "download_speed", label: "Download Speed (Mbps)", required: true },
      { key: "upload_speed", label: "Upload Speed (Mbps)", required: true },
      { key: "service_type", label: "Service Type", required: false },
      { key: "description", label: "Description", required: false },
      { key: "data_limit", label: "Data Limit (GB)", required: false },
      { key: "contract_length", label: "Contract Length (months)", required: false },
      { key: "setup_fee", label: "Setup Fee", required: false },
      { key: "status", label: "Status", required: false },
    ],
  },
  vehicles: {
    name: "Vehicles",
    icon: Car,
    backUrl: "/vehicles",
    apiEndpoint: "/api/import-vehicles/process",
    columns: [
      { key: "vehicle_number", label: "Vehicle Number", required: true },
      { key: "make", label: "Make", required: true },
      { key: "model", label: "Model", required: true },
      { key: "year", label: "Year", required: true },
      { key: "vehicle_type", label: "Vehicle Type", required: false },
      { key: "fuel_type", label: "Fuel Type", required: false },
      { key: "engine_capacity", label: "Engine Capacity", required: false },
      { key: "seating_capacity", label: "Seating Capacity", required: false },
      { key: "insurance_policy", label: "Insurance Policy", required: false },
      { key: "registration_date", label: "Registration Date", required: false },
      { key: "status", label: "Status", required: false },
    ],
  },
  employees: {
    name: "Employees",
    icon: Briefcase,
    backUrl: "/hr",
    apiEndpoint: "/api/import-employees/process",
    columns: [
      { key: "first_name", label: "First Name", required: true },
      { key: "last_name", label: "Last Name", required: true },
      { key: "email", label: "Email", required: true },
      { key: "phone", label: "Phone", required: true },
      { key: "employee_id", label: "Employee ID", required: true },
      { key: "department", label: "Department", required: false },
      { key: "position", label: "Position", required: false },
      { key: "hire_date", label: "Hire Date", required: false },
      { key: "salary", label: "Salary", required: false },
      { key: "manager", label: "Manager", required: false },
      { key: "status", label: "Status", required: false },
    ],
  },
}

export default function UniversalImportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [entityType, setEntityType] = useState<string>("customers")
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    // Get entity type from URL params
    const type = searchParams.get("type") || "customers"
    setEntityType(type)

    // Check if we have file data from the previous page
    const storedData = sessionStorage.getItem("importFileData")
    if (storedData) {
      const data = JSON.parse(storedData)
      setFileData(data)
      // Auto-map columns based on similarity
      autoMapColumns(data.headers, type)
    }
  }, [searchParams])

  const currentConfig = ENTITY_CONFIGS[entityType as keyof typeof ENTITY_CONFIGS] || ENTITY_CONFIGS.customers
  const IconComponent = currentConfig.icon

  const autoMapColumns = (headers: string[], type: string) => {
    const mapping: ColumnMapping = {}
    const config = ENTITY_CONFIGS[type as keyof typeof ENTITY_CONFIGS]

    if (!config) return

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim()

      config.columns.forEach((column) => {
        const lowerColumnKey = column.key.toLowerCase()
        const lowerColumnLabel = column.label.toLowerCase()

        // Direct match
        if (lowerHeader === lowerColumnKey || lowerHeader === lowerColumnLabel) {
          mapping[column.key] = header
          return
        }

        // Partial matches for common patterns
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

  const handleEntityTypeChange = (newType: string) => {
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

    // Validate required fields
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

        // Clear session storage
        sessionStorage.removeItem("importFileData")

        // Redirect to entity page
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
        // Generate sample data based on entity type and column
        switch (entityType) {
          case "customers":
            switch (col.key) {
              case "first_name":
                return "John"
              case "last_name":
                return "Doe"
              case "email":
                return "john.doe@example.com"
              case "phone":
                return "+254700000000"
              case "customer_type":
                return "individual"
              default:
                return ""
            }
          case "services":
            switch (col.key) {
              case "name":
                return "Basic Home Plan"
              case "price":
                return "2999"
              case "download_speed":
                return "25"
              case "upload_speed":
                return "10"
              case "service_type":
                return "residential"
              default:
                return ""
            }
          case "vehicles":
            switch (col.key) {
              case "vehicle_number":
                return "KCA 123A"
              case "make":
                return "Toyota"
              case "model":
                return "Hiace"
              case "year":
                return "2020"
              case "vehicle_type":
                return "van"
              default:
                return ""
            }
          case "employees":
            switch (col.key) {
              case "first_name":
                return "Jane"
              case "last_name":
                return "Smith"
              case "email":
                return "jane.smith@company.com"
              case "phone":
                return "+254700000001"
              case "employee_id":
                return "EMP001"
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
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        toast({
          title: "Invalid File",
          description: "File must contain at least a header row and one data row",
          variant: "destructive",
        })
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim().replace(/"/g, "")))

      const fileData = {
        headers,
        rows,
        filename: file.name,
      }

      setFileData(fileData)
      sessionStorage.setItem("importFileData", JSON.stringify(fileData))
      autoMapColumns(headers, entityType)
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
                  onClick={() => handleEntityTypeChange(key)}
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
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{column.label}</span>
                    {column.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
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
                      {fileData.headers.map((header) => (
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
                      <div key={index} className="flex items-center text-sm text-red-600">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {error}
                      </div>
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
                <CheckCircle className="mr-2 h-4 w-4" />
                Preview (First 5 rows)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {currentConfig.columns
                          .filter((col) => columnMapping[col.key])
                          .map((col) => (
                            <TableHead key={col.key} className="text-xs">
                              {col.label}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index}>
                          {currentConfig.columns
                            .filter((col) => columnMapping[col.key])
                            .map((col) => (
                              <TableCell key={col.key} className="text-xs">
                                {row[col.key] || "-"}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

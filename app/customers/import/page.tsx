"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Download } from "lucide-react"
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

const CUSTOMER_COLUMNS = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "address", label: "Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "postal_code", label: "Postal Code", required: false },
  { key: "customer_type", label: "Customer Type", required: false },
  { key: "business_name", label: "Business Name", required: false },
  { key: "business_registration", label: "Business Registration", required: false },
  { key: "id_number", label: "ID Number", required: false },
  { key: "date_of_birth", label: "Date of Birth", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "occupation", label: "Occupation", required: false },
  { key: "monthly_income", label: "Monthly Income", required: false },
  { key: "preferred_contact_method", label: "Preferred Contact Method", required: false },
  { key: "preferred_contact_time", label: "Preferred Contact Time", required: false },
  { key: "marketing_consent", label: "Marketing Consent", required: false },
  { key: "notes", label: "Notes", required: false },
]

export default function CustomerImportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [fileData, setFileData] = useState<FileData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    // Check if we have file data from the previous page
    const storedData = sessionStorage.getItem("importFileData")
    if (storedData) {
      const data = JSON.parse(storedData)
      setFileData(data)
      // Auto-map columns based on similarity
      autoMapColumns(data.headers)
    } else {
      // Redirect back to customers page if no file data
      router.push("/customers")
    }
  }, [router])

  const autoMapColumns = (headers: string[]) => {
    const mapping: ColumnMapping = {}

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim()

      // Auto-map common column names
      if (lowerHeader.includes("first") && lowerHeader.includes("name")) {
        mapping["first_name"] = header
      } else if (lowerHeader.includes("last") && lowerHeader.includes("name")) {
        mapping["last_name"] = header
      } else if (lowerHeader.includes("email")) {
        mapping["email"] = header
      } else if (lowerHeader.includes("phone")) {
        mapping["phone"] = header
      } else if (lowerHeader.includes("address")) {
        mapping["address"] = header
      } else if (lowerHeader.includes("city")) {
        mapping["city"] = header
      } else if (lowerHeader.includes("postal") || lowerHeader.includes("zip")) {
        mapping["postal_code"] = header
      } else if (lowerHeader.includes("business") && lowerHeader.includes("name")) {
        mapping["business_name"] = header
      } else if (lowerHeader.includes("type")) {
        mapping["customer_type"] = header
      }
    })

    setColumnMapping(mapping)
  }

  const handleColumnMapping = (customerColumn: string, fileColumn: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [customerColumn]: fileColumn === "none" ? "" : fileColumn,
    }))
  }

  const generatePreview = () => {
    if (!fileData) return

    const preview = fileData.rows.slice(0, 5).map((row) => {
      const mappedRow: any = {}

      CUSTOMER_COLUMNS.forEach((col) => {
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
    const requiredFields = CUSTOMER_COLUMNS.filter((col) => col.required)

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
      }

      const response = await fetch("/api/import-customers/process", {
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
          description: `Successfully imported ${result.imported} customers`,
        })

        // Clear session storage
        sessionStorage.removeItem("importFileData")

        // Redirect to customers page
        router.push("/customers")
      } else {
        const error = await response.json()
        throw new Error(error.message || "Import failed")
      }
    } catch (error) {
      console.error("[v0] Import error:", error)
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import customers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = CUSTOMER_COLUMNS.map((col) => col.label).join(",")
    const sampleRow = CUSTOMER_COLUMNS.map((col) => {
      switch (col.key) {
        case "first_name":
          return "John"
        case "last_name":
          return "Doe"
        case "email":
          return "john.doe@example.com"
        case "phone":
          return "+254700000000"
        case "address":
          return "123 Main Street"
        case "city":
          return "Nairobi"
        case "customer_type":
          return "individual"
        default:
          return ""
      }
    }).join(",")

    const csvContent = `${headers}\n${sampleRow}`
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "customer_import_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!fileData) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p>Loading import data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customers
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Import Customers</h1>
            <p className="text-muted-foreground">Map your file columns to customer fields</p>
          </div>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

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
            {CUSTOMER_COLUMNS.map((column) => (
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
                      {CUSTOMER_COLUMNS.filter((col) => columnMapping[col.key]).map((col) => (
                        <TableHead key={col.key} className="text-xs">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        {CUSTOMER_COLUMNS.filter((col) => columnMapping[col.key]).map((col) => (
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

      {/* Import Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ready to Import?</h3>
              <p className="text-sm text-muted-foreground">
                {validationErrors.length === 0
                  ? `${fileData.rows.length} customers will be imported`
                  : `Fix ${validationErrors.length} validation errors first`}
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={isLoading || validationErrors.length > 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Importing..." : "Import Customers"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

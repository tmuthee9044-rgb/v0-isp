"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface BulkImportToolProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportType = "customers" | "service_plans" | "vehicles" | "employees"

interface FieldMapping {
  dbField: string
  label: string
  required: boolean
  type: "text" | "number" | "date" | "email" | "phone" | "select"
  options?: string[]
}

const FIELD_MAPPINGS: Record<ImportType, FieldMapping[]> = {
  customers: [
    { dbField: "first_name", label: "First Name", required: true, type: "text" },
    { dbField: "last_name", label: "Last Name", required: true, type: "text" },
    { dbField: "email", label: "Email", required: false, type: "email" },
    { dbField: "phone", label: "Phone", required: true, type: "phone" },
    { dbField: "id_number", label: "ID Number", required: false, type: "text" },
    {
      dbField: "customer_type",
      label: "Customer Type",
      required: true,
      type: "select",
      options: ["individual", "business"],
    },
    { dbField: "business_name", label: "Business Name", required: false, type: "text" },
    { dbField: "address", label: "Address", required: false, type: "text" },
    { dbField: "city", label: "City", required: false, type: "text" },
    { dbField: "state", label: "State/Region", required: false, type: "text" },
    { dbField: "postal_code", label: "Postal Code", required: false, type: "text" },
    { dbField: "installation_address", label: "Installation Address", required: false, type: "text" },
    {
      dbField: "status",
      label: "Status",
      required: true,
      type: "select",
      options: ["active", "inactive", "suspended"],
    },
  ],
  service_plans: [
    { dbField: "name", label: "Plan Name", required: true, type: "text" },
    { dbField: "description", label: "Description", required: false, type: "text" },
    { dbField: "price", label: "Price", required: true, type: "number" },
    { dbField: "download_speed", label: "Download Speed (Mbps)", required: true, type: "number" },
    { dbField: "upload_speed", label: "Upload Speed (Mbps)", required: true, type: "number" },
    { dbField: "data_limit", label: "Data Limit (GB)", required: false, type: "number" },
    {
      dbField: "billing_cycle",
      label: "Billing Cycle",
      required: true,
      type: "select",
      options: ["monthly", "quarterly", "annually"],
    },
    { dbField: "status", label: "Status", required: true, type: "select", options: ["active", "inactive"] },
  ],
  vehicles: [
    { dbField: "name", label: "Vehicle Name", required: true, type: "text" },
    { dbField: "registration", label: "Registration Number", required: true, type: "text" },
    {
      dbField: "type",
      label: "Vehicle Type",
      required: true,
      type: "select",
      options: ["car", "van", "truck", "motorcycle"],
    },
    { dbField: "model", label: "Model", required: false, type: "text" },
    { dbField: "year", label: "Year", required: false, type: "number" },
    {
      dbField: "fuel_type",
      label: "Fuel Type",
      required: false,
      type: "select",
      options: ["petrol", "diesel", "electric", "hybrid"],
    },
    { dbField: "purchase_date", label: "Purchase Date", required: false, type: "date" },
    { dbField: "purchase_cost", label: "Purchase Cost", required: false, type: "number" },
    { dbField: "mileage", label: "Current Mileage", required: false, type: "number" },
    {
      dbField: "status",
      label: "Status",
      required: true,
      type: "select",
      options: ["active", "maintenance", "retired"],
    },
  ],
  employees: [
    { dbField: "employee_id", label: "Employee ID", required: true, type: "text" },
    { dbField: "first_name", label: "First Name", required: true, type: "text" },
    { dbField: "last_name", label: "Last Name", required: true, type: "text" },
    { dbField: "email", label: "Email", required: true, type: "email" },
    { dbField: "phone", label: "Phone", required: false, type: "phone" },
    { dbField: "department", label: "Department", required: false, type: "text" },
    { dbField: "position", label: "Position", required: false, type: "text" },
    { dbField: "hire_date", label: "Hire Date", required: false, type: "date" },
    { dbField: "salary", label: "Salary", required: false, type: "number" },
    { dbField: "status", label: "Status", required: true, type: "select", options: ["active", "inactive", "on_leave"] },
  ],
}

export function BulkImportTool({ open, onOpenChange }: BulkImportToolProps) {
  const { toast } = useToast()
  const [importType, setImportType] = useState<ImportType>("customers")
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [validationResults, setValidationResults] = useState<{ row: number; errors: string[] }[]>([])
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<"select" | "upload" | "preview" | "import">("select")

  const handleImportTypeChange = (type: ImportType) => {
    setImportType(type)
    // Select all required fields by default
    const requiredFields = FIELD_MAPPINGS[type].filter((f) => f.required).map((f) => f.dbField)
    setSelectedFields(requiredFields)
    setStep("select")
    setFile(null)
    setPreviewData([])
    setValidationResults([])
  }

  const toggleField = (field: string) => {
    setSelectedFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setFile(uploadedFile)
    parseCSV(uploadedFile)
  }

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim())

      const data = lines.slice(1).map((line, index) => {
        const values = line.split(",").map((v) => v.trim())
        const row: any = { _rowNumber: index + 2 }
        headers.forEach((header, i) => {
          row[header] = values[i] || ""
        })
        return row
      })

      setPreviewData(data.slice(0, 10)) // Show first 10 rows
      validateData(data)
      setStep("preview")
    }
    reader.readAsText(file)
  }

  const validateData = (data: any[]) => {
    const errors: { row: number; errors: string[] }[] = []
    const fieldMappings = FIELD_MAPPINGS[importType]

    data.forEach((row) => {
      const rowErrors: string[] = []

      fieldMappings.forEach((field) => {
        if (field.required && selectedFields.includes(field.dbField)) {
          if (!row[field.label] || row[field.label].trim() === "") {
            rowErrors.push(`${field.label} is required`)
          }
        }

        // Type validation
        if (row[field.label] && selectedFields.includes(field.dbField)) {
          if (field.type === "email" && !row[field.label].includes("@")) {
            rowErrors.push(`${field.label} must be a valid email`)
          }
          if (field.type === "number" && isNaN(Number(row[field.label]))) {
            rowErrors.push(`${field.label} must be a number`)
          }
          if (field.type === "date" && isNaN(Date.parse(row[field.label]))) {
            rowErrors.push(`${field.label} must be a valid date`)
          }
        }
      })

      if (rowErrors.length > 0) {
        errors.push({ row: row._rowNumber, errors: rowErrors })
      }
    })

    setValidationResults(errors)
  }

  const handleImport = async () => {
    if (validationResults.length > 0) {
      toast({
        title: "Validation Errors",
        description: `Please fix ${validationResults.length} validation errors before importing`,
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file!)
      formData.append("importType", importType)
      formData.append("selectedFields", JSON.stringify(selectedFields))

      const response = await fetch("/api/import/bulk", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.imported} ${importType}`,
        })
        onOpenChange(false)
        // Reset state
        setStep("select")
        setFile(null)
        setPreviewData([])
        setValidationResults([])
      } else {
        throw new Error("Import failed")
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "An error occurred during import",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const fields = FIELD_MAPPINGS[importType].filter((f) => selectedFields.includes(f.dbField))
    const headers = fields.map((f) => f.label).join(",")
    const exampleRow = fields
      .map((f) => {
        if (f.type === "date") return "2025-01-01"
        if (f.type === "number") return "100"
        if (f.type === "email") return "example@email.com"
        if (f.type === "phone") return "+254700000000"
        if (f.type === "select") return f.options?.[0] || ""
        return "Example"
      })
      .join(",")

    const csv = `${headers}\n${exampleRow}`
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${importType}_template.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Tool</DialogTitle>
          <DialogDescription>
            Import multiple records at once using CSV files. Customize fields and validate data before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select Import Type and Fields */}
          {step === "select" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Select Import Type</CardTitle>
                  <CardDescription>Choose what type of data you want to import</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={importType} onValueChange={(value) => handleImportTypeChange(value as ImportType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="service_plans">Service Plans</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="employees">Employees</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Select Fields to Import</CardTitle>
                  <CardDescription>Choose which fields you want to include in the import</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {FIELD_MAPPINGS[importType].map((field) => (
                      <div key={field.dbField} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.dbField}
                          checked={selectedFields.includes(field.dbField)}
                          onCheckedChange={() => toggleField(field.dbField)}
                          disabled={field.required}
                        />
                        <Label htmlFor={field.dbField} className="flex items-center gap-2">
                          {field.label}
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button onClick={() => setStep("upload")}>Next: Upload File</Button>
              </div>
            </>
          )}

          {/* Step 2: Upload File */}
          {step === "upload" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Upload CSV File</CardTitle>
                  <CardDescription>Upload your CSV file with the selected fields</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-sm text-muted-foreground mb-2">
                        {file ? file.name : "Click to upload or drag and drop"}
                      </div>
                      <div className="text-xs text-muted-foreground">CSV files only</div>
                    </Label>
                    <input id="file-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("select")}>
                  Back
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Preview and Validate */}
          {step === "preview" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Data Preview</CardTitle>
                  <CardDescription>
                    Showing first 10 rows.{" "}
                    {validationResults.length > 0 ? (
                      <span className="text-destructive">{validationResults.length} validation errors found</span>
                    ) : (
                      <span className="text-green-600">All data validated successfully</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          {FIELD_MAPPINGS[importType]
                            .filter((f) => selectedFields.includes(f.dbField))
                            .map((field) => (
                              <TableHead key={field.dbField}>{field.label}</TableHead>
                            ))}
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, index) => {
                          const rowErrors = validationResults.find((v) => v.row === row._rowNumber)
                          return (
                            <TableRow key={index}>
                              <TableCell>{row._rowNumber}</TableCell>
                              {FIELD_MAPPINGS[importType]
                                .filter((f) => selectedFields.includes(f.dbField))
                                .map((field) => (
                                  <TableCell key={field.dbField}>{row[field.label]}</TableCell>
                                ))}
                              <TableCell>
                                {rowErrors ? (
                                  <XCircle className="w-4 h-4 text-destructive" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {validationResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        Validation Errors
                      </h4>
                      {validationResults.slice(0, 5).map((result) => (
                        <div key={result.row} className="text-sm text-destructive">
                          Row {result.row}: {result.errors.join(", ")}
                        </div>
                      ))}
                      {validationResults.length > 5 && (
                        <div className="text-sm text-muted-foreground">
                          And {validationResults.length - 5} more errors...
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={validationResults.length > 0 || importing}>
                  {importing ? "Importing..." : "Import Data"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

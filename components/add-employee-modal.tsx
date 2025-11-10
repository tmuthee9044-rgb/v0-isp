"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Upload, X, User } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { ResponsiveModal } from "@/components/responsive-modal"

interface AddEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: any
}

export function AddEmployeeModal({ open, onOpenChange, employee }: AddEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState<Date>()
  const [startDate, setStartDate] = useState<Date>()
  const [createUserAccount, setCreateUserAccount] = useState(true)
  const [userRole, setUserRole] = useState("employee")

  const [formData, setFormData] = useState({
    firstName: employee?.first_name || "",
    lastName: employee?.last_name || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    nationalId: employee?.national_id || "",
    dateOfBirth: employee?.date_of_birth || "",
    gender: employee?.gender || "",
    maritalStatus: employee?.marital_status || "",
    address: employee?.address || "",
    emergencyContact: employee?.emergency_contact || "",
    emergencyPhone: employee?.emergency_phone || "",
    employeeId: employee?.employee_id || "",
    position: employee?.position || "",
    department: employee?.department || "",
    reportingManager: employee?.reporting_manager || "",
    employmentType: employee?.employment_type || "",
    contractType: employee?.contract_type || "",
    startDate: employee?.hire_date || "",
    probationPeriod: employee?.probation_period || "",
    workLocation: employee?.work_location || "",
    basicSalary: employee?.salary?.toString() || "",
    allowances: employee?.allowances?.toString() || "",
    benefits: employee?.benefits || "",
    payrollFrequency: employee?.payroll_frequency || "monthly",
    bankName: employee?.bank_name || "",
    bankAccount: employee?.bank_account || "",
    kraPin: employee?.kra_pin || "",
    nssfNumber: employee?.nssf_number || "",
    shaNumber: employee?.sha_number || "",
    portalUsername: employee?.portal_username || "",
    portalPassword: "",
    qualifications: employee?.qualifications || "",
    experience: employee?.experience || "",
    skills: employee?.skills || "",
    notes: employee?.notes || "",
  })

  useEffect(() => {
    if (employee) {
      if (employee.date_of_birth) {
        setDateOfBirth(new Date(employee.date_of_birth))
      }
      if (employee.hire_date) {
        setStartDate(new Date(employee.hire_date))
      }
      if (employee.photo_url) {
        setPhotoPreview(employee.photo_url)
      }
      // Set user role if available, otherwise default to employee
      setUserRole(employee.role || "employee")
    }
  }, [employee])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (field === "firstName" || field === "lastName") {
      const firstName = field === "firstName" ? value : formData.firstName
      const lastName = field === "lastName" ? value : formData.lastName
      if (firstName && lastName) {
        const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
        setFormData((prev) => ({
          ...prev,
          portalUsername: username,
        }))
      }
    }

    if (field === "position") {
      const position = value.toLowerCase()
      if (position.includes("manager") || position.includes("supervisor")) {
        setUserRole("manager")
      } else if (position.includes("technician")) {
        setUserRole("technician")
      } else if (position.includes("accountant")) {
        setUserRole("accountant")
      } else if (position.includes("admin")) {
        setUserRole("administrator")
      } else {
        setUserRole("employee")
      }
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file")
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB")
        return
      }

      setPhotoFile(file)
      // Clear existing preview if it was a URL from the employee prop
      setPhotoPreview(null)

      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.onerror = () => {
        console.error("[v0] Error reading file")
        setPhotoPreview(null)
        setPhotoFile(null)
        alert("Error reading file. Please try again.")
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const submitData = new FormData()

      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value)
      })

      if (photoFile) {
        submitData.append("photo", photoFile)
      }

      if (dateOfBirth) {
        submitData.append("dateOfBirth", dateOfBirth.toISOString())
      }
      if (startDate) {
        submitData.append("startDate", startDate.toISOString())
      }

      submitData.append("createUserAccount", createUserAccount.toString())
      submitData.append("userRole", userRole)

      const url = employee ? `/api/employees/${employee.id}` : "/api/employees"
      const method = employee ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        body: submitData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${employee ? "update" : "add"} employee`)
      }

      const result = await response.json()
      console.log(`Employee ${employee ? "updated" : "added"} successfully:`, result)

      if (!employee) {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          nationalId: "",
          dateOfBirth: "",
          gender: "",
          maritalStatus: "",
          address: "",
          emergencyContact: "",
          emergencyPhone: "",
          employeeId: "",
          position: "",
          department: "",
          reportingManager: "",
          employmentType: "",
          contractType: "",
          startDate: "",
          probationPeriod: "",
          workLocation: "",
          basicSalary: "",
          allowances: "",
          benefits: "",
          payrollFrequency: "monthly",
          bankName: "",
          bankAccount: "",
          kraPin: "",
          nssfNumber: "",
          shaNumber: "",
          portalUsername: "",
          portalPassword: "",
          qualifications: "",
          experience: "",
          skills: "",
          notes: "",
        })
        setPhotoFile(null)
        setPhotoPreview(null)
        setDateOfBirth(undefined)
        setStartDate(undefined)
        setActiveTab("personal")
        setCreateUserAccount(true)
        setUserRole("employee")
      }

      onOpenChange(false)
      window.location.reload()
    } catch (error) {
      console.error(`Error ${employee ? "updating" : "adding"} employee:`, error)
      alert(error instanceof Error ? error.message : `Failed to ${employee ? "update" : "add"} employee`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={employee ? "Edit Employee" : "Add New Employee"}
      description={
        employee ? "Update the employee's information" : "Enter the employee's information across all required sections"
      }
      className="max-w-4xl"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="personal" className="text-xs sm:text-sm">
            Personal
          </TabsTrigger>
          <TabsTrigger value="employment" className="text-xs sm:text-sm">
            Employment
          </TabsTrigger>
          <TabsTrigger value="compensation" className="text-xs sm:text-sm">
            Compensation
          </TabsTrigger>
          <TabsTrigger value="statutory" className="text-xs sm:text-sm">
            Statutory
          </TabsTrigger>
          <TabsTrigger value="access" className="text-xs sm:text-sm">
            System Access
          </TabsTrigger>
          <TabsTrigger value="additional" className="text-xs sm:text-sm">
            Additional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Personal Information</CardTitle>
              <CardDescription>Basic personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview || "/placeholder.jpg"}
                        alt="Employee photo"
                        className="w-32 h-40 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          console.log("[v0] Image load error, removing preview")
                          setPhotoPreview(null)
                          setPhotoFile(null)
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                        onLoad={() => {
                          console.log("[v0] Image loaded successfully")
                        }}
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer">
                      <User className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Passport Photo</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md border border-blue-200">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">Upload Photo</span>
                    </div>
                  </Label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    JPG, PNG up to 5MB
                    <br />
                    Passport size recommended
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="employee@company.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+254712345678"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalId">National ID *</Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) => handleInputChange("nationalId", e.target.value)}
                    placeholder="12345678"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateOfBirth && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between space-x-2">
                          <Select
                            value={dateOfBirth?.getFullYear().toString() || new Date().getFullYear().toString()}
                            onValueChange={(year) => {
                              const newDate = new Date(dateOfBirth || new Date())
                              newDate.setFullYear(Number.parseInt(year))
                              setDateOfBirth(newDate)
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={dateOfBirth?.getMonth().toString() || new Date().getMonth().toString()}
                            onValueChange={(month) => {
                              const newDate = new Date(dateOfBirth || new Date())
                              newDate.setMonth(Number.parseInt(month))
                              setDateOfBirth(newDate)
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December",
                              ].map((month, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {month}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        initialFocus
                        defaultMonth={dateOfBirth || new Date(1990, 0)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
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
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(value) => handleInputChange("maritalStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                    placeholder="+254712345678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Employment Details</CardTitle>
              <CardDescription>Job position, department, and employment terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => handleInputChange("employeeId", e.target.value)}
                    placeholder="EMP001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    placeholder="Network Engineer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportingManager">Reporting Manager</Label>
                  <Input
                    id="reportingManager"
                    value={formData.reportingManager}
                    onChange={(e) => handleInputChange("reportingManager", e.target.value)}
                    placeholder="Manager name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value) => handleInputChange("employmentType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractType">Contract Type</Label>
                  <Select
                    value={formData.contractType}
                    onValueChange={(value) => handleInputChange("contractType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="fixed-term">Fixed-term</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between space-x-2">
                          <Select
                            value={startDate?.getFullYear().toString() || new Date().getFullYear().toString()}
                            onValueChange={(year) => {
                              const newDate = new Date(startDate || new Date())
                              newDate.setFullYear(Number.parseInt(year))
                              setStartDate(newDate)
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={startDate?.getMonth().toString() || new Date().getMonth().toString()}
                            onValueChange={(month) => {
                              const newDate = new Date(startDate || new Date())
                              newDate.setMonth(Number.parseInt(month))
                              setStartDate(newDate)
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December",
                              ].map((month, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {month}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        defaultMonth={startDate || new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probationPeriod">Probation Period (months)</Label>
                  <Input
                    id="probationPeriod"
                    type="number"
                    value={formData.probationPeriod}
                    onChange={(e) => handleInputChange("probationPeriod", e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workLocation">Work Location</Label>
                <Input
                  id="workLocation"
                  value={formData.workLocation}
                  onChange={(e) => handleInputChange("workLocation", e.target.value)}
                  placeholder="Head Office, Nairobi"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Compensation & Benefits</CardTitle>
              <CardDescription>Salary, allowances, and banking information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary (KSh) *</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => handleInputChange("basicSalary", e.target.value)}
                    placeholder="85000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowances">Allowances (KSh)</Label>
                  <Input
                    id="allowances"
                    type="number"
                    value={formData.allowances}
                    onChange={(e) => handleInputChange("allowances", e.target.value)}
                    placeholder="15000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits</Label>
                <Textarea
                  id="benefits"
                  value={formData.benefits}
                  onChange={(e) => handleInputChange("benefits", e.target.value)}
                  placeholder="Medical cover, transport allowance, etc."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payrollFrequency">Payroll Frequency</Label>
                  <Select
                    value={formData.payrollFrequency}
                    onValueChange={(value) => handleInputChange("payrollFrequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange("bankName", e.target.value)}
                    placeholder="KCB Bank"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statutory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Statutory Information</CardTitle>
              <CardDescription>KRA PIN, NSSF, SHA, and portal access details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kraPin">KRA PIN *</Label>
                  <Input
                    id="kraPin"
                    value={formData.kraPin}
                    onChange={(e) => handleInputChange("kraPin", e.target.value)}
                    placeholder="A123456789Z"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nssfNumber">NSSF Number</Label>
                  <Input
                    id="nssfNumber"
                    value={formData.nssfNumber}
                    onChange={(e) => handleInputChange("nssfNumber", e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shaNumber">SHA Number</Label>
                <Input
                  id="shaNumber"
                  value={formData.shaNumber}
                  onChange={(e) => handleInputChange("shaNumber", e.target.value)}
                  placeholder="987654321"
                />
                <p className="text-sm text-muted-foreground">Social Health Authority registration number</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Portal Access</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="portalUsername">Portal Username</Label>
                    <Input
                      id="portalUsername"
                      value={formData.portalUsername}
                      onChange={(e) => handleInputChange("portalUsername", e.target.value)}
                      placeholder="john.smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portalPassword">Portal Password</Label>
                    <Input
                      id="portalPassword"
                      type="password"
                      value={formData.portalPassword}
                      onChange={(e) => handleInputChange("portalPassword", e.target.value)}
                      placeholder="Temporary password"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">System Access & User Account</CardTitle>
              <CardDescription>Configure system access and user account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Create User Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create a system user account for this employee
                  </p>
                </div>
                <Switch checked={createUserAccount} onCheckedChange={setCreateUserAccount} />
              </div>

              {createUserAccount && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="portalUsername">Username</Label>
                      <Input
                        id="portalUsername"
                        value={formData.portalUsername}
                        onChange={(e) => handleInputChange("portalUsername", e.target.value)}
                        placeholder="firstname.lastname"
                      />
                      <p className="text-xs text-muted-foreground">Auto-generated from first and last name</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userRole">System Role</Label>
                      <Select value={userRole} onValueChange={setUserRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="administrator">Administrator</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="support">Support Agent</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Auto-suggested based on position</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portalPassword">Temporary Password</Label>
                    <Input
                      id="portalPassword"
                      type="password"
                      value={formData.portalPassword}
                      onChange={(e) => handleInputChange("portalPassword", e.target.value)}
                      placeholder="Leave blank for auto-generated password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Employee will be required to change password on first login
                    </p>
                  </div>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Role Permissions Preview</h4>
                        <div className="text-xs text-muted-foreground">
                          {userRole === "administrator" && "• Full system access • User management • System settings"}
                          {userRole === "manager" && "• Department management • Reports • Staff oversight"}
                          {userRole === "technician" &&
                            "• Network operations • Technical support • Equipment management"}
                          {userRole === "accountant" && "• Financial reports • Billing management • Payment processing"}
                          {userRole === "support" && "• Customer support • Ticket management • Basic reports"}
                          {userRole === "employee" && "• Basic access • Personal information • Time tracking"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="additional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Additional Information</CardTitle>
              <CardDescription>Qualifications, experience, and other relevant details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Textarea
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={(e) => handleInputChange("qualifications", e.target.value)}
                  placeholder="Degree, certifications, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Work Experience</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleInputChange("experience", e.target.value)}
                  placeholder="Previous work experience"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => handleInputChange("skills", e.target.value)}
                  placeholder="Technical and soft skills"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any additional information"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end sm:space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting
            ? employee
              ? "Updating Employee..."
              : "Adding Employee..."
            : employee
              ? "Update Employee"
              : "Add Employee"}
        </Button>
      </div>
    </ResponsiveModal>
  )
}

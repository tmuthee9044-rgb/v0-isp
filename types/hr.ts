export interface Employee {
  id: number
  employeeId: string
  firstName: string
  lastName: string
  name: string
  email: string
  phone: string
  nationalId: string
  dateOfBirth?: Date
  gender: "male" | "female" | "other"
  maritalStatus: "single" | "married" | "divorced" | "widowed"
  address: string
  emergencyContact: string
  emergencyPhone: string

  // Employment Details
  position: string
  department: string
  reportingManager?: string
  employmentType: "full-time" | "part-time" | "contract" | "intern"
  contractType: "permanent" | "fixed-term" | "probation"
  startDate: Date
  probationPeriod?: number
  workLocation: string
  status: "active" | "inactive" | "on_leave" | "terminated"

  // Compensation
  basicSalary: number
  allowances: number
  benefits: string
  payrollFrequency: "monthly" | "bi-weekly" | "weekly"
  bankName: string
  bankAccount: string

  // Statutory Information
  kraPin: string
  nssfNumber: string
  shaNumber: string // Changed from nhifNumber to shaNumber

  // Portal Access
  portalUsername: string
  portalPassword: string

  // Leave Management
  leaveBalance: number
  sickLeaveBalance: number

  // Performance
  performanceRating: "excellent" | "good" | "satisfactory" | "needs_improvement"

  // Additional Information
  qualifications: string
  experience: string
  skills: string
  notes: string

  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: number
  employeeId: string
  employeeName: string
  leaveType: "annual" | "sick" | "maternity" | "paternity" | "compassionate" | "study" | "unpaid"
  startDate: string
  endDate: string
  days: number
  reason: string
  emergencyContact?: string
  emergencyPhone?: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  created_at: string
  updated_at: string
}

export interface PayrollRecord {
  id: number
  employeeId: string
  employeeName: string
  period: string
  basicSalary: number
  allowances: number
  overtime: number
  grossPay: number
  paye: number
  nssf: number
  sha: number // Changed from nhif to sha
  otherDeductions: number
  totalDeductions: number
  netPay: number
  status: "pending" | "processed" | "paid"
  processedBy?: string
  processedAt?: string
  created_at: string
  updated_at: string
}

export interface PerformanceReview {
  id: number
  employeeId: string
  employeeName: string
  reviewPeriod: string
  reviewType: "quarterly" | "annual" | "probation"
  rating: "excellent" | "good" | "satisfactory" | "needs_improvement" | "unsatisfactory"
  score: number
  goals: string
  achievements: string
  areasForImprovement: string
  developmentPlan: string
  reviewedBy: string
  reviewDate: string
  nextReviewDate: string
  status: "draft" | "completed" | "acknowledged"
  created_at: string
  updated_at: string
}

export interface HRSettings {
  id: number
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string

  // Leave Policies
  annualLeaveEntitlement: number
  sickLeaveEntitlement: number
  maternityLeaveEntitlement: number
  paternityLeaveEntitlement: number

  // Payroll Settings
  payrollFrequency: "monthly" | "bi-weekly" | "weekly"
  payrollCutoffDay: number
  payrollPayDay: number

  // Statutory Rates
  payeRates: Record<string, number>
  nssfRate: number
  shaRates: Record<string, number> // Changed from nhifRates to shaRates

  // Working Hours
  standardWorkingHours: number
  workingDaysPerWeek: number
  overtimeRate: number

  created_at: string
  updated_at: string
}

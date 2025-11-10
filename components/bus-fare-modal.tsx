"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { addBusFareRecord } from "@/app/actions/vehicle-actions"
import { toast } from "sonner"
import { Bus, Receipt, MapPin } from "lucide-react"

interface BusFareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BusFareModal({ open, onOpenChange, onSuccess }: BusFareModalProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      const result = await addBusFareRecord(formData)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to add bus fare record")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bus className="h-5 w-5" />
            <span>Bus Fare Reimbursement</span>
          </DialogTitle>
          <DialogDescription>Record employee bus fare for reimbursement</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employee Information</CardTitle>
              <CardDescription>Enter employee and travel details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_name">Employee Name</Label>
                  <Input id="employee_name" name="employee_name" placeholder="Full name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input id="employee_id" name="employee_id" placeholder="Employee ID number" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travel_date">Travel Date</Label>
                <Input
                  id="travel_date"
                  name="travel_date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Travel Details</span>
              </CardTitle>
              <CardDescription>Specify the travel route and purpose</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_location">From Location</Label>
                  <Input id="from_location" name="from_location" placeholder="Starting point" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to_location">To Location</Label>
                  <Input id="to_location" name="to_location" placeholder="Destination" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Travel</Label>
                <Select name="purpose" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select travel purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_visit">Client Visit</SelectItem>
                    <SelectItem value="site_inspection">Site Inspection</SelectItem>
                    <SelectItem value="installation">Installation Work</SelectItem>
                    <SelectItem value="maintenance">Maintenance Work</SelectItem>
                    <SelectItem value="meeting">Business Meeting</SelectItem>
                    <SelectItem value="training">Training/Workshop</SelectItem>
                    <SelectItem value="emergency">Emergency Call</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Receipt className="h-4 w-4" />
                <span>Payment Details</span>
              </CardTitle>
              <CardDescription>Enter the fare amount and receipt information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Fare Amount (KSh)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt_number">Receipt Number</Label>
                  <Input id="receipt_number" name="receipt_number" placeholder="Receipt/ticket number" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approved_by">Approved By</Label>
                <Select name="approved_by" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select approving manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="john_manager">John Smith - Operations Manager</SelectItem>
                    <SelectItem value="sarah_supervisor">Sarah Johnson - Field Supervisor</SelectItem>
                    <SelectItem value="mike_director">Mike Wilson - Technical Director</SelectItem>
                    <SelectItem value="admin_manager">Admin Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Reimbursement Policy</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Maximum daily bus fare: KSh 500</li>
                  <li>• Receipts required for amounts above KSh 100</li>
                  <li>• Submit within 7 days of travel</li>
                  <li>• Manager approval required for all claims</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Bus Fare Claim"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

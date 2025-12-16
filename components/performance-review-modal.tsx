"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface PerformanceReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PerformanceReviewModal({ open, onOpenChange }: PerformanceReviewModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [reviewPeriod, setReviewPeriod] = useState("")
  const [rating, setRating] = useState("")
  const [score, setScore] = useState("")
  const [goals, setGoals] = useState("")
  const [achievements, setAchievements] = useState("")
  const [areasForImprovement, setAreasForImprovement] = useState("")
  const [developmentPlan, setDevelopmentPlan] = useState("")
  const [reviewedBy, setReviewedBy] = useState("")
  const [reviewDate, setReviewDate] = useState("")
  const [nextReviewDate, setNextReviewDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      fetchEmployees()
      // Set default dates
      const today = new Date().toISOString().split("T")[0]
      setReviewDate(today)

      // Set next review to 3 months from now
      const nextReview = new Date()
      nextReview.setMonth(nextReview.getMonth() + 3)
      setNextReviewDate(nextReview.toISOString().split("T")[0])
    }
  }, [open])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees")
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/hr/performance-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          reviewPeriod,
          reviewType: "quarterly",
          rating,
          score: Number.parseInt(score) || 0,
          goals,
          achievements,
          areasForImprovement,
          developmentPlan,
          reviewedBy,
          reviewDate,
          nextReviewDate,
        }),
      })

      if (response.ok) {
        // Reset form and close modal
        resetForm()
        onOpenChange(false)

        // Dispatch custom event to refresh the performance reviews list
        window.dispatchEvent(new CustomEvent("reviewAdded"))
      } else {
        console.error("Failed to submit performance review")
      }
    } catch (error) {
      console.error("Error submitting performance review:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedEmployee("")
    setReviewPeriod("")
    setRating("")
    setScore("")
    setGoals("")
    setAchievements("")
    setAreasForImprovement("")
    setDevelopmentPlan("")
    setReviewedBy("")
    setReviewDate("")
    setNextReviewDate("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Performance Review</DialogTitle>
          <DialogDescription>Create a comprehensive performance evaluation for an employee</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.employee_id} value={employee.employee_id}>
                      {employee.name} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewPeriod">Review Period *</Label>
              <Input
                id="reviewPeriod"
                value={reviewPeriod}
                onChange={(e) => setReviewPeriod(e.target.value)}
                placeholder="e.g., Q1 2024"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rating">Overall Rating *</Label>
              <Select value={rating} onValueChange={setRating} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="satisfactory">Satisfactory</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">Performance Score (0-100) *</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter score"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Goals Set *</Label>
            <Textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="List the goals that were set for this review period..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="achievements">Key Achievements *</Label>
            <Textarea
              id="achievements"
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="Describe the employee's key achievements during this period..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areasForImprovement">Areas for Improvement</Label>
            <Textarea
              id="areasForImprovement"
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              placeholder="Identify areas where the employee can improve..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="developmentPlan">Development Plan</Label>
            <Textarea
              id="developmentPlan"
              value={developmentPlan}
              onChange={(e) => setDevelopmentPlan(e.target.value)}
              placeholder="Outline the development plan for the next period..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="reviewedBy">Reviewed By *</Label>
              <Input
                id="reviewedBy"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                placeholder="Manager name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewDate">Review Date *</Label>
              <Input
                id="reviewDate"
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextReviewDate">Next Review Date</Label>
              <Input
                id="nextReviewDate"
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong>Review Guidelines:</strong>
                </p>
                <p>• Be specific and provide concrete examples</p>
                <p>• Focus on both strengths and areas for development</p>
                <p>• Set SMART goals for the next review period</p>
                <p>• Maintain professionalism and constructive feedback</p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedEmployee ||
                !reviewPeriod ||
                !rating ||
                !score ||
                !goals.trim() ||
                !achievements.trim() ||
                !reviewedBy.trim() ||
                !reviewDate
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import type React from "react"
import { useToast } from "@/components/ui/use-toast" // Import useToast hook

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Calculator, TrendingUp, TrendingDown } from "lucide-react"

interface BudgetManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onBudgetSaved: () => void
}

interface BudgetItem {
  id?: number
  category: string
  budgeted_amount: number
  actual_amount: number
  notes: string
  variance?: number
}

export function BudgetManagementModal({ isOpen, onClose, onBudgetSaved }: BudgetManagementModalProps) {
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear())
  const [budgetPeriod, setBudgetPeriod] = useState("annual")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast() // Declare useToast hook

  const fetchBudgets = async () => {
    try {
      const response = await fetch("/api/finance/budget")
      const data = await response.json()
      setBudgets(data.budgets || [])
    } catch (error) {
      console.error("Error fetching budgets:", error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchBudgets()
    }
  }, [isOpen])

  const addBudgetItem = () => {
    setBudgets([
      ...budgets,
      {
        category: "",
        budgeted_amount: 0,
        actual_amount: 0,
        notes: "",
      },
    ])
  }

  const removeBudgetItem = (index: number) => {
    if (budgets.length > 1) {
      setBudgets(budgets.filter((_, i) => i !== index))
    }
  }

  const updateBudgetItem = (index: number, field: keyof BudgetItem, value: string | number) => {
    const updatedBudgets = [...budgets]
    updatedBudgets[index] = { ...updatedBudgets[index], [field]: value }
    setBudgets(updatedBudgets)
  }

  const calculateTotalBudgeted = () => {
    return budgets.reduce((sum, item) => {
      const amount =
        typeof item.budgeted_amount === "number"
          ? item.budgeted_amount
          : Number.parseFloat(String(item.budgeted_amount || 0))
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
  }

  const calculateTotalActual = () => {
    return budgets.reduce((sum, item) => {
      const amount =
        typeof item.actual_amount === "number" ? item.actual_amount : Number.parseFloat(String(item.actual_amount || 0))
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
  }

  const calculateTotalVariance = () => {
    const totalBudgeted = calculateTotalBudgeted()
    const totalActual = calculateTotalActual()
    return totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 5) return "text-red-600"
    if (variance < -5) return "text-green-600"
    return "text-yellow-600"
  }

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numericAmount = typeof amount === "number" ? amount : Number.parseFloat(String(amount || 0))
    const validAmount = isNaN(numericAmount) ? 0 : numericAmount
    return `KES ${validAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const budgetData = {
        budgets: budgets.filter((budget) => budget.category && budget.budgeted_amount > 0),
        budget_year: budgetYear,
        budget_period: budgetPeriod,
      }

      const response = await fetch("/api/finance/budget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(budgetData),
      })

      if (!response.ok) {
        throw new Error("Failed to save budget")
      }

      toast({
        title: "Budget Saved",
        description: "Budget has been saved successfully.",
      })

      onBudgetSaved()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save budget. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Budget</DialogTitle>
          <DialogDescription>Set and manage budget allocations for different categories</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Budget Period Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_year">Budget Year</Label>
              <Select value={budgetYear.toString()} onValueChange={(value) => setBudgetYear(Number.parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() + i - 2
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget_period">Budget Period</Label>
              <Select value={budgetPeriod} onValueChange={setBudgetPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Budget Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Budget Categories</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addBudgetItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgets.map((budget, index) => {
                const variance =
                  budget.budgeted_amount > 0
                    ? ((budget.actual_amount - budget.budgeted_amount) / budget.budgeted_amount) * 100
                    : 0

                return (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
                    <div className="col-span-3 space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={budget.category}
                        onChange={(e) => updateBudgetItem(index, "category", e.target.value)}
                        placeholder="Budget category"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Budgeted (KES)</Label>
                      <Input
                        type="number"
                        value={budget.budgeted_amount}
                        onChange={(e) =>
                          updateBudgetItem(index, "budgeted_amount", Number.parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Actual (KES)</Label>
                      <Input
                        type="number"
                        value={budget.actual_amount}
                        onChange={(e) =>
                          updateBudgetItem(index, "actual_amount", Number.parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Variance</Label>
                      <div className="flex items-center gap-2">
                        {variance > 0 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : variance < 0 ? (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        ) : null}
                        <span className={`text-sm font-medium ${getVarianceColor(variance)}`}>
                          {formatPercentage(variance)}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Notes</Label>
                      <Input
                        value={budget.notes}
                        onChange={(e) => updateBudgetItem(index, "notes", e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeBudgetItem(index)}
                        disabled={budgets.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Budget Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Budget Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg md:text-xl font-bold text-blue-600 break-words">
                    {formatCurrency(calculateTotalBudgeted())}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Total Budgeted</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg md:text-xl font-bold text-green-600 break-words">
                    {formatCurrency(calculateTotalActual())}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Total Actual</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div
                    className={`text-lg md:text-xl font-bold break-words ${getVarianceColor(calculateTotalVariance())}`}
                  >
                    {formatPercentage(calculateTotalVariance())}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Overall Variance</div>
                </div>
              </div>

              <div className="mt-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Budget Performance:</span>
                  <Badge
                    variant={
                      calculateTotalVariance() > 5
                        ? "destructive"
                        : calculateTotalVariance() < -5
                          ? "default"
                          : "secondary"
                    }
                  >
                    {calculateTotalVariance() > 5
                      ? "Over Budget"
                      : calculateTotalVariance() < -5
                        ? "Under Budget"
                        : "On Track"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {calculateTotalVariance() > 5
                    ? "Expenses are exceeding budget allocations. Consider reviewing spending or adjusting budgets."
                    : calculateTotalVariance() < -5
                      ? "Spending is below budget. This may indicate cost savings or underutilization of resources."
                      : "Budget performance is within acceptable variance range."}
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || budgets.length === 0}>
              {isLoading ? "Saving..." : "Save Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

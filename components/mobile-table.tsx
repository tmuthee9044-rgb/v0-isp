"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface MobileTableProps {
  data: any[]
  renderCard: (item: any, index: number) => React.ReactNode
  emptyMessage?: string
}

export function MobileTable({ data, renderCard, emptyMessage = "No data available" }: MobileTableProps) {
  if (data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    )
  }

  return <div className="space-y-3">{data.map((item, index) => renderCard(item, index))}</div>
}

export function CustomerMobileCard({ customer, onEdit, onDelete }: any) {
  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">{customer.name}</h3>
            <p className="text-xs text-muted-foreground">{customer.email}</p>
          </div>
          <Badge variant={customer.status === "active" ? "default" : "secondary"}>{customer.status}</Badge>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone:</span>
            <span>{customer.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan:</span>
            <span>{customer.plan || "No plan"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Fee:</span>
            <span>KSh {customer.monthly_fee || "0"}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => onEdit(customer)} className="flex-1 text-xs">
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(customer.id)} className="flex-1 text-xs">
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

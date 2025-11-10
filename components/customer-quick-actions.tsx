"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Zap,
  CreditCard,
  MessageSquare,
  Headphones,
  Settings,
  Wifi,
  WifiOff,
  Pause,
  Play,
  MoreHorizontal,
} from "lucide-react"

interface CustomerQuickActionsProps {
  customer: {
    id: number
    name: string
    status: string
    balance: number
  }
  onAction: (action: string) => void
}

export function CustomerQuickActions({ customer, onAction }: CustomerQuickActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleAction = async (action: string) => {
    setIsLoading(action)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
      onAction(action)
    } finally {
      setIsLoading(null)
    }
  }

  const quickActions = [
    {
      id: "payment",
      label: "Process Payment",
      icon: CreditCard,
      color: "text-green-600",
      description: "Record a new payment",
    },
    {
      id: "message",
      label: "Send Message",
      icon: MessageSquare,
      color: "text-blue-600",
      description: "Send email or SMS",
    },
    {
      id: "ticket",
      label: "Create Ticket",
      icon: Headphones,
      color: "text-purple-600",
      description: "Open support ticket",
    },
    {
      id: "service",
      label: "Manage Service",
      icon: customer.status === "active" ? Wifi : WifiOff,
      color: customer.status === "active" ? "text-green-600" : "text-red-600",
      description: customer.status === "active" ? "Service is active" : "Service suspended",
    },
  ]

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{customer.name}</CardTitle>
            <CardDescription>Customer ID: {customer.id}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={customer.status === "active" ? "default" : "destructive"}
              className={customer.status === "active" ? "bg-green-100 text-green-800" : ""}
            >
              {customer.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Service Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAction("suspend")}>
                  <Pause className="mr-2 h-4 w-4" />
                  Suspend Service
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("resume")}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume Service
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAction("settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Account Balance</span>
          <span className={`font-semibold ${customer.balance < 0 ? "text-red-600" : "text-green-600"}`}>
            KES {Math.round(customer.balance)} {/* Removed .toFixed(2) and added Math.round */}
          </span>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleAction(action.id)}
              disabled={isLoading === action.id}
              className="flex items-center justify-start space-x-2 h-auto p-3"
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <div className="text-left">
                <div className="text-xs font-medium">{action.label}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
              {isLoading === action.id && <Zap className="h-3 w-3 animate-spin ml-auto" />}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

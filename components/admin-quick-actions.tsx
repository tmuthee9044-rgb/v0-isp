"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus, FileText, Settings, AlertTriangle, DollarSign, MessageSquare } from "lucide-react"
import Link from "next/link"

const quickActions = [
  {
    title: "Add New Customer",
    description: "Register a new customer and set up their service plan",
    icon: UserPlus,
    href: "/customers/add",
    color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    category: "Customer Management",
  },
  {
    title: "Generate Invoice",
    description: "Create and send invoices to customers",
    icon: FileText,
    href: "/billing",
    color: "bg-green-50 text-green-600 hover:bg-green-100",
    category: "Billing",
  },
  {
    title: "System Settings",
    description: "Configure system settings and preferences",
    icon: Settings,
    href: "/settings",
    color: "bg-gray-50 text-gray-600 hover:bg-gray-100",
    category: "Administration",
  },
  {
    title: "Process Payments",
    description: "Review and process customer payments",
    icon: DollarSign,
    href: "/billing/payments",
    color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
    category: "Finance",
  },
  {
    title: "Support Tickets",
    description: "Manage customer support requests",
    icon: MessageSquare,
    href: "/support",
    color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
    category: "Support",
  },
]

const systemAlerts = [
  {
    id: 1,
    title: "High Customer Activity",
    description: "Increased customer registrations this week - review capacity",
    severity: "info",
    time: "5m ago",
    action: "View Details",
  },
  {
    id: 2,
    title: "Scheduled Maintenance",
    description: "System maintenance scheduled for tonight at 2 AM",
    severity: "info",
    time: "1h ago",
    action: "Schedule",
  },
  {
    id: 3,
    title: "Payment Gateway Issue",
    description: "M-Pesa integration experiencing delays",
    severity: "error",
    time: "2h ago",
    action: "Investigate",
  },
]

export function AdminQuickActions() {
  return (
    <div className="space-y-6">
      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link key={index} href={action.href}>
                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-0 bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-gray-100">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${action.color} transition-colors`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="font-medium text-sm">{action.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
                          <Badge variant="outline" className="text-xs">
                            {action.category}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
            System Alerts
          </CardTitle>
          <CardDescription>Important notifications requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  alert.severity === "error"
                    ? "bg-red-50 border-red-200"
                    : alert.severity === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      alert.severity === "error"
                        ? "bg-red-500"
                        : alert.severity === "warning"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {alert.action}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

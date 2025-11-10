"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, XCircle, Clock, Users, Activity, AlertTriangle, Router } from "lucide-react"

interface SuspensionSummaryProps {
  customerId: number
}

interface ProvisioningStatus {
  customer: {
    status: string
    total_services: number
    active_services: number
    suspended_services: number
    failed_syncs: number
  }
  services: any[]
  recentLogs: any[]
}

export function CustomerSuspensionSummary({ customerId }: SuspensionSummaryProps) {
  const [status, setStatus] = useState<ProvisioningStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProvisioningStatus()
  }, [customerId])

  const fetchProvisioningStatus = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/provisioning-status`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error fetching provisioning status:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading suspension status...</div>
  }

  if (!status) {
    return <div className="text-red-500">Failed to load suspension status</div>
  }

  const getStatusColor = (customerStatus: string) => {
    switch (customerStatus) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "suspended":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (customerStatus: string) => {
    switch (customerStatus) {
      case "active":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "suspended":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "inactive":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Customer Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(status.customer.status)}
              <span>Service Status Overview</span>
            </div>
            <Badge className={getStatusColor(status.customer.status)}>{status.customer.status.toUpperCase()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{status.customer.total_services}</div>
              <div className="text-sm text-gray-500">Total Services</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{status.customer.active_services}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{status.customer.suspended_services}</div>
              <div className="text-sm text-gray-500">Suspended</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{status.customer.failed_syncs}</div>
              <div className="text-sm text-gray-500">Sync Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Router Activity */}
      {status.recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Router Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.recentLogs.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.status === "success"
                          ? "bg-green-500"
                          : log.status === "failed"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)} {log.service_type}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(log.executed_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Service Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {status.services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col">
                    <div className="font-medium">{service.service_name || "Unknown Service"}</div>
                    <div className="text-sm text-gray-500">
                      {service.ip_address && `IP: ${service.ip_address}`}
                      {service.router_id && ` • Router: ${service.router_id}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {service.router_sync_status === "failed" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {service.router_sync_status === "synced" && <Router className="h-4 w-4 text-green-500" />}
                  <Badge className={getStatusColor(service.status)}>{service.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

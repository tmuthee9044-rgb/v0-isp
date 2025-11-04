"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, AlertCircle, XCircle, Clock, Wifi, WifiOff } from "lucide-react"

interface CustomerStatusIndicatorProps {
  status: string
  connectionQuality?: number
  lastSeen?: string
  showDetails?: boolean
}

export function CustomerStatusIndicator({
  status,
  connectionQuality,
  lastSeen,
  showDetails = false,
}: CustomerStatusIndicatorProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-100",
          borderColor: "border-green-200",
          label: "Active",
          description: "Service is running normally",
        }
      case "suspended":
        return {
          icon: AlertCircle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          borderColor: "border-yellow-200",
          label: "Suspended",
          description: "Service temporarily suspended",
        }
      case "inactive":
        return {
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-100",
          borderColor: "border-red-200",
          label: "Inactive",
          description: "Service is not active",
        }
      case "pending":
        return {
          icon: Clock,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          borderColor: "border-blue-200",
          label: "Pending",
          description: "Service activation pending",
        }
      default:
        return {
          icon: XCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          borderColor: "border-gray-200",
          label: "Unknown",
          description: "Status unknown",
        }
    }
  }

  const config = getStatusConfig(status)
  const StatusIcon = config.icon

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
            {connectionQuality && <p>Connection: {connectionQuality}%</p>}
            {lastSeen && <p>Last seen: {lastSeen}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center space-x-3">
      <div
        className={`flex items-center space-x-2 px-3 py-1 rounded-full ${config.bgColor} ${config.borderColor} border`}
      >
        <StatusIcon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      </div>
      {connectionQuality !== undefined && (
        <div className="flex items-center space-x-1">
          {connectionQuality > 0 ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" />
          )}
          <span className="text-sm text-muted-foreground">{connectionQuality}%</span>
        </div>
      )}
      {lastSeen && <span className="text-xs text-muted-foreground">Last seen: {lastSeen}</span>}
    </div>
  )
}

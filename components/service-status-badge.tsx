import { Badge } from "@/components/ui/badge"
import { Activity, AlertCircle, CheckCircle, Clock, Pause, XCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ServiceStatusBadgeProps {
  status: string
  isOnline?: boolean
  lastSessionAt?: string
  routerProvisioned?: boolean
  radiusProvisioned?: boolean
  balance?: number
}

export function ServiceStatusBadge({
  status,
  isOnline,
  lastSessionAt,
  routerProvisioned,
  radiusProvisioned,
  balance,
}: ServiceStatusBadgeProps) {
  const getStatusConfig = () => {
    // Customer is actively browsing (has RADIUS session)
    if (isOnline) {
      return {
        label: "Online",
        icon: Activity,
        className: "bg-green-600 text-white hover:bg-green-700",
        description: "Customer is actively browsing",
      }
    }

    // Service is provisioned and ready, awaiting payment
    if (status === "provisioned" && balance && balance < 0) {
      return {
        label: "Provisioned - Awaiting Payment",
        icon: Clock,
        className: "bg-orange-500 text-white hover:bg-orange-600",
        description: "Service ready but payment pending",
      }
    }

    // Service is provisioned but customer not connected
    if ((status === "provisioned" || status === "active") && routerProvisioned && radiusProvisioned) {
      return {
        label: "Provisioned",
        icon: CheckCircle,
        className: "bg-blue-600 text-white hover:bg-blue-700",
        description: "Service ready, customer not connected",
      }
    }

    // Service is suspended (temporarily disabled)
    if (status === "suspended") {
      return {
        label: "Suspended",
        icon: Pause,
        className: "bg-yellow-600 text-white hover:bg-yellow-700",
        description: "Service temporarily disabled",
      }
    }

    // Service is inactive (not set up yet)
    if (status === "inactive" || status === "pending") {
      return {
        label: "Inactive",
        icon: AlertCircle,
        className: "bg-gray-500 text-white hover:bg-gray-600",
        description: "Service not set up yet",
      }
    }

    // Service is terminated
    if (status === "terminated") {
      return {
        label: "Terminated",
        icon: XCircle,
        className: "bg-red-600 text-white hover:bg-red-700",
        description: "Service has been terminated",
      }
    }

    // Default active status
    return {
      label: "Active",
      icon: CheckCircle,
      className: "bg-green-600 text-white hover:bg-green-700",
      description: "Service is active",
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.className} text-xs sm:text-sm gap-1.5`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{config.description}</p>
            {lastSessionAt && <p className="text-xs">Last seen: {new Date(lastSessionAt).toLocaleString()}</p>}
            {routerProvisioned !== undefined && radiusProvisioned !== undefined && (
              <div className="text-xs space-y-0.5 pt-1 border-t">
                <p>Router: {routerProvisioned ? "✓" : "✗"}</p>
                <p>RADIUS: {radiusProvisioned ? "✓" : "✗"}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface SubnetDetails {
  id: number
  name: string
  network: string
  gateway: string
  status: string
  description: string
  total_ips: number
  used_ips: number
  available_ips: number
  router_name: string
}

interface IPAddress {
  id: number
  ip_address: string
  status: string
  customer_name: string
  assigned_at: string
}

export default function SubnetViewPage() {
  const searchParams = useSearchParams()
  const subnetId = searchParams.get("id")

  const [subnet, setSubnet] = useState<SubnetDetails | null>(null)
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (subnetId) {
      fetchSubnetDetails()
      fetchIPAddresses()
    }
  }, [subnetId])

  const fetchSubnetDetails = async () => {
    try {
      const response = await fetch(`/api/network/subnets/${subnetId}`)
      const data = await response.json()
      setSubnet(data)
    } catch (error) {
      console.error("[v0] Error fetching subnet details:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchIPAddresses = async () => {
    try {
      const response = await fetch(`/api/network/subnets/${subnetId}/ips`)
      const data = await response.json()
      setIpAddresses(data)
    } catch (error) {
      console.error("[v0] Error fetching IP addresses:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!subnet) {
    return <div className="p-6">Subnet not found</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{subnet.name}</h1>
        <p className="text-muted-foreground">{subnet.network}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subnet.total_ips}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Used IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{subnet.used_ips}</div>
            <p className="text-xs text-muted-foreground">
              {subnet.total_ips > 0 ? ((subnet.used_ips / subnet.total_ips) * 100).toFixed(1) : 0}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{subnet.available_ips}</div>
            <p className="text-xs text-muted-foreground">
              {subnet.total_ips > 0 ? ((subnet.available_ips / subnet.total_ips) * 100).toFixed(1) : 0}% free
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={subnet.status === "active" ? "default" : "secondary"}>{subnet.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subnet Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Gateway:</span>
            <span>{subnet.gateway}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Router:</span>
            <span>{subnet.router_name || "Not assigned"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Description:</span>
            <span>{subnet.description || "No description"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IP Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Assigned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ipAddresses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No IP addresses found
                  </TableCell>
                </TableRow>
              ) : (
                ipAddresses.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono">{ip.ip_address}</TableCell>
                    <TableCell>
                      <Badge variant={ip.status === "assigned" ? "default" : "secondary"}>{ip.status}</Badge>
                    </TableCell>
                    <TableCell>{ip.customer_name || "-"}</TableCell>
                    <TableCell>{ip.assigned_at ? new Date(ip.assigned_at).toLocaleDateString() : "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

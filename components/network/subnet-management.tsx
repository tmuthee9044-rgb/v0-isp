"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Settings, Trash2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface IPSubnet {
  id: number
  name: string
  cidr: string
  router_id: number
  router_name: string
  type: string
  allocation_mode: string
  description?: string
  total_ips: number
  assigned_ips: number
  available_ips: number
  created_at: string
}

interface Router {
  id: number
  name: string
  hostname: string
  status: string
}

const SubnetManagement = () => {
  const [subnets, setSubnets] = useState<IPSubnet[]>([])
  const [routers, setRouters] = useState<Router[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSubnets()
    fetchRouters()
  }, [])

  const fetchSubnets = async () => {
    try {
      const response = await fetch("/api/network/subnets")
      if (response.ok) {
        const data = await response.json()
        setSubnets(data)
      }
    } catch (error) {
      console.error("Failed to fetch subnets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch subnets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRouters = async () => {
    try {
      const response = await fetch("/api/network/routers")
      if (response.ok) {
        const data = await response.json()
        setRouters(data.filter((r: Router) => r.status === "connected"))
      }
    } catch (error) {
      console.error("Failed to fetch routers:", error)
    }
  }

  const handleAddSubnet = async (formData: FormData) => {
    try {
      const response = await fetch("/api/network/subnets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          cidr: formData.get("cidr"),
          router_id: Number.parseInt(formData.get("router_id") as string),
          type: formData.get("type"),
          allocation_mode: formData.get("allocation_mode"),
          description: formData.get("description"),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Subnet created successfully",
        })
        setIsAddDialogOpen(false)
        fetchSubnets()
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to create subnet")
      }
    } catch (error) {
      console.error("Failed to create subnet:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create subnet",
        variant: "destructive",
      })
    }
  }

  const deleteSubnet = async (subnetId: number) => {
    if (!confirm("Are you sure you want to delete this subnet? This will also delete all associated IP addresses."))
      return

    try {
      const response = await fetch(`/api/network/subnets/${subnetId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Subnet deleted successfully",
        })
        fetchSubnets()
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete subnet")
      }
    } catch (error) {
      console.error("Failed to delete subnet:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete subnet",
        variant: "destructive",
      })
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "public":
        return <Badge variant="default">Public</Badge>
      case "private":
        return <Badge variant="secondary">Private</Badge>
      case "cgnat":
        return <Badge variant="outline">CGNAT</Badge>
      case "ipv6":
        return <Badge>IPv6</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const getUtilizationBadge = (assigned: number, total: number) => {
    const percentage = total > 0 ? (assigned / total) * 100 : 0
    if (percentage < 70) return <Badge variant="default">{percentage.toFixed(1)}%</Badge>
    if (percentage < 90) return <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
    return <Badge variant="destructive">{percentage.toFixed(1)}%</Badge>
  }

  if (loading) {
    return <div>Loading subnets...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>IP Subnet Management</CardTitle>
            <CardDescription>Manage IP subnets and monitor address allocation</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Subnet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form action={handleAddSubnet}>
                <DialogHeader>
                  <DialogTitle>Add New Subnet</DialogTitle>
                  <DialogDescription>Create a new IP subnet for customer allocation.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input id="name" name="name" placeholder="Customer Pool 1" className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cidr" className="text-right">
                      CIDR
                    </Label>
                    <Input id="cidr" name="cidr" placeholder="192.168.100.0/24" className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="router_id" className="text-right">
                      Router
                    </Label>
                    <Select name="router_id" required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select router" />
                      </SelectTrigger>
                      <SelectContent>
                        {routers.map((router) => (
                          <SelectItem key={router.id} value={router.id.toString()}>
                            {router.name} ({router.hostname})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">
                      Type
                    </Label>
                    <Select name="type" required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="cgnat">CGNAT</SelectItem>
                        <SelectItem value="ipv6">IPv6</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="allocation_mode" className="text-right">
                      Allocation
                    </Label>
                    <Select name="allocation_mode" required>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select allocation mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dynamic">Dynamic</SelectItem>
                        <SelectItem value="static">Static</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="Optional description"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Subnet</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>CIDR</TableHead>
              <TableHead>Router</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>Available IPs</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subnets.map((subnet) => (
              <TableRow key={subnet.id}>
                <TableCell className="font-medium">{subnet.name}</TableCell>
                <TableCell className="font-mono">{subnet.cidr}</TableCell>
                <TableCell>{subnet.router_name}</TableCell>
                <TableCell>{getTypeBadge(subnet.type)}</TableCell>
                <TableCell className="capitalize">{subnet.allocation_mode}</TableCell>
                <TableCell>{getUtilizationBadge(subnet.assigned_ips, subnet.total_ips)}</TableCell>
                <TableCell>{subnet.available_ips}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteSubnet(subnet.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export { SubnetManagement }
export default SubnetManagement

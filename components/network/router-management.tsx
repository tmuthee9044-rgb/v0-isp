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
import { Plus, Settings, Trash2, TestTube, RefreshCw } from "lucide-react"
import type { Router } from "@/lib/network-utils"
import { useToast } from "@/hooks/use-toast"
import { AddRouterWizard } from "./add-router-wizard"

export function RouterManagement() {
  const [routers, setRouters] = useState<Router[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [testingConnection, setTestingConnection] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchRouters()
  }, [])

  const fetchRouters = async () => {
    try {
      const response = await fetch("/api/network/routers")
      if (response.ok) {
        const data = await response.json()
        setRouters(data)
      }
    } catch (error) {
      console.error("Failed to fetch routers:", error)
      toast({
        title: "Error",
        description: "Failed to fetch routers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddRouter = async (formData: FormData) => {
    try {
      const response = await fetch("/api/network/routers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          type: formData.get("type"),
          ip_address: formData.get("ip_address"),
          username: formData.get("username"),
          password: formData.get("password"),
          port: Number.parseInt(formData.get("port") as string) || 22,
          location: formData.get("location"),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Router added successfully",
        })
        setIsAddDialogOpen(false)
        fetchRouters()
      } else {
        throw new Error("Failed to add router")
      }
    } catch (error) {
      console.error("Failed to add router:", error)
      toast({
        title: "Error",
        description: "Failed to add router",
        variant: "destructive",
      })
    }
  }

  const testConnection = async (routerId: number) => {
    setTestingConnection(routerId)
    try {
      const response = await fetch(`/api/network/routers/${routerId}/test`, {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: result.success ? "Connection Successful" : "Connection Failed",
          description: result.message,
          variant: result.success ? "default" : "destructive",
        })

        if (result.success) {
          fetchRouters() // Refresh to show updated sync status
        }
      }
    } catch (error) {
      console.error("Connection test failed:", error)
      toast({
        title: "Error",
        description: "Connection test failed",
        variant: "destructive",
      })
    } finally {
      setTestingConnection(null)
    }
  }

  const deleteRouter = async (routerId: number) => {
    if (!confirm("Are you sure you want to delete this router?")) return

    try {
      const response = await fetch(`/api/network/routers/${routerId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Router deleted successfully",
        })
        fetchRouters()
      }
    } catch (error) {
      console.error("Failed to delete router:", error)
      toast({
        title: "Error",
        description: "Failed to delete router",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "maintenance":
        return <Badge variant="outline">Maintenance</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSyncStatusBadge = (syncStatus: string) => {
    switch (syncStatus) {
      case "success":
        return <Badge variant="default">Synced</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "syncing":
        return <Badge variant="outline">Syncing</Badge>
      default:
        return <Badge variant="secondary">{syncStatus}</Badge>
    }
  }

  if (loading) {
    return <div>Loading routers...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Router Management</CardTitle>
            <CardDescription>Manage your network routers and monitor their status</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Router (Wizard)
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Quick Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form action={handleAddRouter}>
                  <DialogHeader>
                    <DialogTitle>Add New Router</DialogTitle>
                    <DialogDescription>Add a new router to your network management system.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" name="name" placeholder="Router name" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="type" className="text-right">
                        Type
                      </Label>
                      <Select name="type" required>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select router type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mikrotik">MikroTik</SelectItem>
                          <SelectItem value="ubiquiti">Ubiquiti</SelectItem>
                          <SelectItem value="juniper">Juniper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="ip_address" className="text-right">
                        IP Address
                      </Label>
                      <Input
                        id="ip_address"
                        name="ip_address"
                        placeholder="192.168.1.1"
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Username
                      </Label>
                      <Input id="username" name="username" placeholder="admin" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">
                        Password
                      </Label>
                      <Input id="password" name="password" type="password" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="port" className="text-right">
                        Port
                      </Label>
                      <Input id="port" name="port" type="number" placeholder="22" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="location" className="text-right">
                        Location
                      </Label>
                      <Input id="location" name="location" placeholder="Main Office" className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Router</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sync Status</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routers.map((router) => (
              <TableRow key={router.id}>
                <TableCell className="font-medium">{router.name}</TableCell>
                <TableCell className="capitalize">{router.type}</TableCell>
                <TableCell>{router.ip_address}</TableCell>
                <TableCell>{router.location || "-"}</TableCell>
                <TableCell>{getStatusBadge(router.status)}</TableCell>
                <TableCell>{getSyncStatusBadge(router.sync_status)}</TableCell>
                <TableCell>{router.last_sync ? new Date(router.last_sync).toLocaleString() : "Never"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(router.id)}
                      disabled={testingConnection === router.id}
                    >
                      {testingConnection === router.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteRouter(router.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <AddRouterWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onSuccess={fetchRouters} />
    </Card>
  )
}

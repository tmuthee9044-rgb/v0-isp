"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Wifi, WifiOff, TestTube } from "lucide-react"
import { toast } from "sonner"

interface Router {
  id: number
  name: string
  type: "mikrotik" | "ubiquiti" | "juniper" | "other"
  location_id: number
  location_name?: string
  connection_type: "public_ip" | "private_ip" | "vpn"
  hostname: string
  api_port: number
  ssh_port: number
  username: string
  status: "connected" | "disconnected"
  created_at: string
  updated_at: string
}

interface Location {
  id: number
  name: string
  city: string
  region: string
}

export default function RoutersPage() {
  const [routers, setRouters] = useState<Router[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRouter, setEditingRouter] = useState<Router | null>(null)
  const [testingConnection, setTestingConnection] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    type: "mikrotik" as const,
    location_id: "",
    connection_type: "public_ip" as const,
    hostname: "",
    api_port: 8728,
    ssh_port: 22,
    username: "",
    password: "",
  })

  useEffect(() => {
    fetchRouters()
    fetchLocations()
  }, [])

  const fetchRouters = async () => {
    try {
      const response = await fetch("/api/network/routers")
      if (response.ok) {
        const data = await response.json()
        setRouters(data)
      }
    } catch (error) {
      console.error("Error fetching routers:", error)
      toast.error("Failed to fetch routers")
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingRouter ? `/api/network/routers/${editingRouter.id}` : "/api/network/routers"
      const method = editingRouter ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingRouter ? "Router updated successfully" : "Router added successfully")
        setIsAddDialogOpen(false)
        setEditingRouter(null)
        resetForm()
        fetchRouters()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to save router")
      }
    } catch (error) {
      console.error("Error saving router:", error)
      toast.error("Failed to save router")
    }
  }

  const testConnection = async (router: Router) => {
    setTestingConnection(router.id)
    try {
      const response = await fetch(`/api/network/routers/${router.id}/test-connection`, {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast.success("Connection successful!")
          // Update router status
          setRouters((prev) => prev.map((r) => (r.id === router.id ? { ...r, status: "connected" } : r)))
        } else {
          toast.error(`Connection failed: ${result.message}`)
        }
      }
    } catch (error) {
      console.error("Error testing connection:", error)
      toast.error("Failed to test connection")
    } finally {
      setTestingConnection(null)
    }
  }

  const deleteRouter = async (id: number) => {
    if (!confirm("Are you sure you want to delete this router?")) return

    try {
      const response = await fetch(`/api/network/routers/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Router deleted successfully")
        fetchRouters()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to delete router")
      }
    } catch (error) {
      console.error("Error deleting router:", error)
      toast.error("Failed to delete router")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "mikrotik",
      location_id: "",
      connection_type: "public_ip",
      hostname: "",
      api_port: 8728,
      ssh_port: 22,
      username: "",
      password: "",
    })
  }

  const handleAddRouter = () => {
    // Navigate to add router page or open modal
    window.location.href = "/network/routers/add"
  }

  const openEditDialog = (router: Router) => {
    window.location.href = `/network/routers/edit/${router.id}`
  }

  const getStatusBadge = (status: string) => {
    return status === "connected" ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <Wifi className="w-3 h-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <WifiOff className="w-3 h-3 mr-1" />
        Disconnected
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mikrotik":
        return "🔴"
      case "ubiquiti":
        return "🔵"
      case "juniper":
        return "🟡"
      default:
        return "⚪"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Router Management</h1>
          <p className="text-muted-foreground">Manage your network routers and their configurations</p>
        </div>
        <Button onClick={handleAddRouter}>
          <Plus className="w-4 h-4 mr-2" />
          Add Router
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Routers</CardTitle>
          <CardDescription>Manage and monitor your network infrastructure routers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Router</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routers.map((router) => (
                <TableRow key={router.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{router.name}</div>
                      <div className="text-sm text-muted-foreground">{router.hostname}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(router.type)}</span>
                      <span className="capitalize">{router.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{router.location_name || `Location ${router.location_id}`}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {router.connection_type ? router.connection_type.replace("_", " ") : "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(router.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testConnection(router)}
                        disabled={testingConnection === router.id}
                      >
                        {testingConnection === router.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                        ) : (
                          <TestTube className="w-3 h-3" />
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(router)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteRouter(router.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {routers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No routers configured yet.</p>
              <p className="text-sm text-muted-foreground">Add your first router to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { useToast } from "@/hooks/use-toast"
import { Plus, Users, Edit, Trash2, Eye, Activity, Clock, HardDrive } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface HotspotUser {
  id: number
  hotspot_id: number
  hotspot_name: string
  username: string
  email: string
  phone: string
  time_limit: number
  data_limit: number
  expiry_date: string
  status: string
  created_at: string
  last_session: string
  total_sessions: number
  data_used: number
}

interface Hotspot {
  id: number
  name: string
  location: string
}

export default function HotspotUsersPage() {
  const [users, setUsers] = useState<HotspotUser[]>([])
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedHotspot, setSelectedHotspot] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [newUser, setNewUser] = useState({
    hotspot_id: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    time_limit: 60,
    data_limit: 1024,
    expiry_days: 30,
  })

  useEffect(() => {
    loadUsers()
    loadHotspots()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/hotspots/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadHotspots = async () => {
    try {
      const response = await fetch("/api/hotspots")
      if (response.ok) {
        const data = await response.json()
        setHotspots(data)
      }
    } catch (error) {
      console.error("Failed to load hotspots:", error)
    }
  }

  const createUser = async () => {
    try {
      const response = await fetch("/api/hotspots/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newUser,
          hotspot_id: Number.parseInt(newUser.hotspot_id),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully",
        })
        setShowCreateModal(false)
        loadUsers()
        setNewUser({
          hotspot_id: "",
          username: "",
          password: "",
          email: "",
          phone: "",
          time_limit: 60,
          data_limit: 1024,
          expiry_days: 30,
        })
      } else {
        throw new Error("Failed to create user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const deleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const response = await fetch(`/api/hotspots/users/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
        loadUsers()
      } else {
        throw new Error("Failed to delete user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      case "suspended":
        return <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDataUsage = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesStatus = filterStatus === "all" || user.status === filterStatus
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.hotspot_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesHotspot = !selectedHotspot || user.hotspot_id.toString() === selectedHotspot
    return matchesStatus && matchesSearch && matchesHotspot
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotspot Users</h1>
          <p className="text-gray-600">Manage user accounts for your hotspots</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user account for hotspot access</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Hotspot</Label>
                <Select
                  value={newUser.hotspot_id}
                  onValueChange={(value) => setNewUser({ ...newUser, hotspot_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotspot" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotspots.map((hotspot) => (
                      <SelectItem key={hotspot.id} value={hotspot.id.toString()}>
                        {hotspot.name} - {hotspot.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+254..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    value={newUser.time_limit}
                    onChange={(e) => setNewUser({ ...newUser, time_limit: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Data Limit (MB)</Label>
                  <Input
                    type="number"
                    value={newUser.data_limit}
                    onChange={(e) => setNewUser({ ...newUser, data_limit: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Valid for (days)</Label>
                <Input
                  type="number"
                  value={newUser.expiry_days}
                  onChange={(e) => setNewUser({ ...newUser, expiry_days: Number.parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={createUser} disabled={!newUser.hotspot_id || !newUser.username || !newUser.password}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{users.filter((u) => u.status === "active").length}</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{users.filter((u) => u.status === "expired").length}</div>
            <div className="text-sm text-muted-foreground">Expired Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <HardDrive className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {formatDataUsage(users.reduce((sum, u) => sum + (u.data_used || 0), 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Data Used</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={selectedHotspot} onValueChange={setSelectedHotspot}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All hotspots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hotspots</SelectItem>
                {hotspots.map((hotspot) => (
                  <SelectItem key={hotspot.id} value={hotspot.id.toString()}>
                    {hotspot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Hotspot</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.total_sessions} sessions</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{user.hotspot_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{user.time_limit} min</div>
                        <div className="text-sm text-muted-foreground">{user.data_limit} MB</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDataUsage(user.data_used || 0)}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(user.expiry_date).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Users Found</h3>
              <p className="text-gray-600 mb-4">Create user accounts to provide access to your hotspots</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

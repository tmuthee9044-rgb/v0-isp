"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserCog, Shield, Users, Key, Save, RefreshCw, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function UserManagementPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState<any>({})
  const [isSyncing, setIsSyncing] = useState(false)

  // State for settings
  const [settings, setSettings] = useState({
    passwordPolicy: {
      minLength: 8,
      expiryDays: 90,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventReuse: true,
    },
    sessionManagement: {
      timeoutMinutes: 60,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30,
      maxConcurrentSessions: 3,
      forcePasswordChange: true,
      rememberLoginSessions: true,
    },
    twoFactorAuthentication: {
      admin2FAEnabled: true,
      optional2FAEnabled: true,
      methods: {
        sms: true,
        email: true,
        authenticatorApp: false,
      },
    },
    employeeIntegration: {
      autoCreateAccounts: true,
      autoDisableTerminated: true,
      syncDepartmentChanges: true,
      syncContactInfo: true,
      usernameFormat: "firstname.lastname",
      emailDomain: "@techconnect.co.ke",
      defaultPasswordPolicy: "temporary",
      accountNotificationMethod: "email",
    },
  })

  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [showEditRoleModal, setShowEditRoleModal] = useState(false)
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    role: "employee",
    password: "",
  })

  useEffect(() => {
    fetchUserData()
    fetchPermissions()
  }, [])

  const fetchUserData = async () => {
    try {
      console.log("[v0] Fetching user data...")
      const response = await fetch("/api/user-management")
      const data = await response.json()
      console.log("[v0] User data loaded:", data)
      setUsers(data.users || [])

      const rolesResponse = await fetch("/api/roles")
      const rolesData = await rolesResponse.json()
      console.log("[v0] Roles loaded:", rolesData)
      setRoles(rolesData.roles || [])
      // If settings are fetched from the backend, you'd set them here:
      // if (data.settings) {
      //   setSettings(data.settings);
      // }
    } catch (error) {
      console.error("[v0] Error fetching user data:", error)
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      })
    }
  }

  const fetchPermissions = async () => {
    try {
      console.log("[v0] Fetching permissions...")
      const response = await fetch("/api/permissions")
      const data = await response.json()
      console.log("[v0] Permissions loaded:", data)
      setPermissions(data.permissions || {})
    } catch (error) {
      console.error("[v0] Error fetching permissions:", error)
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive",
      })
    }
  }

  const handleAddRole = async () => {
    if (!newRole.name || !newRole.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      })

      if (response.ok) {
        toast({
          title: "Role created",
          description: "New role has been created successfully.",
        })
        setShowAddRoleModal(false)
        setNewRole({ name: "", description: "", permissions: [] })
        await fetchUserData()
      } else {
        throw new Error("Failed to create role")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditRole = async () => {
    if (!selectedRole) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedRole.name,
          description: selectedRole.description,
          permissions: selectedRole.permissions,
        }),
      })

      if (response.ok) {
        toast({
          title: "Role updated",
          description: "Role has been updated successfully.",
        })
        setShowEditRoleModal(false)
        setSelectedRole(null)
        await fetchUserData()
      } else {
        throw new Error("Failed to update role")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Role deleted",
          description: "Role has been deleted successfully.",
        })
        setShowDeleteRoleModal(false)
        setSelectedRole(null)
        await fetchUserData()
      } else {
        throw new Error(data.error || "Failed to delete role")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePermission = (permissionKey: string, isRole = false) => {
    if (isRole && selectedRole) {
      const permissions = selectedRole.permissions || []
      if (permissions.includes(permissionKey)) {
        setSelectedRole({
          ...selectedRole,
          permissions: permissions.filter((p: string) => p !== permissionKey),
        })
      } else {
        setSelectedRole({
          ...selectedRole,
          permissions: [...permissions, permissionKey],
        })
      }
    } else {
      const permissions = newRole.permissions || []
      if (permissions.includes(permissionKey)) {
        setNewRole({
          ...newRole,
          permissions: permissions.filter((p) => p !== permissionKey),
        })
      } else {
        setNewRole({
          ...newRole,
          permissions: [...permissions, permissionKey],
        })
      }
    }
  }

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/user-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          data: newUser,
        }),
      })

      if (response.ok) {
        toast({
          title: "User created",
          description: "New user account has been created successfully.",
        })
        setShowAddUserModal(false)
        setNewUser({ username: "", email: "", role: "employee", password: "" })
        await fetchUserData()
      } else {
        throw new Error("Failed to create user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/user-management/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_user",
          data: {
            email: selectedUser.email,
            role: selectedUser.role,
            status: selectedUser.status,
          },
        }),
      })

      if (response.ok) {
        toast({
          title: "User updated",
          description: "User information has been updated successfully.",
        })
        setShowEditUserModal(false)
        setSelectedUser(null)
        await fetchUserData()
      } else {
        throw new Error("Failed to update user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/user-management/${selectedUser.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "User deleted",
          description: "User account has been deactivated successfully.",
        })
        setShowDeleteUserModal(false)
        setSelectedUser(null)
        await fetchUserData()
      } else {
        throw new Error("Failed to delete user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !selectedUser.newPassword) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/user-management/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          data: {
            newPassword: selectedUser.newPassword,
          },
        }),
      })

      if (response.ok) {
        toast({
          title: "Password reset",
          description: "User password has been reset successfully.",
        })
        setShowResetPasswordModal(false)
        setSelectedUser(null)
      } else {
        throw new Error("Failed to reset password")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // The 'settings' variable was undeclared. It's now initialized as state.
      const response = await fetch("/api/user-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          data: settings,
        }),
      })

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "User management settings have been updated successfully.",
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const response = await fetch(`/api/user-management/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_user",
          data: updates,
        }),
      })

      if (response.ok) {
        await fetchUserData()
        toast({
          title: "User updated",
          description: "User information has been updated successfully.",
        })
      } else {
        throw new Error("Failed to update user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleCreateRole = async (roleData: any) => {
    try {
      const response = await fetch("/api/user-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_role",
          data: roleData,
        }),
      })

      if (response.ok) {
        await fetchUserData()
        toast({
          title: "Role created",
          description: "New role has been created successfully.",
        })
      } else {
        throw new Error("Failed to create role")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      })
    }
  }

  const handleSyncEmployees = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/user-management/sync-employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_all",
        }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchUserData()
        toast({
          title: "Sync completed",
          description: result.message,
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync employees",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Handlers for updating settings
  const handlePasswordPolicyChange = (field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      passwordPolicy: { ...prev.passwordPolicy, [field]: value },
    }))
  }

  const handleSessionManagementChange = (field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      sessionManagement: { ...prev.sessionManagement, [field]: value },
    }))
  }

  const handle2FAChange = (field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      twoFactorAuthentication: { ...prev.twoFactorAuthentication, [field]: value },
    }))
  }

  const handle2FAMethodsChange = (method: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      twoFactorAuthentication: {
        ...prev.twoFactorAuthentication,
        methods: { ...prev.twoFactorAuthentication.methods, [method]: enabled },
      },
    }))
  }

  const handleIntegrationChange = (field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      employeeIntegration: { ...prev.employeeIntegration, [field]: value },
    }))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSyncEmployees} disabled={isSyncing}>
            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Employees
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">User Accounts</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="integration">Employee Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <CardTitle>User Accounts</CardTitle>
                </div>
                <Button onClick={() => setShowAddUserModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
              <CardDescription>Manage system user accounts and their basic information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Input placeholder="Search users..." className="max-w-sm" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No users found. Click "Add User" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{user.name}</div>
                              <div className="text-sm text-muted-foreground">ID: {user.employeeId}</div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>
                            <Badge variant={user.status === "active" ? "default" : "secondary"}>
                              {user.status === "active" ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{user.lastLogin}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowEditUserModal(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowResetPasswordModal(true)
                                }}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setShowDeleteUserModal(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common user management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col bg-transparent"
                  onClick={() => setShowAddUserModal(true)}
                >
                  <Plus className="h-6 w-6 mb-2" />
                  <span>Add New User</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col bg-transparent"
                  onClick={() => {
                    // Select the first user for password reset example, in real app, you'd likely select a user
                    if (users.length > 0) {
                      setSelectedUser(users[0])
                      setShowResetPasswordModal(true)
                    } else {
                      toast({ title: "No users available", description: "Please add users first." })
                    }
                  }}
                >
                  <Key className="h-6 w-6 mb-2" />
                  <span>Reset Passwords</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col bg-transparent">
                  <Users className="h-6 w-6 mb-2" />
                  <span>Bulk Import</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Roles & Permissions</CardTitle>
                </div>
                <Button onClick={() => setShowAddRoleModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </div>
              <CardDescription>Define custom roles with granular permissions based on system modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role: any) => (
                  <div key={role.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Label className="font-medium">{role.name}</Label>
                            {role.is_system_role && (
                              <Badge variant="secondary" className="text-xs">
                                System Role
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{role.user_count || 0} users</Badge>
                        <Badge variant="outline">{role.permission_count || 0} permissions</Badge>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRole(role)
                              setShowEditRoleModal(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_system_role && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role)
                                setShowDeleteRoleModal(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissionDetails?.slice(0, 10).map((permission: any) => (
                        <Badge key={permission.id} variant="secondary" className="text-xs">
                          {permission.permission_name}
                        </Badge>
                      ))}
                      {role.permissionDetails?.length > 10 && (
                        <Badge variant="secondary" className="text-xs">
                          +{role.permissionDetails.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Modules & Permissions</CardTitle>
              <CardDescription>Available permissions organized by system modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(permissions).map(([module, perms]: [string, any]) => (
                  <div key={module} className="p-4 border rounded-lg">
                    <Label className="font-medium text-base">{module}</Label>
                    <div className="mt-2 space-y-1">
                      {perms.map((permission: any) => (
                        <div key={permission.id} className="text-sm text-muted-foreground">
                          • {permission.permission_name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Access Control Settings</span>
              </CardTitle>
              <CardDescription>Configure security and access control policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Password Policy</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure password requirements for user accounts
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-password-length">Minimum Password Length</Label>
                    <Select
                      defaultValue={String(settings.passwordPolicy.minLength)}
                      onValueChange={(val) => handlePasswordPolicyChange("minLength", Number.parseInt(val, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 characters</SelectItem>
                        <SelectItem value="8">8 characters</SelectItem>
                        <SelectItem value="10">10 characters</SelectItem>
                        <SelectItem value="12">12 characters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                    <Select
                      defaultValue={String(settings.passwordPolicy.expiryDays)}
                      onValueChange={(val) =>
                        handlePasswordPolicyChange("expiryDays", val === "never" ? null : Number.parseInt(val, 10))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="never">Never expires</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Uppercase Letters</Label>
                      <p className="text-sm text-muted-foreground">At least one uppercase letter</p>
                    </div>
                    <Switch
                      checked={settings.passwordPolicy.requireUppercase}
                      onCheckedChange={(checked) => handlePasswordPolicyChange("requireUppercase", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Numbers</Label>
                      <p className="text-sm text-muted-foreground">At least one number</p>
                    </div>
                    <Switch
                      checked={settings.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) => handlePasswordPolicyChange("requireNumbers", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Special Characters</Label>
                      <p className="text-sm text-muted-foreground">At least one special character</p>
                    </div>
                    <Switch
                      checked={settings.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) => handlePasswordPolicyChange("requireSpecialChars", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Prevent Password Reuse</Label>
                      <p className="text-sm text-muted-foreground">Last 5 passwords</p>
                    </div>
                    <Switch
                      checked={settings.passwordPolicy.preventReuse}
                      onCheckedChange={(checked) => handlePasswordPolicyChange("preventReuse", checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Session Management</Label>
                  <p className="text-sm text-muted-foreground mb-3">Configure user session and login policies</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Select
                      defaultValue={String(settings.sessionManagement.timeoutMinutes)}
                      onValueChange={(val) => handleSessionManagementChange("timeoutMinutes", Number.parseInt(val, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                    <Select
                      defaultValue={String(settings.sessionManagement.maxLoginAttempts)}
                      onValueChange={(val) =>
                        handleSessionManagementChange(
                          "maxLoginAttempts",
                          val === "unlimited" ? null : Number.parseInt(val, 10),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                        <SelectItem value="10">10 attempts</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockout-duration">Account Lockout Duration (minutes)</Label>
                    <Select
                      defaultValue={String(settings.sessionManagement.lockoutDurationMinutes)}
                      onValueChange={(val) =>
                        handleSessionManagementChange("lockoutDurationMinutes", Number.parseInt(val, 10))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="concurrent-sessions">Max Concurrent Sessions</Label>
                    <Select
                      defaultValue={String(settings.sessionManagement.maxConcurrentSessions)}
                      onValueChange={(val) =>
                        handleSessionManagementChange(
                          "maxConcurrentSessions",
                          val === "unlimited" ? null : Number.parseInt(val, 10),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 session</SelectItem>
                        <SelectItem value="3">3 sessions</SelectItem>
                        <SelectItem value="5">5 sessions</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Force Password Change on First Login</Label>
                      <p className="text-sm text-muted-foreground">New users must change password</p>
                    </div>
                    <Switch
                      checked={settings.sessionManagement.forcePasswordChange}
                      onCheckedChange={(checked) => handleSessionManagementChange("forcePasswordChange", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Remember Login Sessions</Label>
                      <p className="text-sm text-muted-foreground">Allow "Remember Me" option</p>
                    </div>
                    <Switch
                      checked={settings.sessionManagement.rememberLoginSessions}
                      onCheckedChange={(checked) => handleSessionManagementChange("rememberLoginSessions", checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground mb-3">Configure 2FA settings for enhanced security</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable 2FA for Administrators</Label>
                      <p className="text-sm text-muted-foreground">Mandatory for admin accounts</p>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuthentication.admin2FAEnabled}
                      onCheckedChange={(checked) => handle2FAChange("admin2FAEnabled", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Optional 2FA for Other Users</Label>
                      <p className="text-sm text-muted-foreground">Users can enable voluntarily</p>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuthentication.optional2FAEnabled}
                      onCheckedChange={(checked) => handle2FAChange("optional2FAEnabled", checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="2fa-methods">Allowed 2FA Methods</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.twoFactorAuthentication.methods.sms}
                        onCheckedChange={(checked) => handle2FAMethodsChange("sms", checked)}
                      />
                      <Label>SMS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.twoFactorAuthentication.methods.email}
                        onCheckedChange={(checked) => handle2FAMethodsChange("email", checked)}
                      />
                      <Label>Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.twoFactorAuthentication.methods.authenticatorApp}
                        onCheckedChange={(checked) => handle2FAMethodsChange("authenticatorApp", checked)}
                      />
                      <Label>Authenticator App</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCog className="h-5 w-5" />
                <span>Employee Integration</span>
              </CardTitle>
              <CardDescription>Configure how user accounts integrate with employee records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Auto-Sync Settings</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure automatic synchronization between HR and user systems
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-create User Accounts</Label>
                      <p className="text-sm text-muted-foreground">Create accounts for new employees</p>
                    </div>
                    <Switch
                      checked={settings.employeeIntegration.autoCreateAccounts}
                      onCheckedChange={(checked) => handleIntegrationChange("autoCreateAccounts", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-disable Terminated Employees</Label>
                      <p className="text-sm text-muted-foreground">Disable accounts when employees leave</p>
                    </div>
                    <Switch
                      checked={settings.employeeIntegration.autoDisableTerminated}
                      onCheckedChange={(checked) => handleIntegrationChange("autoDisableTerminated", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sync Department Changes</Label>
                      <p className="text-sm text-muted-foreground">Update roles when departments change</p>
                    </div>
                    <Switch
                      checked={settings.employeeIntegration.syncDepartmentChanges}
                      onCheckedChange={(checked) => handleIntegrationChange("syncDepartmentChanges", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sync Contact Information</Label>
                      <p className="text-sm text-muted-foreground">Update email and phone from HR</p>
                    </div>
                    <Switch
                      checked={settings.employeeIntegration.syncContactInfo}
                      onCheckedChange={(checked) => handleIntegrationChange("syncContactInfo", checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Role Assignment Rules</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure how employee positions map to system roles
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { position: "IT Manager", department: "IT", defaultRole: "Administrator", autoAssign: true },
                    {
                      position: "Customer Service Manager",
                      department: "Customer Service",
                      defaultRole: "Manager",
                      autoAssign: true,
                    },
                    {
                      position: "Network Technician",
                      department: "Network Operations",
                      defaultRole: "Technician",
                      autoAssign: true,
                    },
                    { position: "Accountant", department: "Finance", defaultRole: "Accountant", autoAssign: true },
                    {
                      position: "Support Agent",
                      department: "Customer Service",
                      defaultRole: "Support Agent",
                      autoAssign: true,
                    },
                  ].map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <Label className="font-medium">{rule.position}</Label>
                          <p className="text-sm text-muted-foreground">{rule.department} Department</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <Label className="text-sm">Default Role:</Label>
                          <p className="text-sm font-medium">{rule.defaultRole}</p>
                        </div>
                        <Switch defaultChecked={rule.autoAssign} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Account Provisioning</Label>
                  <p className="text-sm text-muted-foreground mb-3">Configure how new user accounts are set up</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username-format">Username Format</Label>
                    <Select
                      defaultValue={settings.employeeIntegration.usernameFormat}
                      onValueChange={(val) => handleIntegrationChange("usernameFormat", val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firstname.lastname">firstname.lastname</SelectItem>
                        <SelectItem value="firstnamelastname">firstnamelastname</SelectItem>
                        <SelectItem value="employee-id">Employee ID</SelectItem>
                        <SelectItem value="email">Email Address</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-domain">Email Domain</Label>
                    <Input
                      id="email-domain"
                      placeholder="@techconnect.co.ke"
                      value={settings.employeeIntegration.emailDomain}
                      onChange={(e) => handleIntegrationChange("emailDomain", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-password">Default Password Policy</Label>
                    <Select
                      defaultValue={settings.employeeIntegration.defaultPasswordPolicy}
                      onValueChange={(val) => handleIntegrationChange("defaultPasswordPolicy", val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temporary">Temporary Password</SelectItem>
                        <SelectItem value="employee-id">Employee ID</SelectItem>
                        <SelectItem value="random">Random Generated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-notification-method">Account Creation Notification</Label>
                    <Select
                      defaultValue={settings.employeeIntegration.accountNotificationMethod}
                      onValueChange={(val) => handleIntegrationChange("accountNotificationMethod", val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="both">Email & SMS</SelectItem>
                        <SelectItem value="none">No Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleSyncEmployees} disabled={isSyncing}>
                  {isSyncing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Now
                </Button>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  View Sync Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with the specified details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="john.doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account information.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteUserModal} onOpenChange={setShowDeleteUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this user account? This action will set the user status to inactive.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteUserModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for this user account.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={selectedUser.newPassword || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRoleModal} onOpenChange={setShowAddRoleModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Define a new role with custom permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="e.g., Sales Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description *</Label>
              <Input
                id="role-description"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Brief description of the role"
              />
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="text-base font-medium">Permissions</Label>
              <p className="text-sm text-muted-foreground">Select permissions for this role</p>
              {Object.entries(permissions).map(([module, perms]: [string, any]) => (
                <div key={module} className="space-y-2">
                  <Label className="font-medium">{module}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                    {perms.map((permission: any) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Switch
                          checked={newRole.permissions.includes(permission.permission_key)}
                          onCheckedChange={() => togglePermission(permission.permission_key, false)}
                        />
                        <Label
                          className="text-sm cursor-pointer"
                          onClick={() => togglePermission(permission.permission_key, false)}
                        >
                          {permission.permission_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditRoleModal} onOpenChange={setShowEditRoleModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Modify role permissions</DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4">
              {!selectedRole.is_system_role && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role-name">Role Name</Label>
                    <Input
                      id="edit-role-name"
                      value={selectedRole.name}
                      onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role-description">Description</Label>
                    <Input
                      id="edit-role-description"
                      value={selectedRole.description}
                      onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                    />
                  </div>
                  <Separator />
                </>
              )}
              <div className="space-y-4">
                <Label className="text-base font-medium">Permissions</Label>
                {Object.entries(permissions).map(([module, perms]: [string, any]) => (
                  <div key={module} className="space-y-2">
                    <Label className="font-medium">{module}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                      {perms.map((permission: any) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Switch
                            checked={selectedRole.permissions?.includes(permission.permission_key)}
                            onCheckedChange={() => togglePermission(permission.permission_key, true)}
                          />
                          <Label
                            className="text-sm cursor-pointer"
                            onClick={() => togglePermission(permission.permission_key, true)}
                          >
                            {permission.permission_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteRoleModal} onOpenChange={setShowDeleteRoleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedRole.name}</p>
              <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedRole.user_count || 0} users assigned to this role
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteRoleModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AccountLedgerModal } from "./account-ledger-modal"

interface Account {
  id: number
  account_code: string
  account_name: string
  account_type: string
  description: string
  current_balance: number
  created_at: string
}

interface ManageBalanceSheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountsUpdated: () => void
}

export function ManageBalanceSheetModal({ open, onOpenChange, onAccountsUpdated }: ManageBalanceSheetModalProps) {
  const [activeTab, setActiveTab] = useState("Asset")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [ledgerAccount, setLedgerAccount] = useState<Account | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    account_name: "",
    description: "",
    opening_balance: "",
  })

  useEffect(() => {
    if (open) {
      fetchAccounts(activeTab)
    }
  }, [open, activeTab])

  const fetchAccounts = async (type: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/finance/accounts?type=${type}`)
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast({
        title: "Error",
        description: "Failed to fetch accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingAccount ? `/api/finance/accounts/${editingAccount.id}` : "/api/finance/accounts"
      const method = editingAccount ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          account_type: activeTab,
          opening_balance: Number.parseFloat(formData.opening_balance || "0"),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save account")
      }

      toast({
        title: "Success",
        description: `Account ${editingAccount ? "updated" : "created"} successfully`,
      })

      setFormData({ account_name: "", description: "", opening_balance: "" })
      setShowAddForm(false)
      setEditingAccount(null)
      fetchAccounts(activeTab)
      onAccountsUpdated()
    } catch (error) {
      console.error("Error saving account:", error)
      toast({
        title: "Error",
        description: "Failed to save account",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (accountId: number) => {
    if (!confirm("Are you sure you want to delete this account?")) return

    setLoading(true)
    try {
      const response = await fetch(`/api/finance/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to delete account")
      }

      toast({
        title: "Success",
        description: "Account deleted successfully",
      })

      fetchAccounts(activeTab)
      onAccountsUpdated()
    } catch (error: any) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      account_name: account.account_name,
      description: account.description || "",
      opening_balance: "",
    })
    setShowAddForm(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Balance Sheet Accounts</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="Asset">Assets</TabsTrigger>
              <TabsTrigger value="Liability">Liabilities</TabsTrigger>
              <TabsTrigger value="Equity">Equity</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {!showAddForm ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{activeTab} Accounts</h3>
                    <Button onClick={() => setShowAddForm(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New {activeTab}
                    </Button>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Current Balance</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : accounts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No accounts found. Add your first {activeTab.toLowerCase()} account.
                            </TableCell>
                          </TableRow>
                        ) : (
                          accounts.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-mono text-sm">{account.account_code}</TableCell>
                              <TableCell className="font-medium">
                                {account.account_name}
                                {account.account_name === "Inventory (Auto)" && (
                                  <span className="ml-2 text-xs text-muted-foreground">(Auto)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {account.description || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(account.current_balance)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(account.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => setLedgerAccount(account)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {account.account_name !== "Inventory (Auto)" && (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_name">Account Name *</Label>
                    <Input
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {!editingAccount && (
                    <div className="space-y-2">
                      <Label htmlFor="opening_balance">Opening Balance</Label>
                      <Input
                        id="opening_balance"
                        type="number"
                        step="0.01"
                        value={formData.opening_balance}
                        onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        {activeTab === "Asset" ? "Debit" : "Credit"} entry will be created
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : editingAccount ? "Update Account" : "Save Account"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingAccount(null)
                        setFormData({ account_name: "", description: "", opening_balance: "" })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {ledgerAccount && (
        <AccountLedgerModal
          open={!!ledgerAccount}
          onOpenChange={(open) => !open && setLedgerAccount(null)}
          account={ledgerAccount}
        />
      )}
    </>
  )
}

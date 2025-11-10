"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  Calendar,
  User,
  Tag,
  Shield,
  RefreshCw,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Document {
  id: number
  document_name: string
  document_type: string
  file_name: string
  file_size: number
  mime_type: string
  description?: string
  tags?: string[]
  status: string
  is_confidential: boolean
  uploaded_by_name?: string
  created_at: string
  updated_at: string
  expires_at?: string
  version: number
}

interface CustomerDocumentsTabProps {
  customerId: number
}

export function CustomerDocumentsTab({ customerId }: CustomerDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState("contract")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [isConfidential, setIsConfidential] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [customerId])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}/documents`)
      const data = await response.json()

      if (data.success) {
        setDocuments(data.documents || [])
      } else {
        throw new Error(data.error || "Failed to fetch documents")
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("documentType", documentType)
      formData.append("description", description)
      formData.append("tags", tags)
      formData.append("isConfidential", isConfidential.toString())

      const response = await fetch(`/api/customers/${customerId}/documents`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Document uploaded successfully.",
        })
        setShowUploadDialog(false)
        resetUploadForm()
        fetchDocuments()
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const resetUploadForm = () => {
    setSelectedFile(null)
    setDocumentType("contract")
    setDescription("")
    setTags("")
    setIsConfidential(false)
  }

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customerId}/documents/${documentId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Document deleted successfully.",
        })
        fetchDocuments()
      } else {
        throw new Error(data.error || "Delete failed")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadDocument = (document: Document) => {
    // In a real implementation, this would download the actual file
    toast({
      title: "Download",
      description: `Downloading ${document.document_name}...`,
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getDocumentTypeColor = (type: string) => {
    const colors = {
      contract: "bg-blue-100 text-blue-800 border-blue-200",
      agreement: "bg-green-100 text-green-800 border-green-200",
      technical: "bg-purple-100 text-purple-800 border-purple-200",
      support: "bg-orange-100 text-orange-800 border-orange-200",
      compliance: "bg-red-100 text-red-800 border-red-200",
      communication: "bg-yellow-100 text-yellow-800 border-yellow-200",
      other: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return colors[type as keyof typeof colors] || colors.other
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Customer Documents
              </CardTitle>
              <CardDescription>Manage contracts, agreements, and other important documents</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchDocuments}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Upload a new document for this customer</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file">Select File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Max file size: 10MB. Supported: PDF, DOC, DOCX, JPG, PNG, GIF, TXT
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="document-type">Document Type</Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="agreement">Agreement</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="communication">Communication</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of the document..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        placeholder="contract, 2025, service agreement"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="confidential" checked={isConfidential} onCheckedChange={setIsConfidential} />
                      <Label htmlFor="confidential">Mark as confidential</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleFileUpload} disabled={uploading || !selectedFile}>
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="contract">Contracts</SelectItem>
                  <SelectItem value="agreement">Agreements</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Documents table */}
          {filteredDocuments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.document_name}</p>
                            {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}
                            {doc.is_confidential && (
                              <Badge variant="secondary" className="mt-1">
                                <Shield className="h-3 w-3 mr-1" />
                                Confidential
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDocumentTypeColor(doc.document_type)}>{doc.document_type}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        {doc.uploaded_by_name && (
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{doc.uploaded_by_name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{doc.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDownloadDocument(doc)}
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || typeFilter !== "all"
                  ? "No documents match your search criteria"
                  : "No documents uploaded yet"}
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

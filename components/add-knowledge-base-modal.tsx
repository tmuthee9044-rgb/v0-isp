"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface AddKnowledgeBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onArticleAdded: () => void
  employees: any[]
}

export function AddKnowledgeBaseModal({ open, onOpenChange, onArticleAdded, employees }: AddKnowledgeBaseModalProps) {
  const [article, setArticle] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
    author_id: "",
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!article.title || !article.content || !article.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/support/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(article),
      })

      if (response.ok) {
        toast({
          title: "Article Created",
          description: "Knowledge base article has been created successfully.",
        })
        onOpenChange(false)
        setArticle({
          title: "",
          content: "",
          category: "",
          tags: "",
          author_id: "",
        })
        onArticleAdded()
      } else {
        throw new Error("Failed to create article")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create article",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Knowledge Base Article</DialogTitle>
          <DialogDescription>Create a new article for the knowledge base</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Article title"
              value={article.title}
              onChange={(e) => setArticle({ ...article, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={article.category} onValueChange={(value) => setArticle({ ...article, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technical">Technical</SelectItem>
                <SelectItem value="Billing">Billing</SelectItem>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Network">Network</SelectItem>
                <SelectItem value="Account">Account</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="author">Author</Label>
            <Select value={article.author_id} onValueChange={(value) => setArticle({ ...article, author_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select author" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee: any) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="Comma-separated tags"
              value={article.tags}
              onChange={(e) => setArticle({ ...article, tags: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Article content"
              rows={8}
              value={article.content}
              onChange={(e) => setArticle({ ...article, content: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Plus,
  BookOpen,
  Users,
  Eye,
  ThumbsUp,
  MessageSquare,
  Filter,
  BarChart3,
  FileText,
  HelpCircle,
  Settings,
  Wifi,
  CreditCard,
  Shield,
} from "lucide-react"

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const categories = [
    { id: "all", name: "All Categories", icon: BookOpen, count: 45 },
    { id: "getting-started", name: "Getting Started", icon: HelpCircle, count: 12 },
    { id: "technical", name: "Technical Support", icon: Settings, count: 18 },
    { id: "billing", name: "Billing & Payments", icon: CreditCard, count: 8 },
    { id: "network", name: "Network Issues", icon: Wifi, count: 15 },
    { id: "security", name: "Security", icon: Shield, count: 7 },
  ]

  const articles = [
    {
      id: 1,
      title: "How to Set Up Your Internet Connection",
      category: "getting-started",
      views: 1250,
      likes: 89,
      comments: 12,
      lastUpdated: "2024-01-15",
      status: "published",
      author: "Tech Support Team",
    },
    {
      id: 2,
      title: "Troubleshooting Slow Internet Speeds",
      category: "technical",
      views: 2100,
      likes: 156,
      comments: 28,
      lastUpdated: "2024-01-10",
      status: "published",
      author: "Network Team",
    },
    {
      id: 3,
      title: "Understanding Your Monthly Bill",
      category: "billing",
      views: 890,
      likes: 45,
      comments: 8,
      lastUpdated: "2024-01-08",
      status: "published",
      author: "Billing Team",
    },
    {
      id: 4,
      title: "WiFi Security Best Practices",
      category: "security",
      views: 1560,
      likes: 112,
      comments: 19,
      lastUpdated: "2024-01-12",
      status: "published",
      author: "Security Team",
    },
    {
      id: 5,
      title: "Router Configuration Guide",
      category: "technical",
      views: 980,
      likes: 67,
      comments: 15,
      lastUpdated: "2024-01-05",
      status: "draft",
      author: "Tech Support Team",
    },
  ]

  const stats = [
    { label: "Total Articles", value: "45", icon: FileText },
    { label: "Total Views", value: "12.5K", icon: Eye },
    { label: "Average Rating", value: "4.8", icon: ThumbsUp },
    { label: "Active Users", value: "2.1K", icon: Users },
  ]

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Article
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="articles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Articles List */}
          <Card>
            <CardHeader>
              <CardTitle>Articles ({filteredArticles.length})</CardTitle>
              <CardDescription>Manage your knowledge base articles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{article.title}</h3>
                        <Badge variant={article.status === "published" ? "default" : "secondary"}>
                          {article.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By {article.author}</span>
                        <span>Updated {article.lastUpdated}</span>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.views}
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {article.likes}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {article.comments}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Article Categories</CardTitle>
              <CardDescription>Organize your knowledge base with categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories
                  .filter((cat) => cat.id !== "all")
                  .map((category) => (
                    <Card key={category.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <category.icon className="h-4 w-4" />
                          {category.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{category.count}</div>
                        <p className="text-xs text-muted-foreground">articles</p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Knowledge Base Analytics
              </CardTitle>
              <CardDescription>Track performance and user engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium">Most Viewed Articles</h4>
                    <div className="space-y-2">
                      {articles.slice(0, 3).map((article) => (
                        <div key={article.id} className="flex justify-between text-sm">
                          <span className="truncate">{article.title}</span>
                          <span className="text-muted-foreground">{article.views} views</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Most Liked Articles</h4>
                    <div className="space-y-2">
                      {articles.slice(0, 3).map((article) => (
                        <div key={article.id} className="flex justify-between text-sm">
                          <span className="truncate">{article.title}</span>
                          <span className="text-muted-foreground">{article.likes} likes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

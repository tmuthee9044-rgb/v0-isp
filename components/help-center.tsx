"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  BookOpen,
  Video,
  FileText,
  MessageCircle,
  ExternalLink,
  Clock,
  Users,
  CreditCard,
  Settings,
  LifeBuoy,
  Zap,
} from "lucide-react"

interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  type: "article" | "video" | "tutorial"
  readTime: string
  difficulty: "beginner" | "intermediate" | "advanced"
  popular: boolean
}

const helpArticles: HelpArticle[] = [
  {
    id: "1",
    title: "Getting Started with ISP Management",
    description: "Complete guide to setting up your ISP management system",
    category: "Getting Started",
    type: "tutorial",
    readTime: "10 min",
    difficulty: "beginner",
    popular: true,
  },
  {
    id: "2",
    title: "Configuring M-Pesa Payment Gateway",
    description: "Step-by-step guide to integrate M-Pesa payments",
    category: "Payments",
    type: "article",
    readTime: "8 min",
    difficulty: "intermediate",
    popular: true,
  },
  {
    id: "4",
    title: "Customer Billing and Invoicing",
    description: "Managing customer billing cycles and generating invoices",
    category: "Billing",
    type: "article",
    readTime: "12 min",
    difficulty: "beginner",
    popular: true,
  },
  {
    id: "6",
    title: "User Roles and Permissions",
    description: "Setting up user access control and permissions",
    category: "Administration",
    type: "article",
    readTime: "6 min",
    difficulty: "beginner",
    popular: false,
  },
  {
    id: "7",
    title: "Customer Support Management",
    description: "Handling customer support tickets and communications",
    category: "Support",
    type: "article",
    readTime: "9 min",
    difficulty: "beginner",
    popular: true,
  },
]

const categories = [
  { id: "all", name: "All Topics", icon: BookOpen, count: helpArticles.length },
  { id: "Getting Started", name: "Getting Started", icon: Zap, count: 1 },
  { id: "Payments", name: "Payments", icon: CreditCard, count: 1 },
  { id: "Billing", name: "Billing", icon: FileText, count: 1 },
  { id: "Administration", name: "Administration", icon: Settings, count: 1 },
  { id: "Support", name: "Support", icon: LifeBuoy, count: 1 },
]

export function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [filteredArticles, setFilteredArticles] = useState(helpArticles)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    const filtered = helpArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(term.toLowerCase()) ||
        article.description.toLowerCase().includes(term.toLowerCase()) ||
        article.category.toLowerCase().includes(term.toLowerCase()),
    )
    setFilteredArticles(filtered)
  }

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
    const filtered = category === "all" ? helpArticles : helpArticles.filter((article) => article.category === category)
    setFilteredArticles(filtered)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "tutorial":
        return <BookOpen className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <LifeBuoy className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Help Center</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Find answers to your questions and learn how to get the most out of your ISP management system
        </p>

        {/* Search */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search help articles..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="articles">Help Articles</TabsTrigger>
          <TabsTrigger value="tutorials">Video Tutorials</TabsTrigger>
          <TabsTrigger value="support">Contact Support</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            {/* Categories Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleCategoryFilter(category.id)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {category.name}
                        <Badge variant="secondary" className="ml-auto">
                          {category.count}
                        </Badge>
                      </Button>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    <Zap className="mr-2 h-4 w-4" />
                    Quick Start Guide
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <Video className="mr-2 h-4 w-4" />
                    Video Tutorials
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Community Forum
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Articles Grid */}
            <div className="md:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {selectedCategory === "all" ? "All Articles" : selectedCategory}
                </h2>
                <p className="text-sm text-muted-foreground">{filteredArticles.length} articles found</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {filteredArticles.map((article) => (
                  <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(article.type)}
                          <CardTitle className="text-base">{article.title}</CardTitle>
                          {article.popular && (
                            <Badge variant="secondary" className="text-xs">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardDescription>{article.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{article.readTime}</span>
                        </div>
                        <Badge className={`text-xs ${getDifficultyColor(article.difficulty)}`}>
                          {article.difficulty}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tutorials" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "System Overview",
                description: "Complete walkthrough of the ISP management system",
                duration: "12:34",
                views: "1.2k",
              },
              {
                title: "Customer Management",
                description: "How to add and manage customers effectively",
                duration: "8:45",
                views: "856",
              },
              {
                title: "Billing and Payments",
                description: "Setting up billing cycles and payment processing",
                duration: "15:22",
                views: "743",
              },
            ].map((video, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium mb-2">{video.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{video.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{video.duration}</span>
                    <span>{video.views} views</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Contact Support</span>
                </CardTitle>
                <CardDescription>Get help from our support team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@trustwaves.co.ke</p>
                  <p className="text-xs text-muted-foreground">Response time: 2-4 hours</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">+254 700 000 000</p>
                  <p className="text-xs text-muted-foreground">Mon-Fri: 8AM-6PM EAT</p>
                </div>
                <Button className="w-full">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Start Live Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Community</span>
                </CardTitle>
                <CardDescription>Connect with other ISP operators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Community Forum</p>
                  <p className="text-sm text-muted-foreground">Ask questions and share knowledge</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">WhatsApp Group</p>
                  <p className="text-sm text-muted-foreground">Join our ISP operators group</p>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Join Community
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

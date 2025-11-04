"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HelpCircle, X, MessageCircle, BookOpen, Video, ExternalLink, ChevronRight } from "lucide-react"

const quickHelp = [
  {
    title: "How to add a new customer?",
    description: "Step-by-step guide to customer registration",
    type: "article",
    url: "/help/add-customer",
  },
  {
    title: "Configure M-Pesa payments",
    description: "Set up M-Pesa payment integration",
    type: "tutorial",
    url: "/help/mpesa-setup",
  },
  {
    title: "Network troubleshooting",
    description: "Common network issues and solutions",
    type: "video",
    url: "/help/network-troubleshooting",
  },
]

export function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-xl border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Find answers or get support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Popular Help Topics</p>
            {quickHelp.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer group"
              >
                <div className="flex items-center space-x-2">
                  {item.type === "video" ? (
                    <Video className="h-4 w-4 text-muted-foreground" />
                  ) : item.type === "tutorial" ? (
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Button className="w-full" size="sm">
              <MessageCircle className="mr-2 h-4 w-4" />
              Start Live Chat
            </Button>
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              <BookOpen className="mr-2 h-4 w-4" />
              Browse Help Center
            </Button>
          </div>

          <div className="text-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Need immediate help?{" "}
              <a href="tel:+254700000000" className="text-blue-600 hover:underline">
                Call +254 700 000 000
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

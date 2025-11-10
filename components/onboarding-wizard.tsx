"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  Building2,
  CreditCard,
  Users,
  MessageSquare,
  BookOpen,
  Play,
} from "lucide-react"

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  completed: boolean
  required: boolean
  estimatedTime: string
  tasks: string[]
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "company",
    title: "Company Setup",
    description: "Configure your company profile and basic information",
    icon: Building2,
    completed: true,
    required: true,
    estimatedTime: "5 minutes",
    tasks: [
      "Add company name and logo",
      "Set contact information",
      "Configure timezone and currency",
      "Upload company documents",
    ],
  },
  {
    id: "payments",
    title: "Payment Gateway",
    description: "Configure M-Pesa and other payment methods",
    icon: CreditCard,
    completed: false,
    required: true,
    estimatedTime: "10 minutes",
    tasks: [
      "Set up M-Pesa integration",
      "Configure bank payment methods",
      "Test payment processing",
      "Set up automated billing",
    ],
  },
  {
    id: "users",
    title: "User Management",
    description: "Create user accounts and set permissions",
    icon: Users,
    completed: false,
    required: false,
    estimatedTime: "8 minutes",
    tasks: ["Create admin accounts", "Set up user roles", "Configure permissions", "Send invitation emails"],
  },
  {
    id: "communications",
    title: "Communications",
    description: "Set up email and SMS notifications",
    icon: MessageSquare,
    completed: false,
    required: false,
    estimatedTime: "12 minutes",
    tasks: ["Configure email settings", "Set up SMS gateway", "Create message templates", "Test notifications"],
  },
]

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showWizard, setShowWizard] = useState(true)

  const completedSteps = onboardingSteps.filter((step) => step.completed).length
  const totalSteps = onboardingSteps.length
  const progress = (completedSteps / totalSteps) * 100

  const requiredSteps = onboardingSteps.filter((step) => step.required)
  const completedRequiredSteps = requiredSteps.filter((step) => step.completed).length

  if (!showWizard) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  Setup Progress: {completedSteps}/{totalSteps} completed
                </p>
                <p className="text-sm text-blue-700">Continue setting up your ISP management system</p>
              </div>
            </div>
            <Button onClick={() => setShowWizard(true)} variant="outline" size="sm">
              Continue Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span>ISP System Setup Wizard</span>
            </CardTitle>
            <CardDescription>Get your ISP management system up and running in just a few steps</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>
            Minimize
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span>
              {completedSteps}/{totalSteps} steps completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(Number.parseInt(value))}>
          <TabsList className="grid w-full grid-cols-4">
            {onboardingSteps.map((step, index) => (
              <TabsTrigger key={step.id} value={index.toString()} className="flex items-center space-x-2">
                {step.completed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />}
                <span className="hidden md:inline">{step.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {onboardingSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <TabsContent key={step.id} value={index.toString()} className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${step.completed ? "bg-green-100" : "bg-blue-100"}`}>
                    <Icon className={`h-6 w-6 ${step.completed ? "text-green-600" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      {step.required && <Badge variant="secondary">Required</Badge>}
                      {step.completed && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <p className="text-sm text-muted-foreground mb-4">Estimated time: {step.estimatedTime}</p>

                    <div className="space-y-2">
                      <h4 className="font-medium">Tasks to complete:</h4>
                      <ul className="space-y-2">
                        {step.tasks.map((task, taskIndex) => (
                          <li key={taskIndex} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center space-x-2 mt-6">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Play className="mr-2 h-4 w-4" />
                        {step.completed ? "Review Setup" : "Start Setup"}
                      </Button>
                      <Button variant="outline">View Documentation</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </p>
            {completedRequiredSteps < requiredSteps.length && (
              <p className="text-xs text-orange-600 mt-1">
                {requiredSteps.length - completedRequiredSteps} required steps remaining
              </p>
            )}
          </div>

          <Button
            onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep === totalSteps - 1}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

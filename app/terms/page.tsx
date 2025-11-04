"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Shield, FileText, Calendar, Mail } from "lucide-react"

interface TermsContent {
  title: string
  lastUpdated: string
  content: {
    introduction: string
    serviceDescription: string
    userResponsibilities: string
    paymentTerms: string
    serviceAvailability: string
    privacyPolicy: string
    termination: string
    limitation: string
    changes: string
    contact: string
  }
}

export default function TermsPage() {
  const [termsContent, setTermsContent] = useState<TermsContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTermsContent()
  }, [])

  const fetchTermsContent = async () => {
    try {
      const response = await fetch("/api/content/terms")
      if (response.ok) {
        const data = await response.json()
        setTermsContent(data.content)
      } else {
        // Fallback to default content
        setTermsContent(getDefaultTermsContent())
      }
    } catch (error) {
      console.error("[v0] Error fetching terms content:", error)
      setTermsContent(getDefaultTermsContent())
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultTermsContent = (): TermsContent => ({
    title: "Terms of Service",
    lastUpdated: new Date().toLocaleDateString(),
    content: {
      introduction: `Welcome to Trust Waves ISP. These Terms of Service ("Terms") govern your use of our internet services and website. By using our services, you agree to be bound by these Terms.`,
      serviceDescription: `Trust Waves ISP provides high-speed internet connectivity services to residential and business customers. Our services include but are not limited to broadband internet access, technical support, and customer portal access.`,
      userResponsibilities: `As a customer, you agree to: (1) Use our services in compliance with all applicable laws and regulations; (2) Pay all fees and charges on time; (3) Protect your account credentials; (4) Not engage in activities that may harm our network or other users; (5) Comply with our Acceptable Use Policy.`,
      paymentTerms: `Service fees are billed monthly in advance. Payment is due within 30 days of the invoice date. Late payments may result in service suspension or termination. We reserve the right to change our pricing with 30 days written notice.`,
      serviceAvailability: `While we strive to provide continuous service, we do not guarantee 100% uptime. Scheduled maintenance will be announced in advance when possible. We are not liable for service interruptions due to circumstances beyond our control.`,
      privacyPolicy: `Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information. By using our services, you consent to our privacy practices.`,
      termination: `Either party may terminate this agreement with 30 days written notice. We may terminate immediately for breach of terms, non-payment, or illegal activities. Upon termination, you must return all equipment provided by us.`,
      limitation: `Our liability is limited to the monthly service fee. We are not liable for indirect, incidental, or consequential damages. Some jurisdictions do not allow limitation of liability, so these limitations may not apply to you.`,
      changes: `We may modify these Terms at any time. Changes will be posted on our website and take effect 30 days after posting. Continued use of our services constitutes acceptance of the modified Terms.`,
      contact: `If you have questions about these Terms, please contact us at legal@trustwavesisp.com or call our customer service at +254 700 000 000.`,
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading terms of service...</p>
        </div>
      </div>
    )
  }

  if (!termsContent) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Terms Not Available</h3>
            <p className="text-gray-600">Unable to load terms of service. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{termsContent.title}</h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {termsContent.lastUpdated}</span>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.introduction}</p>
            </section>

            <Separator />

            {/* Service Description */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">2. Service Description</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.serviceDescription}</p>
            </section>

            <Separator />

            {/* User Responsibilities */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">3. User Responsibilities</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.userResponsibilities}</p>
            </section>

            <Separator />

            {/* Payment Terms */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">4. Payment Terms</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.paymentTerms}</p>
            </section>

            <Separator />

            {/* Service Availability */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">5. Service Availability</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.serviceAvailability}</p>
            </section>

            <Separator />

            {/* Privacy Policy */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">6. Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.privacyPolicy}</p>
            </section>

            <Separator />

            {/* Termination */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">7. Termination</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.termination}</p>
            </section>

            <Separator />

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">8. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.limitation}</p>
            </section>

            <Separator />

            {/* Changes to Terms */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">9. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.changes}</p>
            </section>

            <Separator />

            {/* Contact Information */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-blue-800">10. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">{termsContent.content.contact}</p>
            </section>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Mail className="h-4 w-4" />
            <span>Questions? Contact us at legal@trustwavesisp.com</span>
          </div>
          <p className="text-sm text-gray-500">© 2024 Trust Waves ISP. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

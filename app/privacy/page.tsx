"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Lock, Calendar, Eye } from "lucide-react"

interface PrivacyContent {
  title: string
  lastUpdated: string
  content: {
    introduction: string
    informationCollection: string
    informationUse: string
    informationSharing: string
    dataSecurity: string
    cookies: string
    userRights: string
    dataRetention: string
    childrenPrivacy: string
    changes: string
    contact: string
  }
}

export default function PrivacyPage() {
  const [privacyContent, setPrivacyContent] = useState<PrivacyContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPrivacyContent()
  }, [])

  const fetchPrivacyContent = async () => {
    try {
      const response = await fetch("/api/content/privacy")
      if (response.ok) {
        const data = await response.json()
        setPrivacyContent(data.content)
      } else {
        // Fallback to default content
        setPrivacyContent(getDefaultPrivacyContent())
      }
    } catch (error) {
      console.error("[v0] Error fetching privacy content:", error)
      setPrivacyContent(getDefaultPrivacyContent())
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultPrivacyContent = (): PrivacyContent => ({
    title: "Privacy Policy",
    lastUpdated: new Date().toLocaleDateString(),
    content: {
      introduction: `At Trust Waves ISP, we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.`,
      informationCollection: `We collect information you provide directly to us, such as when you create an account, contact customer service, or use our services. This includes personal information like your name, email address, phone number, billing address, and payment information. We also automatically collect certain information about your device and usage patterns.`,
      informationUse: `We use your information to: (1) Provide and maintain our services; (2) Process payments and billing; (3) Communicate with you about your account and services; (4) Improve our services and customer experience; (5) Comply with legal obligations; (6) Protect against fraud and unauthorized access.`,
      informationSharing: `We do not sell, trade, or rent your personal information to third parties. We may share your information with: (1) Service providers who assist us in operating our business; (2) Law enforcement when required by law; (3) Business partners for joint services with your consent; (4) In connection with a business transfer or merger.`,
      dataSecurity: `We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
      cookies: `Our website uses cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie settings through your browser preferences, though some features may not function properly if cookies are disabled.`,
      userRights: `You have the right to: (1) Access and review your personal information; (2) Request corrections to inaccurate information; (3) Request deletion of your information (subject to legal requirements); (4) Opt-out of marketing communications; (5) Data portability where applicable.`,
      dataRetention: `We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Account information is typically retained for the duration of your service agreement plus applicable legal retention periods.`,
      childrenPrivacy: `Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.`,
      changes: `We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last Updated" date. Your continued use of our services constitutes acceptance of the updated policy.`,
      contact: `If you have questions about this Privacy Policy or our privacy practices, please contact our Data Protection Officer at privacy@trustwavesisp.com or call +254 700 000 000.`,
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading privacy policy...</p>
        </div>
      </div>
    )
  }

  if (!privacyContent) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Privacy Policy Not Available</h3>
            <p className="text-gray-600">Unable to load privacy policy. Please try again later.</p>
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
          <div className="flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{privacyContent.title}</h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {privacyContent.lastUpdated}</span>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.introduction}</p>
            </section>

            <Separator />

            {/* Information Collection */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.informationCollection}</p>
            </section>

            <Separator />

            {/* Information Use */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.informationUse}</p>
            </section>

            <Separator />

            {/* Information Sharing */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">4. Information Sharing</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.informationSharing}</p>
            </section>

            <Separator />

            {/* Data Security */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.dataSecurity}</p>
            </section>

            <Separator />

            {/* Cookies */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">6. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.cookies}</p>
            </section>

            <Separator />

            {/* User Rights */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">7. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.userRights}</p>
            </section>

            <Separator />

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">8. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.dataRetention}</p>
            </section>

            <Separator />

            {/* Children's Privacy */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">9. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.childrenPrivacy}</p>
            </section>

            <Separator />

            {/* Changes */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">10. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.changes}</p>
            </section>

            <Separator />

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-green-800">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">{privacyContent.content.contact}</p>
            </section>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Eye className="h-4 w-4" />
            <span>Your privacy matters to us</span>
          </div>
          <p className="text-sm text-gray-500">© 2024 Trust Waves ISP. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

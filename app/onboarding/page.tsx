"use client"

import { OnboardingWizard } from "@/components/onboarding-wizard"

export default function OnboardingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <OnboardingWizard />
    </div>
  )
}

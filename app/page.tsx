import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirect to dashboard or main page
  redirect("/dashboard")
}

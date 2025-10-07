import { AnimatedHeroSection } from "@/components/auth/animated-hero-section"
import { AnimatedLoginForm } from "@/components/auth/animated-login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <AnimatedHeroSection />
      <AnimatedLoginForm />
    </div>
  )
}

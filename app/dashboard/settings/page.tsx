import { redirect } from "next/navigation"
import { defaultSettingsPath } from "@/components/settings/settings-nav-config"

export default function SettingsIndexPage() {
  redirect(defaultSettingsPath)
}

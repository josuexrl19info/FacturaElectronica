import { Palette, Shield, User, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type SettingsNavLink = {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

export type SettingsNavGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: SettingsNavLink[]
}

export type SettingsNavEntry =
  | ({ type: "link" } & SettingsNavLink)
  | ({ type: "group" } & SettingsNavGroup)

export const settingsNavEntries: SettingsNavEntry[] = [
  { type: "link", id: "profile", label: "Perfil", href: "/dashboard/settings/profile", icon: User },
  {
    type: "group",
    id: "users-roles",
    label: "Usuarios y roles",
    icon: Users,
    items: [
      { id: "users", label: "Usuarios", href: "/dashboard/settings/users-roles/users", icon: Users },
      { id: "roles", label: "Roles", href: "/dashboard/settings/users-roles/roles", icon: Shield },
    ],
  },
  {
    type: "link",
    id: "personalization",
    label: "Personalización",
    href: "/dashboard/settings/personalization",
    icon: Palette,
  },
]

export const defaultSettingsPath = "/dashboard/settings/profile"

export function isSettingsNavGroupActive(entry: SettingsNavGroup, pathname: string): boolean {
  return entry.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
}
